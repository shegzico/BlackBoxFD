import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getAuthToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// GET — Get invite details by token (no auth required)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const { data: invite, error } = await supabase
      .from('business_invites')
      .select('id, email, role, status, expires_at, business_id, businesses(name)')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ valid: false });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ valid: false });
    }

    if (new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ valid: false });
    }

    const businessData = invite.businesses as unknown as { name: string } | null;

    return NextResponse.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      business: { name: businessData?.name || '' },
    });
  } catch {
    return NextResponse.json({ valid: false });
  }
}

// DELETE — Admin cancels an invite
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const rawToken = getAuthToken(request);
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
    const { data: invite, error: fetchError } = await supabase
      .from('business_invites')
      .select('id, business_id')
      .eq('token', token)
      .single();

    if (fetchError || !invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    if (invite.business_id !== payload.business_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('business_invites')
      .delete()
      .eq('id', invite.id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to cancel invite' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Invite cancelled' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
