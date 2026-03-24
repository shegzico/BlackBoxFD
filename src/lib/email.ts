// Email utility — powered by Resend (resend.com)
// SMS utility — powered by Termii (termii.com)

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a 6-character alphanumeric confirmation code (uppercase).
 * Avoids visually ambiguous characters (0, O, 1, I, L).
 * Easy to communicate verbally between rider and recipient.
 */
export function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
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
            <td style="background:#000000;padding:28px 32px;text-align:center;">
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
              <div style="background:#000000;border-radius:12px;padding:28px 16px;text-align:center;margin-bottom:28px;">
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

function inviteEmailHtml(inviterName: string, businessName: string, role: string, inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to ${businessName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#000000;padding:28px 32px;text-align:center;">
              <span style="color:#F2FF66;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">BLACKBOX</span>
              <span style="color:#ffffff;font-size:22px;font-weight:300;margin-left:6px;letter-spacing:1px;">LOGISTICS</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 8px;">You've been invited!</p>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> on BlackBox Logistics as a <strong>${role}</strong> user.
              </p>

              <!-- Business Info Box -->
              <div style="background:#000000;border-radius:12px;padding:24px 20px;text-align:center;margin-bottom:28px;">
                <div style="color:#F2FF66;font-size:20px;font-weight:800;letter-spacing:1px;">
                  ${businessName}
                </div>
                <p style="color:#9ca3af;font-size:13px;margin:8px 0 0;">Role: <span style="color:#F2FF66;font-weight:600;text-transform:capitalize;">${role}</span></p>
              </div>

              <!-- CTA Button -->
              <div style="text-align:center;margin-bottom:28px;">
                <a href="${inviteLink}" style="display:inline-block;background:#F2FF66;color:#000000;font-size:15px;font-weight:800;padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.5px;">
                  Accept Invitation
                </a>
              </div>

              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
                This invitation expires in 7 days. If you didn&apos;t expect this invite, you can safely ignore this email.
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

export async function sendInviteEmail(
  to: string,
  inviterName: string,
  businessName: string,
  role: string,
  inviteLink: string
): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[INVITE] For ${to}: ${inviteLink}\n(Set RESEND_API_KEY to send real emails)\n`);
    return true;
  }
  return resendEmail(
    to,
    `You've been invited to join ${businessName} on BlackBox Logistics`,
    inviteEmailHtml(inviterName, businessName, role, inviteLink)
  );
}

/* ── Delivery / Return Confirmation Code Emails ─────────────────────── */

function deliveryConfirmationEmailHtml(recipientName: string, code: string, trackingId: string, pickupArea: string, dropoffArea: string): string {
  const firstName = recipientName.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Delivery Confirmation Code</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#000000;padding:28px 32px;text-align:center;">
              <span style="color:#F2FF66;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">BLACKBOX</span>
              <span style="color:#ffffff;font-size:22px;font-weight:300;margin-left:6px;letter-spacing:1px;">LOGISTICS</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 8px;">Hi ${firstName} 👋</p>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 6px;">
                A package is on its way to you from <strong>${pickupArea}</strong> to <strong>${dropoffArea}</strong>.
              </p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Tracking ID: <span style="font-family:'Courier New',monospace;color:#111827;font-weight:600;">${trackingId}</span>
              </p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
                When the rider arrives, they will ask for your <strong>delivery confirmation code</strong>.
                Show them this code to confirm you received the package:
              </p>
              <div style="background:#000000;border-radius:12px;padding:28px 16px;text-align:center;margin-bottom:28px;">
                <div style="color:#F2FF66;font-size:40px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace;">
                  ${code}
                </div>
                <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;">Delivery confirmation code — share only with the rider</p>
              </div>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
                Do not share this code with anyone other than the BlackBox rider at your door.
                If you were not expecting a delivery, please contact us immediately.
              </p>
            </td>
          </tr>
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

function returnConfirmationEmailHtml(senderName: string, code: string, trackingId: string, recipientName: string): string {
  const firstName = senderName.split(' ')[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Package Return Confirmation Code</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#000000;padding:28px 32px;text-align:center;">
              <span style="color:#F2FF66;font-size:22px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">BLACKBOX</span>
              <span style="color:#ffffff;font-size:22px;font-weight:300;margin-left:6px;letter-spacing:1px;">LOGISTICS</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;">
              <p style="color:#111827;font-size:18px;font-weight:600;margin:0 0 8px;">Hi ${firstName} 👋</p>
              <p style="color:#6b7280;font-size:15px;line-height:1.6;margin:0 0 6px;">
                Your package originally sent to <strong>${recipientName}</strong> could not be delivered and is being returned to you.
              </p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 24px;">
                Tracking ID: <span style="font-family:'Courier New',monospace;color:#111827;font-weight:600;">${trackingId}</span>
              </p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 20px;">
                When the rider arrives with your package, they will ask for a <strong>return confirmation code</strong>.
                Give them this code to confirm you received the package back:
              </p>
              <div style="background:#000000;border-radius:12px;padding:28px 16px;text-align:center;margin-bottom:28px;">
                <div style="color:#6080c0;font-size:40px;font-weight:800;letter-spacing:12px;font-family:'Courier New',monospace;">
                  ${code}
                </div>
                <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;">Return confirmation code — share only with the rider</p>
              </div>
              <p style="color:#9ca3af;font-size:13px;line-height:1.6;margin:0;">
                Do not share this code with anyone other than the BlackBox rider returning your package.
              </p>
            </td>
          </tr>
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

async function resendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const resendKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'BlackBox Logistics <onboarding@resend.dev>';

  if (!resendKey) {
    console.log(`\n[EMAIL] To: ${to} | Subject: ${subject}\n(Set RESEND_API_KEY to send real emails)\n`);
    return true;
  }

  // Resend's onboarding@resend.dev sender can only deliver to the account owner's email.
  // For all other recipients you MUST verify a domain and set the EMAIL_FROM env var.
  if (!process.env.EMAIL_FROM) {
    console.warn(
      `[EMAIL WARNING] EMAIL_FROM is not set. Using "onboarding@resend.dev" which only delivers to the Resend account owner's email. ` +
      `To send to any recipient, verify a domain in your Resend dashboard and set EMAIL_FROM=<name>@<your-verified-domain> in your environment variables.`
    );
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send email:', err);
    return false;
  }
}

export async function sendDeliveryConfirmationEmail(
  to: string,
  recipientName: string,
  code: string,
  trackingId: string,
  pickupArea: string,
  dropoffArea: string
): Promise<boolean> {
  return resendEmail(
    to,
    `Your delivery confirmation code — ${trackingId}`,
    deliveryConfirmationEmailHtml(recipientName, code, trackingId, pickupArea, dropoffArea)
  );
}

export async function sendReturnConfirmationEmail(
  to: string,
  senderName: string,
  code: string,
  trackingId: string,
  recipientName: string
): Promise<boolean> {
  return resendEmail(
    to,
    `Return confirmation code — package ${trackingId} is on its way back`,
    returnConfirmationEmailHtml(senderName, code, trackingId, recipientName)
  );
}

/* ── SMS via Termii ──────────────────────────────────────────────────── */

/**
 * Sends an SMS via Termii.
 * Requires TERMII_API_KEY and TERMII_SENDER_ID env vars.
 * Logs to console if not configured (dev fallback).
 */
export async function sendSMS(phone: string, message: string): Promise<boolean> {
  const termiiKey = process.env.TERMII_API_KEY;
  const senderId = process.env.TERMII_SENDER_ID || 'BlackBox';

  if (!termiiKey) {
    console.log(`\n[SMS] To: ${phone}\n${message}\n(Set TERMII_API_KEY to send real SMS)\n`);
    return true;
  }

  // Normalise to international format (234XXXXXXXXXX)
  let normalised = phone.replace(/[\s\-]/g, '');
  if (normalised.startsWith('+')) normalised = normalised.slice(1);
  if (normalised.startsWith('0')) normalised = '234' + normalised.slice(1);

  try {
    const res = await fetch('https://api.ng.termii.com/api/sms/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: normalised,
        from: senderId,
        sms: message,
        type: 'plain',
        api_key: termiiKey,
        channel: 'generic',
      }),
    });
    if (!res.ok) {
      console.error('Termii SMS error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send SMS:', err);
    return false;
  }
}

export async function sendOTPEmail(to: string, otp: string, name: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[OTP] For ${to}: ${otp}\n(Set RESEND_API_KEY to send real emails)\n`);
    return true;
  }
  return resendEmail(to, `${otp} is your BlackBox verification code`, otpEmailHtml(name, otp));
}
