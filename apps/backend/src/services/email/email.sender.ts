import nodemailer from 'nodemailer';
import https from 'https';

export interface TransportResult {
  success: boolean;
  providerMessageId?: string;
  statusCode?: number;
  error?: string;
}

// Resend REST API HTTP Transport
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

// Standard SMTP Transport (Nodemailer)
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
    const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;

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
