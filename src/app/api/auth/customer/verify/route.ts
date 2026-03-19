import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    // Look up customer by email
    const { data: customer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Verify OTP matches and is not expired
    if (customer.otp_code !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP code' },
        { status: 400 }
      );
    }

    if (new Date(customer.otp_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark as verified and clear OTP
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        is_verified: true,
        otp_code: null,
        otp_expires_at: null,
      })
      .eq('id', customer.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to verify account' },
        { status: 500 }
      );
    }

    // Sign JWT token
    const token = signToken({
      id: customer.id,
      role: 'customer',
      name: customer.name,
    });

    return NextResponse.json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
