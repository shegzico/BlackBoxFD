import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    if (!phone || !pin) {
      return NextResponse.json({ error: 'Phone and PIN are required' }, { status: 400 });
    }

    const { data: rider, error } = await supabase
      .from('riders')
      .select('*')
      .eq('phone', phone)
      .eq('pin', pin)
      .eq('is_active', true)
      .single();

    if (error || !rider) {
      return NextResponse.json({ error: 'Invalid credentials or account is inactive' }, { status: 401 });
    }

    const token = signToken({
      id: rider.id,
      role: 'rider',
      name: rider.name,
    });

    return NextResponse.json({
      token,
      rider: {
        id: rider.id,
        name: rider.name,
        phone: rider.phone,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
