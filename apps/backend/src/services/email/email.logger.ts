import { PrismaClient, EmailStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface LogEmailParams {
  organizationId?: string | null;
  recipient: string;
  sender: string;
  template: string;
  subject: string;
  status: EmailStatus;
  providerMessageId?: string | null;
  errorMessage?: string | null;
}

export async function logEmailAttempt(params: LogEmailParams) {
  try {
    return await prisma.emailLog.create({
      data: {
        organizationId: params.organizationId || null,
        recipient: params.recipient.toLowerCase().trim(),
        sender: params.sender,
        template: params.template,
        subject: params.subject,
        status: params.status,
        providerMessageId: params.providerMessageId || null,
        errorMessage: params.errorMessage || null,
        sentAt: params.status === EmailStatus.SENT || params.status === EmailStatus.DELIVERED ? new Date() : null,
      },
    });
  } catch (err: any) {
    console.error('[EMAIL LOGGER ERROR] Could not save email log:', err.message || err);
    return null;
  }
}
