import nodemailer from 'nodemailer';
import https from 'https';
import { PrismaClient, EmailStatus } from '@prisma/client';
import { renderEmailTemplate } from './email/templates';

const prisma = new PrismaClient();

export interface TransportResult {
  success: boolean;
  providerMessageId?: string;
  statusCode?: number;
  error?: string;
}

export interface SendEmailOptions {
  recipient: string;
  subject?: string;
  html?: string;
  organizationId?: string | null;
  template?: string;
  data?: Record<string, any>;
  roleContext?: string;
}

// 1. Resend REST API HTTP Transport
export async function sendViaResendApi(
  apiKey: string,
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<TransportResult> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ from, to, subject, html });
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, providerMessageId: json.id, statusCode: res.statusCode });
            } else {
              resolve({
                success: false,
                statusCode: res.statusCode,
                error: json.message || body,
              });
            }
          } catch {
            resolve({
              success: false,
              statusCode: res.statusCode,
              error: body,
            });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

// 2. Standard SMTP Transport (Nodemailer)
export async function sendViaSmtp(
  from: string,
  to: string,
  subject: string,
  html: string
): Promise<TransportResult> {
  try {
    const host = process.env.SMTP_HOST || 'smtp.resend.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USERNAME || process.env.SMTP_USER || 'resend';
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY || '';

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      tls: { rejectUnauthorized: false },
    });

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });

    return {
      success: true,
      providerMessageId: info.messageId,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'SMTP delivery failed',
    };
  }
}

// 3. Centralized Base Dispatcher
export async function dispatchEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  let { recipient, subject, html, organizationId, template = 'general', data = {} } = options;
  const targetEmail = recipient.trim().toLowerCase();

  // If subject or html not directly provided, render from template
  if (!subject || !html) {
    const rendered = renderEmailTemplate(template, data);
    subject = subject || rendered.subject;
    html = html || rendered.html;
  }

  const fromHeader = 'ExamForge <onboarding@resend.dev>';

  // Select appropriate API key based on role context and recipient
  let apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;

  if (
    options.roleContext === 'SUPER_ADMIN' ||
    targetEmail === 'examforge.superadmin@gmail.com' ||
    targetEmail.includes('superadmin') ||
    template === 'super_admin_otp'
  ) {
    apiKey = process.env.ADMIN_RESEND_API_KEY || process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  } else {
    // Default to student / candidate key
    apiKey = process.env.STUDENT_RESEND_API_KEY || process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY;
  }

  let result: TransportResult = { success: false, error: 'No email transport configured' };

  if (apiKey) {
    result = await sendViaResendApi(apiKey, fromHeader, targetEmail, subject, html);
    if (!result.success) {
      console.warn(`[RESEND API NOTICE] Resend response for ${targetEmail}:`, result.error);
    }
  }

  if (!result.success && process.env.SMTP_HOST) {
    result = await sendViaSmtp(fromHeader, targetEmail, subject, html);
  }

  // If still not sent in development mode or recipient restricted on free Resend tier, log gracefully
  if (!result.success && process.env.NODE_ENV !== 'production') {
    console.log(`[EMAIL DEV LOG] Mock dispatch to ${targetEmail} | Subject: ${subject}`);
    result = { success: true, providerMessageId: `mock-dev-${Date.now()}` };
  }

  // Audit to email_logs
  try {
    await prisma.emailLog.create({
      data: {
        organizationId: organizationId || null,
        recipient: targetEmail,
        sender: fromHeader,
        template,
        subject,
        status: result.success ? EmailStatus.SENT : EmailStatus.FAILED,
        providerMessageId: result.providerMessageId || null,
        errorMessage: result.error || null,
        sentAt: result.success ? new Date() : null,
      },
    });
  } catch (e) {
    // Non-blocking log failure
  }

  return {
    success: result.success,
    messageId: result.providerMessageId,
    error: result.error,
  };
}

// 4. Clean HTML Template Wrapper
function wrapHtml(title: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #0f172a; padding: 24px 32px; text-align: left; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
    .header span { color: #10b981; }
    .content { padding: 32px; font-size: 15px; line-height: 1.6; }
    .footer { background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 12px; color: #64748b; }
    .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin: 16px 0; }
    .otp-code { display: inline-block; font-size: 32px; font-family: monospace; font-weight: 800; letter-spacing: 6px; padding: 12px 24px; background: #ecfdf5; color: #047857; border: 1px dashed #059669; border-radius: 8px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Exam<span>Forge</span> College ERP</h1>
    </div>
    <div class="content">
      ${bodyContent}
    </div>
    <div class="footer">
      This is an automated notification from ExamForge Academic Platform.<br>
      Please do not reply directly to this message.
    </div>
  </div>
</body>
</html>`;
}

// ============================================================================
// 5. High-Level Services Required by Spec
// ============================================================================

export class EmailService {
  /**
   * Send 6-digit email verification OTP to student
   */
  static async sendVerificationOTP(
    email: string,
    otp: string,
    studentName: string = 'Student',
    organizationId?: string
  ) {
    const subject = `🔐 Your ExamForge Verification Code: ${otp}`;
    const body = `
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>Your 6-digit security verification code for accessing the Student Academic Portal is:</p>
      <div style="text-align: center;">
        <span class="otp-code">${otp}</span>
      </div>
      <p>This verification code is valid for <strong>10 minutes</strong>. For security reasons, please do not share this code with anyone.</p>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml('Email Verification', body),
      organizationId,
      template: 'student_verification_otp',
    });
  }

  /**
   * Send welcome email after account creation
   */
  static async sendWelcomeEmail(
    email: string,
    name: string,
    role: string,
    organizationName: string = 'ExamForge College',
    organizationId?: string
  ) {
    const subject = `Welcome to ExamForge — ${organizationName}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const body = `
      <p>Dear <strong>${name}</strong>,</p>
      <p>Welcome to <strong>${organizationName}</strong> on the ExamForge Academic ERP platform.</p>
      <p>Your account has been configured with the role: <strong>${role}</strong>.</p>
      <p>You can access your portal at any time by clicking below:</p>
      <div style="text-align: center;">
        <a href="${frontendUrl}" class="btn">Log In to Portal</a>
      </div>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml('Welcome to ExamForge', body),
      organizationId,
      template: 'welcome_email',
    });
  }

  /**
   * Send password reset email with secure token
   */
  static async sendPasswordReset(
    email: string,
    resetToken: string,
    userName: string = 'User',
    organizationId?: string
  ) {
    const subject = '🔑 ExamForge — Password Reset Request';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}&email=${encodeURIComponent(email)}`;
    const body = `
      <p>Hello <strong>${userName}</strong>,</p>
      <p>We received a request to reset the password for your ExamForge account.</p>
      <p>Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn">Reset My Password</a>
      </div>
      <p>If you did not request a password reset, you can safely ignore this email.</p>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml('Password Reset', body),
      organizationId,
      template: 'password_reset',
    });
  }

  /**
   * Send teacher faculty invitation
   */
  static async sendTeacherInvitation(
    email: string,
    inviteUrl: string,
    collegeName: string,
    organizationId?: string
  ) {
    const subject = `Faculty Invitation — ${collegeName}`;
    const body = `
      <p>Dear Professor / Faculty Member,</p>
      <p>You have been formally appointed to <strong>${collegeName}</strong> on the ExamForge Academic ERP system.</p>
      <p>Please click the link below to accept your appointment and activate your Faculty Hub account:</p>
      <div style="text-align: center;">
        <a href="${inviteUrl}" class="btn">Activate Faculty Account</a>
      </div>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml('Faculty Invitation', body),
      organizationId,
      template: 'teacher_invitation',
    });
  }

  /**
   * Send student enrollment invitation
   */
  static async sendStudentInvitation(
    email: string,
    studentName: string,
    collegeName: string,
    classCode: string,
    organizationId?: string
  ) {
    const subject = `Academic Enrollment Notice — ${classCode}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const body = `
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>You have been officially enrolled in class <strong>${classCode}</strong> at <strong>${collegeName}</strong>.</p>
      <p>Please log in to your Student Portal to view your timetable, attendance, viva schedules, and practical marks:</p>
      <div style="text-align: center;">
        <a href="${frontendUrl}/student" class="btn">Access Student Portal</a>
      </div>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml('Student Enrollment', body),
      organizationId,
      template: 'student_invitation',
    });
  }

  /**
   * Send assessment invitation
   */
  static async sendAssessmentInvitation(
    email: string,
    testTitle: string,
    accessCode: string | null,
    examUrl: string,
    organizationId?: string
  ) {
    const subject = `Exam Notification: ${testTitle}`;
    const body = `
      <p>Hello Candidate,</p>
      <p>You are scheduled to take the examination: <strong>${testTitle}</strong>.</p>
      ${accessCode ? `<p>Your Exam Access Code: <strong style="font-family: monospace; font-size: 18px; color: #047857;">${accessCode}</strong></p>` : ''}
      <div style="text-align: center;">
        <a href="${examUrl}" class="btn">Start Examination</a>
      </div>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml('Assessment Scheduled', body),
      organizationId,
      template: 'assessment_invitation',
    });
  }

  /**
   * Send reminder email (for upcoming tests, vivas, deadlines)
   */
  static async sendReminderEmail(
    email: string,
    title: string,
    dueDate: string,
    studentName: string = 'Student',
    organizationId?: string
  ) {
    const subject = `Reminder: ${title}`;
    const body = `
      <p>Hello <strong>${studentName}</strong>,</p>
      <p>This is a reminder regarding: <strong>${title}</strong>.</p>
      <p>Scheduled / Due Date: <strong>${dueDate}</strong>.</p>
      <p>Please check your academic calendar and portal for full details.</p>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml('Academic Reminder', body),
      organizationId,
      template: 'reminder_email',
    });
  }

  /**
   * Send general notification email
   */
  static async sendNotificationEmail(
    email: string,
    title: string,
    bodyText: string,
    organizationId?: string
  ) {
    const subject = `Notification: ${title}`;
    const body = `
      <h3>${title}</h3>
      <p>${bodyText}</p>
    `;
    return dispatchEmail({
      recipient: email,
      subject,
      html: wrapHtml(title, body),
      organizationId,
      template: 'notification_email',
    });
  }
}

// Backward compatibility export
export const sendEmail = dispatchEmail;
