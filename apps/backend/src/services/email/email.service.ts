import { EmailStatus } from '@prisma/client';
import { sendViaResendApi, sendViaSmtp, TransportResult } from './email.sender';
import { logEmailAttempt } from './email.logger';
import { renderEmailTemplate } from './templates';

export interface SendEmailOptions {
  recipient: string;
  template: string;
  data: Record<string, any>;
  organizationId?: string | null;
  roleContext?: 'TEACHER' | 'RECRUITER' | 'CANDIDATE' | 'SUPER_ADMIN';
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { recipient, template, data, organizationId, roleContext } = options;
  const targetEmail = recipient.trim().toLowerCase();

  // 1. Render template
  const { subject, html } = renderEmailTemplate(template, data);
  const fromHeader = process.env.EMAIL_FROM || 'ExamForge <onboarding@resend.dev>';

  console.log(`\n================================================================================`);
  console.log(`✉️  DISPATCHING EMAIL: [${template}]`);
  console.log(`    Recipient : ${targetEmail}`);
  console.log(`    Subject   : ${subject}`);
  if (data.approvalUrl) console.log(`    Approve   : ${data.approvalUrl}`);
  if (data.activationUrl) console.log(`    Activate  : ${data.activationUrl}`);
  if (data.examUrl) console.log(`    Exam Link : ${data.examUrl}`);
  if (data.otp) console.log(`    OTP Code  : ${data.otp}`);
  console.log(`================================================================================\n`);

  // 2. Select appropriate API key based on role context and recipient
  let apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;

  if (
    roleContext === 'SUPER_ADMIN' ||
    targetEmail === 'examforge.superadmin@gmail.com' ||
    targetEmail.includes('superadmin') ||
    template === 'super_admin_otp'
  ) {
    apiKey = process.env.ADMIN_RESEND_API_KEY || process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  } else {
    apiKey = process.env.STUDENT_RESEND_API_KEY || process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  }

  // 3. Dispatch via selected provider
  let result: TransportResult = { success: false, error: 'No provider configured' };

  if (apiKey) {
    result = await sendViaResendApi(apiKey, fromHeader, targetEmail, subject, html);
    if (!result.success) {
      console.warn(`[RESEND API NOTICE] Resend response for ${targetEmail}:`, result.error);
    }
  }

  // If REST API failed or not configured, try SMTP fallback
  if (!result.success && process.env.SMTP_HOST) {
    console.warn(`[EMAIL SERVICE] REST API attempt failed (${result.error}). Trying SMTP transport...`);
    result = await sendViaSmtp(fromHeader, targetEmail, subject, html);
  }

  // 4. Record in email_logs table for audit & diagnostics
  await logEmailAttempt({
    organizationId: organizationId || null,
    recipient: targetEmail,
    sender: fromHeader,
    template,
    subject,
    status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
    providerMessageId: result.providerMessageId || null,
    errorMessage: result.error || null,
  });

  if (result.success) {
    console.log(`[EMAIL SUCCESS] "${template}" sent to ${targetEmail} | ID: ${result.providerMessageId}`);
    return { success: true, messageId: result.providerMessageId };
  } else {
    console.warn(`[EMAIL NOTICE] Provider delivery status for ${targetEmail}: ${result.error}`);
    // Return gracefully so business logic completes without breaking registration or test flows
    return { success: false, error: result.error };
  }
}
