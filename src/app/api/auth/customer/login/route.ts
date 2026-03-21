import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
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
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Compare password
    const passwordMatch = await bcryptjs.compare(password, customer.password_hash);

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if verified
    if (!customer.is_verified) {
      return NextResponse.json(
        { error: 'Please verify your email first' },
        { status: 403 }
      );
    }

    // Fetch business name if applicable
    let business_name: string | null = null;
    if (customer.business_id) {
      const { data: biz } = await supabase
        .from('businesses')
        .select('name')
        .eq('id', customer.business_id)
        .single();
      business_name = biz?.name ?? null;
    }

    // Sign JWT token
    const tokenPayload: Parameters<typeof signToken>[0] = {
      id: customer.id,
      role: 'customer',
      name: customer.name,
    };
    if (customer.business_id) tokenPayload.business_id = customer.business_id;
    if (customer.business_role) tokenPayload.business_role = customer.business_role;
    if (customer.account_type) tokenPayload.account_type = customer.account_type;

    const token = signToken(tokenPayload);

    return NextResponse.json({
      token,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        business_id: customer.business_id ?? null,
        business_role: customer.business_role ?? null,
        account_type: customer.account_type ?? 'individual',
        business_name,
        default_pickup_area: customer.default_pickup_area,
        default_pickup_address: customer.default_pickup_address,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
