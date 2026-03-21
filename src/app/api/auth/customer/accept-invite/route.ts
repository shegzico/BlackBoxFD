import { NextRequest, NextResponse } from 'next/server';
import bcryptjs from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';
import { isValidNigerianPhone } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, phone, password } = body;

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    if (!name || !phone || !password) {
      return NextResponse.json({ error: 'Name, phone, and password are required' }, { status: 400 });
    }

    if (!isValidNigerianPhone(phone)) {
      return NextResponse.json({ error: 'Please provide a valid Nigerian phone number' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Find invite
    const { data: invite, error: inviteError } = await supabase
      .from('business_invites')
      .select('id, email, role, business_id, status, expires_at')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite token' }, { status: 404 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'This invite has already been used or expired' }, { status: 400 });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 400 });
    }

    // Check if customer already exists with invite email
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('*')
      .eq('email', invite.email)
      .single();

    let customerId: number;
    let customerName: string;
    let customerEmail: string;
    let customerPhone: string;

    if (existingCustomer) {
      // Link existing customer to business
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          business_id: invite.business_id,
          business_role: invite.role,
          account_type: 'business',
        })
        .eq('id', existingCustomer.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to link account to business' }, { status: 500 });
      }

      customerId = existingCustomer.id;
      customerName = existingCustomer.name;
      customerEmail = existingCustomer.email;
      customerPhone = existingCustomer.phone;
    } else {
      // Create new customer
      const password_hash = await bcryptjs.hash(password, 10);

      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          name,
          email: invite.email,
          phone,
          password_hash,
          is_verified: true, // email validated via invite
          account_type: 'business',
          business_id: invite.business_id,
          business_role: invite.role,
        })
        .select('id, name, email, phone')
        .single();

      if (insertError || !newCustomer) {
        return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
      }

      customerId = newCustomer.id;
      customerName = newCustomer.name;
      customerEmail = newCustomer.email;
      customerPhone = newCustomer.phone;
    }

    // Mark invite as accepted
    await supabase
      .from('business_invites')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    // Sign JWT
    const jwtToken = signToken({
      id: customerId,
      role: 'customer',
      name: customerName,
      business_id: invite.business_id,
      business_role: invite.role as 'admin' | 'basic',
      account_type: 'business',
    });

    return NextResponse.json({
      token: jwtToken,
      customer: {
        id: customerId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        business_id: invite.business_id,
        business_role: invite.role,
        account_type: 'business',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
