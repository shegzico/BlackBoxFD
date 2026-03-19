import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { isValidNigerianPhone } from '@/lib/types';
import { generateOTP, getOTPExpiry, sendOTPEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Name, email, phone, and password are required' },
        { status: 400 }
      );
    }

    if (!isValidNigerianPhone(phone)) {
      return NextResponse.json(
        { error: 'Please provide a valid Nigerian phone number' },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcryptjs.hash(password, 10);

    // Generate OTP
    const otp_code = generateOTP();
    const otp_expires_at = getOTPExpiry().toISOString();

    // Insert customer
    const { error: insertError } = await supabase
      .from('customers')
      .insert({
        name,
        email,
        phone,
        password_hash,
        is_verified: false,
        otp_code,
        otp_expires_at,
      });

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Send OTP email
    await sendOTPEmail(email, otp_code, name);

    return NextResponse.json(
      { message: 'Account created. Please verify your email.' },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
