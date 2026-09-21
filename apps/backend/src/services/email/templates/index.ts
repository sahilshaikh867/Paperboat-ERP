export interface TemplateOutput {
  subject: string;
  html: string;
}

export function renderEmailTemplate(templateName: string, data: Record<string, any>): TemplateOutput {
  switch (templateName) {
    case 'super_admin_otp': {
      const { otp, validMinutes = 10, ipAddress, userAgent } = data;
      return {
        subject: `🔐 Your Super Admin Verification Code: ${otp}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .box { max-width: 500px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; text-align: center; }
  .otp-code { font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #c084fc; background: #0f172a; padding: 16px 24px; border-radius: 12px; margin: 20px auto; display: inline-block; font-family: monospace; border: 1px solid #9333ea; }
  .meta { background: #0f172a; border-radius: 8px; padding: 12px; margin: 16px 0; font-size: 12px; line-height: 1.6; color: #cbd5e1; text-align: left; }
</style></head>
<body>
  <div class="box">
    <div style="font-size: 32px; margin-bottom: 8px;">🔐</div>
    <h2 style="color: #c084fc; margin: 0 0 8px 0;">Super Admin Login Verification</h2>
    <p style="font-size: 14px; color: #cbd5e1; margin: 0 0 16px 0;">Enter this 6-digit One-Time Password to verify your identity and access the Control Center:</p>
    <div class="otp-code">${otp}</div>
    <div class="meta">
      <strong>IP Address:</strong> ${ipAddress || '127.0.0.1'}<br/>
      <strong>Device / Agent:</strong> ${userAgent || 'Web Browser'}<br/>
      <strong>Security Level:</strong> Restricted Master Platform Governance<br/>
      <strong>Timestamp:</strong> ${new Date().toUTCString()}
    </div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
      This OTP code is valid for <strong>${validMinutes} minutes</strong> and is invalidated immediately once used.
      If you did not initiate this request, contact system security immediately.
    </p>
  </div>
</body>
</html>
        `,
      };
    }

    case 'super_admin_login_approval': {
      const { fullName, ipAddress, userAgent, approvalUrl, rejectionUrl } = data;
      return {
        subject: '🔐 ACTION REQUIRED: Approve Super Admin Login Attempt',
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .box { max-width: 540px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
  .title { font-size: 20px; font-weight: 800; color: #f59e0b; margin: 0 0 12px 0; }
  .meta { background: #0f172a; border-radius: 8px; padding: 14px; margin: 16px 0; font-size: 13px; line-height: 1.6; color: #cbd5e1; }
  .btn-approve { display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; margin-right: 12px; }
  .btn-reject { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; }
  .footer { font-size: 11px; color: #64748b; margin-top: 24px; }
</style></head>
<body>
  <div class="box">
    <h2 class="title">🔐 Super Admin Login Approval</h2>
    <p>Hello ${fullName || 'Administrator'}, a sign-in attempt was initiated for your ExamForge Super Admin account.</p>
    <div class="meta">
      <strong>IP Address:</strong> ${ipAddress || '127.0.0.1'}<br/>
      <strong>Device / Agent:</strong> ${userAgent || 'Web Browser'}<br/>
      <strong>Timestamp:</strong> ${new Date().toUTCString()}
    </div>
    <p>To authorize and activate this session, click <strong>CONFIRM LOGIN</strong>. If you did not initiate this, click <strong>REJECT LOGIN</strong> immediately.</p>
    <div style="margin: 24px 0;">
      <a href="${approvalUrl}" class="btn-approve">CONFIRM LOGIN &rarr;</a>
      <a href="${rejectionUrl}" class="btn-reject">REJECT LOGIN &times;</a>
    </div>
    <div class="footer">
      This is a single-use cryptographically signed security token. It will expire in 10 minutes.
    </div>
  </div>
</body>
</html>
        `,
      };
    }

    case 'teacher_invitation': {
      const { fullName, orgName, department, designation, activationUrl } = data;
      return {
        subject: `🎓 Invitation to Join ${orgName} on ExamForge`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .box { max-width: 560px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
  .btn { display: inline-block; background: #10b981; color: white; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; margin: 20px 0; }
</style></head>
<body>
  <div class="box">
    <h2 style="color: #34d399; margin: 0 0 12px 0;">🎓 Faculty Account Invitation</h2>
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>You have been invited by the administration of <strong>${orgName}</strong> to join ExamForge as an Academic Teacher / Faculty Member.</p>
    <div style="background: #0f172a; padding: 14px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
      <strong>Department:</strong> ${department || 'General Faculty'}<br/>
      <strong>Designation:</strong> ${designation || 'Lecturer'}<br/>
    </div>
    <p>Click the button below to set your account password and access your test authoring dashboard:</p>
    <a href="${activationUrl}" class="btn">Activate Teacher Account &rarr;</a>
    <p style="font-size: 11px; color: #64748b;">This invitation link is valid for 7 days.</p>
  </div>
</body>
</html>
        `,
      };
    }

    case 'recruiter_invitation': {
      const { fullName, orgName, department, activationUrl } = data;
      return {
        subject: `🏢 Invitation to Join ${orgName} on ExamForge`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .box { max-width: 560px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
  .btn { display: inline-block; background: #3b82f6; color: white; padding: 14px 28px; border-radius: 10px; font-weight: 700; text-decoration: none; margin: 20px 0; }
</style></head>
<body>
  <div class="box">
    <h2 style="color: #60a5fa; margin: 0 0 12px 0;">🏢 Hiring Team Account Invitation</h2>
    <p>Hello <strong>${fullName}</strong>,</p>
    <p>You have been invited to join <strong>${orgName}</strong> on ExamForge as a Technical Recruiter.</p>
    <div style="background: #0f172a; padding: 14px; border-radius: 8px; margin: 16px 0; font-size: 13px;">
      <strong>Department:</strong> ${department || 'Talent Acquisition'}<br/>
    </div>
    <p>Click the button below to set your account password and start creating assessment tests:</p>
    <a href="${activationUrl}" class="btn">Activate Recruiter Account &rarr;</a>
    <p style="font-size: 11px; color: #64748b;">This invitation link is valid for 7 days.</p>
  </div>
</body>
</html>
        `,
      };
    }

    case 'candidate_invitation': {
      const { candidateName, testTitle, orgName, durationMins, startDate, endDate, accessCode, examUrl } = data;
      return {
        subject: `📝 Exam Invitation: ${testTitle} - ${orgName}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .box { max-width: 580px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; }
  .info-table { width: 100%; border-collapse: collapse; margin: 18px 0; }
  .info-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px solid #334155; }
  .btn { display: block; text-align: center; background: #6366f1; color: white; padding: 14px 20px; border-radius: 10px; font-weight: 700; text-decoration: none; margin: 24px 0 16px 0; font-size: 15px; }
  .instructions { background: #0f172a; padding: 16px; border-radius: 10px; font-size: 12px; color: #94a3b8; line-height: 1.6; }
</style></head>
<body>
  <div class="box">
    <div style="font-size: 12px; font-weight: bold; color: #818cf8; text-transform: uppercase;">Official Assessment Invitation</div>
    <h2 style="color: #ffffff; margin: 6px 0 16px 0;">${testTitle}</h2>
    <p style="font-size: 14px; color: #cbd5e1;">Dear <strong>${candidateName}</strong>,</p>
    <p style="font-size: 13px; color: #cbd5e1;">You have been registered by <strong>${orgName}</strong> to take the online examination.</p>

    <table class="info-table">
      <tr><td style="color: #94a3b8;">Assessment Name:</td><td align="right"><strong>${testTitle}</strong></td></tr>
      <tr><td style="color: #94a3b8;">Organization:</td><td align="right">${orgName}</td></tr>
      <tr><td style="color: #94a3b8;">Duration:</td><td align="right"><strong>${durationMins} Minutes</strong></td></tr>
      ${startDate ? `<tr><td style="color: #94a3b8;">Window Opens:</td><td align="right">${new Date(startDate).toLocaleString()}</td></tr>` : ''}
      ${endDate ? `<tr><td style="color: #94a3b8;">Window Closes:</td><td align="right">${new Date(endDate).toLocaleString()}</td></tr>` : ''}
      ${accessCode ? `<tr><td style="color: #94a3b8;">Security Access Code:</td><td align="right"><code style="background:#0f172a; padding:2px 6px; border-radius:4px; color:#38bdf8;">${accessCode}</code></td></tr>` : ''}
    </table>

    <a href="${examUrl}" class="btn">Enter Exam Portal &rarr;</a>

    <div class="instructions">
      <strong style="color: #e2e8f0;">Important Instructions:</strong>
      <ol style="margin: 6px 0 0 0; padding-left: 18px;">
        <li>When you open the link, a 6-digit One-Time Password (OTP) will be sent to this email address to verify your identity.</li>
        <li>Once started, the exam operates in fullscreen mode. Ensure a stable internet connection.</li>
        <li>Submit your responses before the allocated timer expires.</li>
      </ol>
      <p style="margin: 8px 0 0 0;">Need support? Reply to this invitation or contact your test coordinator.</p>
    </div>
  </div>
</body>
</html>
        `,
      };
    }

    case 'candidate_otp': {
      const { otp, testTitle, validMinutes = 10 } = data;
      return {
        subject: `🔑 Your Verification Code: ${otp} for ${testTitle}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .box { max-width: 480px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; text-align: center; }
  .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #38bdf8; background: #0f172a; padding: 16px 20px; border-radius: 12px; margin: 20px auto; display: inline-block; font-family: monospace; border: 1px solid #0284c7; }
</style></head>
<body>
  <div class="box">
    <div style="font-size: 28px; margin-bottom: 8px;">🔑</div>
    <h2 style="color: #ffffff; margin: 0 0 8px 0;">Candidate Identity Verification</h2>
    <p style="font-size: 13px; color: #cbd5e1; margin: 0 0 16px 0;">Enter this 6-digit verification code to access your exam:</p>
    <div class="otp-code">${otp}</div>
    <p style="font-size: 12px; color: #94a3b8; margin-top: 16px;">
      This code is single-use and will expire in <strong>${validMinutes} minutes</strong>.<br/>
      Never share your OTP with anyone.
    </p>
  </div>
</body>
</html>
        `,
      };
    }

    case 'result_notification': {
      const { candidateName, testTitle, totalScore, maxScore, percentage, passed } = data;
      return {
        subject: `📊 Your Assessment Results: ${testTitle}`,
        html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
  .box { max-width: 500px; margin: 0 auto; background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 28px; text-align: center; }
</style></head>
<body>
  <div class="box">
    <h2 style="color: ${passed ? '#34d399' : '#f87171'}; margin: 0 0 8px 0;">
      ${passed ? '🎉 Assessment Passed' : '📋 Assessment Result'}
    </h2>
    <p style="font-size: 14px; color: #cbd5e1;">Dear ${candidateName}, your submission for <strong>${testTitle}</strong> has been evaluated.</p>
    <div style="background: #0f172a; padding: 18px; border-radius: 12px; margin: 20px 0; font-size: 16px;">
      <strong>Score:</strong> ${totalScore} / ${maxScore} (${percentage}%)<br/>
      <strong>Outcome:</strong> <span style="color: ${passed ? '#34d399' : '#f87171'}; font-weight: bold;">${passed ? 'PASSED' : 'COMPLETED'}</span>
    </div>
  </div>
</body>
</html>
        `,
      };
    }

    default:
      return {
        subject: data.subject || 'ExamForge Notification',
        html: `<p>${data.message || 'Notification from ExamForge.'}</p>`,
      };
  }
}
