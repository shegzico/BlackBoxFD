import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    // Verify ownership and status
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('id, status, customer_id')
      .eq('id', id)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }
    if (delivery.customer_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (delivery.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending orders can be edited' }, { status: 400 });
    }

    const body = await request.json();
    const allowed = [
      'recipient_name', 'recipient_phone', 'recipient_email',
      'dropoff_address', 'dropoff_area',
      'package_description', 'package_weight', 'pickup_date',
    ];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const { error: updateError } = await supabase
      .from('deliveries')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log edit to history for audit trail
    await supabase.from('delivery_history').insert({
      delivery_id: id,
      status: delivery.status,
      triggered_by: 'customer',
      note: `Order details edited by ${payload.name}`,
      performed_by_customer_id: payload.id,
      performed_by_name: payload.name,
    });

    return NextResponse.json({ message: 'Delivery updated' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
