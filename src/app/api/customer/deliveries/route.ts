import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { generateTrackingId } from '@/lib/tracking-id';
import { generateConfirmationCode, sendDeliveryConfirmationEmail, sendSMS } from '@/lib/email';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('deliveries')
      .select('*, rider:riders(id, name, phone)')
      .eq('customer_id', payload.id)
      .order('created_at', { ascending: false });

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else {
        query = query.in('status', statuses);
      }
    }

    if (search) {
      query = query.or(
        `id.ilike.%${search}%,recipient_name.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ deliveries: data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function generateUniqueTrackingId(): Promise<string | null> {
  let attempts = 0;

  while (attempts < 10) {
    const tracking_id = generateTrackingId();
    const { data: existing } = await supabase
      .from('deliveries')
      .select('id')
      .eq('id', tracking_id)
      .maybeSingle();

    if (!existing) {
      return tracking_id;
    }
    attempts++;
  }

  return null;
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();

    // Determine if bulk or single
    const isBulk = Array.isArray(body.deliveries);
    const deliveryItems = isBulk ? body.deliveries : [body];

    const createdDeliveries = [];

    for (const item of deliveryItems) {
      const tracking_id = await generateUniqueTrackingId();
      if (!tracking_id) {
        return NextResponse.json({ error: 'Could not generate a unique tracking ID' }, { status: 500 });
      }

      const confirmationCode = generateConfirmationCode();

      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          id: tracking_id,
          customer_id: payload.id,
          sender_name: item.sender_name,
          sender_phone: item.sender_phone,
          sender_email: item.sender_email || null,
          pickup_area: item.pickup_area,
          pickup_address: item.pickup_address,
          recipient_name: item.recipient_name,
          recipient_phone: item.recipient_phone,
          dropoff_area: item.dropoff_area,
          dropoff_address: item.dropoff_address,
          package_description: item.package_description || null,
          payment_method: item.payment_method,
          is_express: item.is_express ?? false,
          fee: item.fee ?? null,
          created_by: 'customer',
          status: 'pending',
          delivery_confirmation_code: confirmationCode,
        })
        .select()
        .single();

      if (deliveryError) {
        return NextResponse.json({ error: deliveryError.message }, { status: 500 });
      }

      const { error: historyError } = await supabase
        .from('delivery_history')
        .insert({
          delivery_id: tracking_id,
          status: 'pending',
          triggered_by: 'customer',
          note: 'Delivery created — confirmation code sent to recipient',
        });

      if (historyError) {
        return NextResponse.json({ error: historyError.message }, { status: 500 });
      }

      // Send confirmation code to recipient (fire-and-forget — don't fail the request)
      const recipientEmail = item.recipient_email as string | undefined;
      const recipientPhone = item.recipient_phone as string;
      if (recipientEmail) {
        sendDeliveryConfirmationEmail(
          recipientEmail,
          item.recipient_name,
          confirmationCode,
          tracking_id,
          item.pickup_area,
          item.dropoff_area
        ).catch(() => {});
      }
      sendSMS(
        recipientPhone,
        `Hi ${item.recipient_name.split(' ')[0]}, a BlackBox Logistics package is on its way to you (${tracking_id}). Your delivery confirmation code is: ${confirmationCode}. Give this code ONLY to the rider at your door.`
      ).catch(() => {});

      createdDeliveries.push(delivery);
    }

    if (isBulk) {
      return NextResponse.json({ deliveries: createdDeliveries }, { status: 201 });
    }

    return NextResponse.json({ delivery: createdDeliveries[0] }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
