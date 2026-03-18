import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .select('*, rider:riders(id, name, phone)')
      .eq('id', id)
      .single();

    if (error || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const { data: history, error: historyError } = await supabase
      .from('delivery_history')
      .select('*')
      .eq('delivery_id', id)
      .order('timestamp', { ascending: true });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({ delivery: { ...delivery, history: history || [] } });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      status,
      rider_id,
      fee,
      triggered_by = 'admin',
      note,
      ...rest
    } = body;

    // Fetch current delivery to check existing status
    const { data: current, error: fetchError } = await supabase
      .from('deliveries')
      .select('status, rider_id')
      .eq('id', id)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = { ...rest };

    if (fee !== undefined) updates.fee = fee;

    // Handle rider assignment
    let resolvedStatus = status;
    if (rider_id !== undefined) {
      updates.rider_id = rider_id;
      if (!resolvedStatus && current.status === 'pending' && rider_id !== null) {
        resolvedStatus = 'assigned';
      }
    }

    if (resolvedStatus !== undefined) {
      updates.status = resolvedStatus;
    }

    updates.updated_at = new Date().toISOString();

    const { data: delivery, error: updateError } = await supabase
      .from('deliveries')
      .update(updates)
      .eq('id', id)
      .select('*, rider:riders(id, name, phone)')
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If status changed, insert a new history entry
    const newStatus = resolvedStatus;
    if (newStatus && newStatus !== current.status) {
      const { error: historyError } = await supabase
        .from('delivery_history')
        .insert({
          delivery_id: id,
          status: newStatus,
          triggered_by,
          note: note || null,
        });

      if (historyError) {
        return NextResponse.json({ error: historyError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ delivery });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
