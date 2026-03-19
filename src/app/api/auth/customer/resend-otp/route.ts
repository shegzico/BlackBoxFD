import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateOTP, getOTPExpiry, sendOTPEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Look up unverified customer by email
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .eq('is_verified', false)
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: 'No unverified account found with this email' },
        { status: 404 }
      );
    }

    // Generate new OTP
    const otp_code = generateOTP();
    const otp_expires_at = getOTPExpiry().toISOString();

    // Update OTP in database
    const { error: updateError } = await supabase
      .from('customers')
      .update({ otp_code, otp_expires_at })
      .eq('id', customer.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to generate new OTP' },
        { status: 500 }
      );
    }

    // Send OTP email
    await sendOTPEmail(email, otp_code, customer.name);

    return NextResponse.json({ message: 'OTP resent' });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
