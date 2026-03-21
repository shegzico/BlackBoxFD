import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// GET — Return business details
export async function GET(request: NextRequest) {
  const rawToken = getToken(request);
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(rawToken);
  if (!payload || payload.role !== 'customer') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!payload.business_id) {
    return NextResponse.json({ error: 'No business associated with your account' }, { status: 400 });
  }

  try {
    const { data: business, error } = await supabase
      .from('businesses')
      .select('id, name, email, phone, address, type, state, created_at, updated_at')
      .eq('id', payload.business_id)
      .single();

    if (error || !business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ business });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — Update business details (admin only)
export async function PATCH(request: NextRequest) {
  const rawToken = getToken(request);
  if (!rawToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = verifyToken(rawToken);
  if (!payload || payload.role !== 'customer' || payload.business_role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden: business admin required' }, { status: 403 });
  }

  if (!payload.business_id) {
    return NextResponse.json({ error: 'No business associated with your account' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, address, type } = body;

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (email !== undefined) updates.email = email || null;
    if (phone !== undefined) updates.phone = phone || null;
    if (address !== undefined) updates.address = address || null;
    if (type !== undefined) updates.type = type || null;

    const { data: business, error } = await supabase
      .from('businesses')
      .update(updates)
      .eq('id', payload.business_id)
      .select('id, name, email, phone, address, type, state, created_at, updated_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update business' }, { status: 500 });
    }

    return NextResponse.json({ business });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
