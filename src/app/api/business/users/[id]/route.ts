import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

function getToken(request: NextRequest): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

// PATCH — Update business role (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

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
    const { business_role } = body;

    if (!business_role || !['admin', 'basic'].includes(business_role)) {
      return NextResponse.json({ error: 'business_role must be admin or basic' }, { status: 400 });
    }

    // Verify target user belongs to same business
    const { data: targetUser } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', userId)
      .single();

    if (!targetUser || targetUser.business_id !== payload.business_id) {
      return NextResponse.json({ error: 'User not found in your business' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update({ business_role })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Role updated successfully' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE — Remove user from business (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
  }

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

  // Prevent self-removal
  if (userId === payload.id) {
    return NextResponse.json({ error: 'You cannot remove yourself from the business' }, { status: 400 });
  }

  try {
    // Verify target user belongs to same business
    const { data: targetUser } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', userId)
      .single();

    if (!targetUser || targetUser.business_id !== payload.business_id) {
      return NextResponse.json({ error: 'User not found in your business' }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        business_id: null,
        business_role: null,
        account_type: 'individual',
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to remove user from business' }, { status: 500 });
    }

    return NextResponse.json({ message: 'User removed from business' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
