import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getStatusNote } from '@/lib/status-notes';
import { generateConfirmationCode, sendReturnConfirmationEmail, sendSMS } from '@/lib/email';

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
      .order('timestamp', { ascending: false });

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

    // Fetch current delivery to check existing status + contact details for return code
    const { data: current, error: fetchError } = await supabase
      .from('deliveries')
      .select('status, rider_id, sender_name, sender_phone, sender_email, recipient_name')
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

    // When transitioning to 'returning', generate a return confirmation code for the sender
    if (resolvedStatus === 'returning' && current.status !== 'returning') {
      updates.return_confirmation_code = generateConfirmationCode();
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
      const rider = Array.isArray(delivery.rider) ? delivery.rider[0] : delivery.rider;
      const { error: historyError } = await supabase
        .from('delivery_history')
        .insert({
          delivery_id: id,
          status: newStatus,
          triggered_by,
          note: note || getStatusNote(newStatus, { riderName: rider?.name }),
        });

      if (historyError) {
        return NextResponse.json({ error: historyError.message }, { status: 500 });
      }
    }

    // Send return confirmation code to sender when package starts heading back
    if (resolvedStatus === 'returning' && updates.return_confirmation_code && current.status !== 'returning') {
      const returnCode = updates.return_confirmation_code as string;
      if (current.sender_email) {
        sendReturnConfirmationEmail(
          current.sender_email, current.sender_name, returnCode, id, current.recipient_name
        ).catch(() => {});
      }
      sendSMS(
        current.sender_phone,
        `Hi ${current.sender_name.split(' ')[0]}, your undelivered package (${id}) is being returned to you. Your return confirmation code is: ${returnCode}. Give this code ONLY to the rider returning your package.`
      ).catch(() => {});
    }

    return NextResponse.json({ delivery });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
