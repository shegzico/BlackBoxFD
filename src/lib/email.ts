// Email utility — powered by Resend (resend.com)

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOTPExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
}

function otpEmailHtml(name: string, otp: string): string {
  const firstName = name.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your BlackBox Verification Code</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#0A0A0A;padding:28px 32px;text-align:center;">
              <span style="color:#F2FF66;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">BLACKBOX</span>
              <span style="color:#ffffff;font-size:22px;font-weight:300;margin-left:6px;letter-spacing:1px;">LOGISTICS</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 8px;">Hi ${firstName} 👋</p>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 28px;">
                Use the verification code below to complete your sign-up. It expires in <strong>15 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#0A0A0A;border-radius:12px;padding:28px 16px;text-align:center;margin-bottom:28px;">
                <div style="color:#F2FF66;font-size:42px;font-weight:800;letter-spacing:14px;font-family:'Courier New',monospace;">
                  ${otp}
                </div>
                <p style="color:#6b7280;font-size:12px;margin:12px 0 0;">One-time verification code</p>
              </div>

              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
                If you didn&apos;t create a BlackBox Logistics account, you can safely ignore this email.
                Someone may have entered your email address by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                &copy; ${new Date().getFullYear()} BlackBox Logistics &mdash; Lagos, Nigeria
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOTPEmail(to: string, otp: string, name: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    // Development fallback — log OTP to console
    console.log(`\n========================================`);
    console.log(`  OTP for ${to}: ${otp}`);
    console.log(`  (Configure RESEND_API_KEY to send real emails)`);
    console.log(`========================================\n`);
    return true;
  }

  try {
    const from = process.env.EMAIL_FROM || 'BlackBox Logistics <onboarding@resend.dev>';

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `${otp} is your BlackBox verification code`,
        html: otpEmailHtml(name, otp),
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('Resend error:', res.status, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to send OTP email:', err);
    return false;
  }
}
