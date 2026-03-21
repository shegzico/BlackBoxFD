import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// GET — List all customers in this business
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
    const { data: users, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, business_role, account_type, created_at')
      .eq('business_id', payload.business_id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
