import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

const SELECT_FIELDS =
  'id, name, email, phone, first_name, last_name, avatar_url, is_verified, default_pickup_area, default_pickup_address, created_at, updated_at';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .select(SELECT_FIELDS)
      .eq('id', payload.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phone,
      first_name,
      last_name,
      avatar_url,
      avatar_base64,
      default_pickup_area,
      default_pickup_address,
    } = body;

    const updates: Record<string, string | null> = {};
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (first_name !== undefined) updates.first_name = first_name;
    if (last_name !== undefined) updates.last_name = last_name;
    if (default_pickup_area !== undefined) updates.default_pickup_area = default_pickup_area;
    if (default_pickup_address !== undefined) updates.default_pickup_address = default_pickup_address;

    // If avatar_base64 is provided, store it directly as avatar_url
    if (avatar_base64 !== undefined) {
      updates.avatar_url = avatar_base64;
    } else if (avatar_url !== undefined) {
      updates.avatar_url = avatar_url;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: customer, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', payload.id)
      .select(SELECT_FIELDS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customer });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
