// Email utility for sending OTP codes
// In production, replace with a real email service (Resend, SendGrid, etc.)

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function getOTPExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
}

export async function sendOTPEmail(to: string, otp: string, name: string): Promise<boolean> {
  // Check if Resend API key is configured
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendKey}`,
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'BlackBox Logistics <noreply@blackboxlogistics.com>',
          to: [to],
          subject: 'Your BlackBox Logistics Verification Code',
          html: `
            <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #0A0A0A; margin-bottom: 16px;">Verify Your Email</h2>
              <p style="color: #333; margin-bottom: 8px;">Hi ${name},</p>
              <p style="color: #333; margin-bottom: 24px;">Your verification code for BlackBox Logistics is:</p>
              <div style="background: #0A0A0A; color: #F2FF66; font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 20px; border-radius: 12px; margin-bottom: 24px;">
                ${otp}
              </div>
              <p style="color: #666; font-size: 14px;">This code expires in 15 minutes.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
            </div>
          `,
        }),
      });
      return res.ok;
    } catch {
      console.error('Failed to send email via Resend');
      return false;
    }
  }

  // Development fallback — log OTP to console
  console.log(`\n========================================`);
  console.log(`  OTP for ${to}: ${otp}`);
  console.log(`  (Dev mode — configure RESEND_API_KEY for real emails)`);
  console.log(`========================================\n`);
  return true;
}
