import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { sendInviteEmail } from '@/lib/email';

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// POST — Admin invites a user
export async function POST(request: NextRequest) {
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
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    if (!['admin', 'basic'].includes(role)) {
      return NextResponse.json({ error: 'Role must be admin or basic' }, { status: 400 });
    }

    // Check if email already belongs to this business
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('email', email)
      .single();

    if (existingCustomer?.business_id === payload.business_id) {
      return NextResponse.json({ error: 'This user is already in your business' }, { status: 409 });
    }

    // Check for existing pending invite
    const { data: existingInvite } = await supabase
      .from('business_invites')
      .select('id')
      .eq('business_id', payload.business_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (existingInvite) {
      return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 409 });
    }

    // Get business details
    const { data: business } = await supabase
      .from('businesses')
      .select('name')
      .eq('id', payload.business_id)
      .single();

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const token = crypto.randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteLink = `${appUrl}/accept-invite?token=${token}`;

    const { error: insertError } = await supabase
      .from('business_invites')
      .insert({
        business_id: payload.business_id,
        invited_by: payload.id,
        email,
        role,
        token,
        status: 'pending',
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
    }

    await sendInviteEmail(email, payload.name, business.name, role, inviteLink);

    return NextResponse.json({ message: 'Invite sent' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET — List pending invites for the business
export async function GET(request: NextRequest) {
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
    const { data: invites, error } = await supabase
      .from('business_invites')
      .select('id, email, role, created_at, status, expires_at, token')
      .eq('business_id', payload.business_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
    }

    return NextResponse.json({ invites: invites || [] });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
