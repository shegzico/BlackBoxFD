import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { isValidNigerianPhone } from '@/lib/types';
import { generateOTP, getOTPExpiry, sendOTPEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      password,
      account_type = 'individual',
      business_name,
      business_email,
      business_phone,
      business_address,
      business_type,
    } = body;

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

    if (account_type === 'business' && !business_name) {
      return NextResponse.json(
        { error: 'Business name is required for business accounts' },
        { status: 400 }
      );
    }

    if (account_type === 'business' && !business_address) {
      return NextResponse.json(
        { error: 'Business address is required for business accounts' },
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

    let business_id: number | null = null;

    if (account_type === 'business') {
      // Create business record
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          name: business_name,
          email: business_email || null,
          phone: business_phone || null,
          address: business_address,
          type: business_type || null,
          state: 'Lagos',
        })
        .select('id')
        .single();

      if (businessError || !business) {
        return NextResponse.json(
          { error: 'Failed to create business record' },
          { status: 500 }
        );
      }

      business_id = business.id;
    }

    // Insert customer
    const customerData: Record<string, unknown> = {
      name,
      email,
      phone,
      password_hash,
      is_verified: false,
      otp_code,
      otp_expires_at,
      account_type,
    };

    if (account_type === 'business' && business_id) {
      customerData.business_id = business_id;
      customerData.business_role = 'admin';
    }

    const { error: insertError } = await supabase
      .from('customers')
      .insert(customerData);

    if (insertError) {
      // Rollback business if customer insert failed
      if (business_id) {
        await supabase.from('businesses').delete().eq('id', business_id);
      }
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
