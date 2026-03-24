import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

const REATTEMPT_WINDOW_MS = 48 * 60 * 60 * 1000; // 48 hours

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (!payload || payload.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the delivery
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('id, status, customer_id, updated_at, sender_name')
      .eq('id', id)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Must belong to this customer
    if (delivery.customer_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Must be in delivery_failed status
    if (delivery.status !== 'delivery_failed') {
      return NextResponse.json(
        { error: 'Reattempt is only available for deliveries with status "delivery_failed"' },
        { status: 400 }
      );
    }

    // Must be within 48 hours of the failure (updated_at is when it was marked failed)
    const failedAt = new Date(delivery.updated_at).getTime();
    const now = Date.now();
    if (now - failedAt > REATTEMPT_WINDOW_MS) {
      return NextResponse.json(
        { error: 'The 48-hour reattempt window has expired. Please contact support.' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const initiatedBy: 'sender' | 'recipient' = body.initiated_by === 'recipient' ? 'recipient' : 'sender';

    // Reset status to pending
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Insert history entry
    const note = initiatedBy === 'recipient'
      ? `Reattempt requested by the recipient — delivery reset to pending. A reattempt fee applies.`
      : `Reattempt requested by ${delivery.sender_name} (sender) — delivery reset to pending. A reattempt fee applies.`;

    await supabase.from('delivery_history').insert({
      delivery_id: id,
      status: 'pending',
      triggered_by: 'customer',
      note,
    });

    return NextResponse.json({ success: true, message: 'Reattempt requested. Your delivery is back in the queue.' });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
