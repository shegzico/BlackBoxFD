import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify auth — customer or admin
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || !['customer', 'admin'].includes(payload.role as string)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the delivery
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('id, status, customer_id')
      .eq('id', id)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Customers can only cancel their own pending deliveries
    if (payload.role === 'customer') {
      if (delivery.customer_id !== payload.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (delivery.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending orders can be cancelled' },
          { status: 400 }
        );
      }
    }

    // Update status to cancelled
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log to history
    await supabase.from('delivery_history').insert({
      delivery_id: id,
      status: 'cancelled',
      triggered_by: payload.role,
      note: payload.role === 'customer' ? 'Cancelled by customer' : 'Cancelled by admin',
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
