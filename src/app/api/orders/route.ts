import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { generateTrackingId } from '@/lib/tracking-id';

// Characters excluding easily confused ones: O, 0, I, 1, L
const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateOrderNumber(): string {
  let num = 'ORD-';
  for (let i = 0; i < 6; i++) {
    num += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return num;
}

function generateConfirmationCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
  }
  return code;
}

async function generateUniqueOrderNumber(): Promise<string | null> {
  let attempts = 0;
  while (attempts < 10) {
    const order_number = generateOrderNumber();
    const { data: existing } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', order_number)
      .maybeSingle();
    if (!existing) return order_number;
    attempts++;
  }
  return null;
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
    if (!existing) return tracking_id;
    attempts++;
  }
  return null;
}

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

    // Fetch orders with nested deliveries and rider info
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, deliveries(*, rider:riders(id, name, phone))')
      .eq('customer_id', payload.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Sort: non-draft, non-delivered orders by pickup_date ASC first, then rest by created_at DESC
    const active = (orders ?? []).filter(
      (o) => !o.is_draft && o.status !== 'delivered'
    ).sort((a, b) => {
      if (a.pickup_date && b.pickup_date) {
        return new Date(a.pickup_date).getTime() - new Date(b.pickup_date).getTime();
      }
      return 0;
    });

    const rest = (orders ?? []).filter(
      (o) => o.is_draft || o.status === 'delivered'
    ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ orders: [...active, ...rest] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
    const { pickup, deliveries: deliveryItems, is_draft = false, total_fee } = body;

    if (!pickup || !Array.isArray(deliveryItems) || deliveryItems.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: pickup info and at least one delivery are required' },
        { status: 400 }
      );
    }

    // Generate unique order_number
    const order_number = await generateUniqueOrderNumber();
    if (!order_number) {
      return NextResponse.json({ error: 'Could not generate a unique order number' }, { status: 500 });
    }

    const orderStatus = is_draft ? 'draft' : 'pending';

    // Insert order row
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number,
        customer_id: payload.id,
        status: orderStatus,
        is_draft,
        pickup_date: pickup.pickup_date,
        sender_name: pickup.sender_name,
        sender_phone: pickup.sender_phone,
        sender_email: pickup.sender_email || null,
        pickup_area: pickup.pickup_area,
        pickup_address: pickup.pickup_address,
        payment_method: pickup.payment_method,
        is_express: pickup.is_express ?? false,
        total_fee: total_fee ?? null,
        delivery_count: deliveryItems.length,
        created_by: 'customer',
      })
      .select()
      .single();

    if (orderError) {
      return NextResponse.json({ error: orderError.message }, { status: 500 });
    }

    const createdDeliveries = [];

    for (const item of deliveryItems) {
      // Generate unique tracking ID
      const tracking_id = await generateUniqueTrackingId();
      if (!tracking_id) {
        return NextResponse.json({ error: 'Could not generate a unique tracking ID' }, { status: 500 });
      }

      // Generate confirmation code
      const confirmation_code = generateConfirmationCode();

      // Insert delivery
      const { data: delivery, error: deliveryError } = await supabase
        .from('deliveries')
        .insert({
          id: tracking_id,
          order_id: order.id,
          customer_id: payload.id,
          // Pickup fields from pickup object
          sender_name: pickup.sender_name,
          sender_phone: pickup.sender_phone,
          sender_email: pickup.sender_email || null,
          pickup_area: pickup.pickup_area,
          pickup_address: pickup.pickup_address,
          pickup_date: pickup.pickup_date,
          payment_method: pickup.payment_method,
          is_express: pickup.is_express ?? false,
          // Recipient fields from delivery item
          recipient_name: item.recipient_name,
          recipient_phone: item.recipient_phone,
          recipient_email: item.recipient_email || null,
          dropoff_area: item.dropoff_area,
          dropoff_address: item.dropoff_address,
          package_description: item.package_description || null,
          package_weight: item.package_weight ?? null,
          fee: item.fee ?? null,
          confirmation_code,
          status: orderStatus,
          created_by: 'customer',
        })
        .select()
        .single();

      if (deliveryError) {
        return NextResponse.json({ error: deliveryError.message }, { status: 500 });
      }

      // Insert delivery_history only if not a draft
      if (!is_draft) {
        const { error: historyError } = await supabase
          .from('delivery_history')
          .insert({
            delivery_id: tracking_id,
            status: 'pending',
            triggered_by: 'customer',
            note: `Order placed by ${payload.name}`,
            performed_by_customer_id: payload.id,
            performed_by_name: payload.name,
          });

        if (historyError) {
          return NextResponse.json({ error: historyError.message }, { status: 500 });
        }
      }

      createdDeliveries.push(delivery);
    }

    return NextResponse.json(
      { order: { ...order, deliveries: createdDeliveries } },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
