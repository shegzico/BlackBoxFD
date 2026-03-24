import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/deliveries/[id]/confirm
 *
 * Rider submits confirmation code + optional photo to confirm handover.
 * Accepts multipart/form-data:
 *   - code:  (string) confirmation code given by recipient/sender
 *   - photo: (File, optional) photo of package being handed over
 *
 * - If delivery is in_transit  → validates delivery_confirmation_code → marks delivered
 * - If delivery is returning   → validates return_confirmation_code   → marks returned
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse multipart form data
    let code: string;
    let photoFile: File | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      code = (form.get('code') as string | null)?.trim().toUpperCase() ?? '';
      photoFile = form.get('photo') as File | null;
    } else {
      const body = await request.json();
      code = (body.code as string | null)?.trim().toUpperCase() ?? '';
    }

    if (!code) {
      return NextResponse.json({ error: 'Confirmation code is required' }, { status: 400 });
    }

    // Fetch the delivery
    const { data: delivery, error: fetchError } = await supabase
      .from('deliveries')
      .select('id, status, delivery_confirmation_code, return_confirmation_code, rider_id, sender_name, recipient_name')
      .eq('id', id)
      .single();

    if (fetchError || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Determine which flow we're in
    const isDelivery = delivery.status === 'in_transit';
    const isReturn   = delivery.status === 'returning';

    if (!isDelivery && !isReturn) {
      return NextResponse.json(
        { error: `Cannot confirm a delivery with status "${delivery.status}". Expected in_transit or returning.` },
        { status: 400 }
      );
    }

    // Validate code
    const expectedCode = isDelivery
      ? delivery.delivery_confirmation_code
      : delivery.return_confirmation_code;

    if (!expectedCode) {
      return NextResponse.json(
        { error: 'No confirmation code set for this delivery. Please contact support.' },
        { status: 409 }
      );
    }

    if (code !== expectedCode) {
      return NextResponse.json({ error: 'Incorrect confirmation code' }, { status: 422 });
    }

    const newStatus = isDelivery ? 'delivered' : 'returned';
    const photoField = isDelivery ? 'delivery_photo_url' : 'return_photo_url';

    // Upload photo if provided
    let photoUrl: string | null = null;
    if (photoFile && photoFile.size > 0) {
      const ext = photoFile.name.split('.').pop() || 'jpg';
      const filename = `${id}/${newStatus}-${Date.now()}.${ext}`;
      const arrayBuffer = await photoFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const { error: uploadError } = await supabaseAdmin.storage
        .from('delivery-photos')
        .upload(filename, buffer, {
          contentType: photoFile.type || 'image/jpeg',
          upsert: true,
        });

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage
          .from('delivery-photos')
          .getPublicUrl(filename);
        photoUrl = urlData?.publicUrl ?? null;
      } else {
        console.error('Photo upload error:', uploadError.message);
        // Don't fail the confirmation if photo upload fails — proceed without it
      }
    }

    // Update delivery
    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };
    if (photoUrl) updates[photoField] = photoUrl;

    const { error: updateError } = await supabase
      .from('deliveries')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Insert history entry
    const historyNote = isDelivery
      ? `Package handed to ${delivery.recipient_name} — confirmation code verified by rider${photoUrl ? ' (photo captured)' : ''}`
      : `Package returned to ${delivery.sender_name} — return code verified by rider${photoUrl ? ' (photo captured)' : ''}`;

    await supabase.from('delivery_history').insert({
      delivery_id: id,
      status: newStatus,
      triggered_by: 'rider',
      note: historyNote,
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
      photo_url: photoUrl,
      message: isDelivery ? 'Delivery confirmed successfully' : 'Return confirmed successfully',
    });
  } catch (err) {
    console.error('Confirm error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
