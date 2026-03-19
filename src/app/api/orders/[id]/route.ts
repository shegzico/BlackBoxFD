import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';
import { generateTrackingId } from '@/lib/tracking-id';

// Characters excluding easily confused ones: O, 0, I, 1, L
const PATCH_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function patchGenerateConfirmationCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += PATCH_CHARS.charAt(Math.floor(Math.random() * PATCH_CHARS.length));
  }
  return code;
}

async function patchGenerateUniqueTrackingId(): Promise<string | null> {
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

export async function GET(
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
    if (!payload || (payload.role !== 'customer' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Determine if the id param is numeric (order id) or string (order_number)
    const isNumeric = /^\d+$/.test(id);

    let query = supabase
      .from('orders')
      .select('*, deliveries(*, rider:riders(id, name, phone), delivery_history(*))');

    if (isNumeric) {
      query = query.eq('id', parseInt(id, 10));
    } else {
      query = query.eq('order_number', id);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Customers can only view their own orders; admins can view any
    if (payload.role === 'customer' && order.customer_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ order });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    if (!payload || (payload.role !== 'customer' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isNumeric = /^\d+$/.test(id);

    // Fetch order to verify ownership and draft status
    let query = supabase.from('orders').select('id, customer_id, is_draft');
    query = isNumeric ? query.eq('id', parseInt(id, 10)) : query.eq('order_number', id);
    const { data: order, error: fetchError } = await query.maybeSingle();

    if (fetchError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (payload.role === 'customer') {
      if (order.customer_id !== payload.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!order.is_draft) {
        return NextResponse.json({ error: 'Only draft orders can be deleted' }, { status: 400 });
      }
    }

    // Delete deliveries first (FK constraint), then the order
    await supabase.from('deliveries').delete().eq('order_id', order.id);
    const { error: deleteError } = await supabase.from('orders').delete().eq('id', order.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    if (!payload || (payload.role !== 'customer' && payload.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const isNumeric = /^\d+$/.test(id);

    // Fetch the existing order
    let fetchQuery = supabase
      .from('orders')
      .select('id, customer_id, is_draft, status');
    fetchQuery = isNumeric
      ? fetchQuery.eq('id', parseInt(id, 10))
      : fetchQuery.eq('order_number', id);

    const { data: existingOrder, error: fetchError } = await fetchQuery.maybeSingle();

    if (fetchError || !existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Customers can only patch their own orders
    if (payload.role === 'customer' && existingOrder.customer_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { is_draft, status, pickup, deliveries: deliveryItems, total_fee } = body;

    // Build order update fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderUpdates: Record<string, any> = {};

    if (is_draft !== undefined) orderUpdates.is_draft = is_draft;
    if (status !== undefined) orderUpdates.status = status;
    if (total_fee !== undefined) orderUpdates.total_fee = total_fee;

    if (pickup) {
      if (pickup.sender_name !== undefined) orderUpdates.sender_name = pickup.sender_name;
      if (pickup.sender_phone !== undefined) orderUpdates.sender_phone = pickup.sender_phone;
      if (pickup.sender_email !== undefined) orderUpdates.sender_email = pickup.sender_email || null;
      if (pickup.pickup_area !== undefined) orderUpdates.pickup_area = pickup.pickup_area;
      if (pickup.pickup_address !== undefined) orderUpdates.pickup_address = pickup.pickup_address;
      if (pickup.pickup_date !== undefined) orderUpdates.pickup_date = pickup.pickup_date;
      if (pickup.payment_method !== undefined) orderUpdates.payment_method = pickup.payment_method;
      if (pickup.is_express !== undefined) orderUpdates.is_express = pickup.is_express;
    }

    if (deliveryItems && Array.isArray(deliveryItems)) {
      orderUpdates.delivery_count = deliveryItems.length;
    }

    // Update the order row
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(orderUpdates)
      .eq('id', existingOrder.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    let updatedDeliveries = null;

    if (deliveryItems && Array.isArray(deliveryItems) && pickup) {
      // Delete existing deliveries and recreate them
      await supabase.from('deliveries').delete().eq('order_id', existingOrder.id);

      const newDeliveries = [];
      const newStatus = is_draft ? 'draft' : (status ?? existingOrder.status);

      for (const item of deliveryItems) {
        const tracking_id = await patchGenerateUniqueTrackingId();
        if (!tracking_id) {
          return NextResponse.json({ error: 'Could not generate a unique tracking ID' }, { status: 500 });
        }

        const confirmation_code = patchGenerateConfirmationCode();

        const { data: delivery, error: deliveryError } = await supabase
          .from('deliveries')
          .insert({
            id: tracking_id,
            order_id: existingOrder.id,
            customer_id: existingOrder.customer_id,
            sender_name: pickup.sender_name,
            sender_phone: pickup.sender_phone,
            sender_email: pickup.sender_email || null,
            pickup_area: pickup.pickup_area,
            pickup_address: pickup.pickup_address,
            pickup_date: pickup.pickup_date,
            payment_method: pickup.payment_method,
            is_express: pickup.is_express ?? false,
            recipient_name: item.recipient_name,
            recipient_phone: item.recipient_phone,
            recipient_email: item.recipient_email || null,
            dropoff_area: item.dropoff_area,
            dropoff_address: item.dropoff_address,
            package_description: item.package_description || null,
            package_weight: item.package_weight ?? null,
            fee: item.fee ?? null,
            confirmation_code,
            status: newStatus,
            created_by: existingOrder.customer_id ? 'customer' : 'admin',
          })
          .select()
          .single();

        if (deliveryError) {
          return NextResponse.json({ error: deliveryError.message }, { status: 500 });
        }

        // If now a real order (not draft), insert delivery_history
        if (!is_draft && newStatus === 'pending') {
          await supabase.from('delivery_history').insert({
            delivery_id: tracking_id,
            status: 'pending',
            triggered_by: 'customer',
            note: 'Order confirmed from draft',
          });
        }

        newDeliveries.push(delivery);
      }

      updatedDeliveries = newDeliveries;
    } else if (is_draft !== undefined || status !== undefined) {
      // Just update status/is_draft on existing deliveries
      const deliveryUpdates: Record<string, unknown> = {};
      if (is_draft !== undefined) {
        deliveryUpdates.status = is_draft ? 'draft' : (status ?? 'pending');
      } else if (status !== undefined) {
        deliveryUpdates.status = status;
      }

      if (Object.keys(deliveryUpdates).length > 0) {
        await supabase
          .from('deliveries')
          .update(deliveryUpdates)
          .eq('order_id', existingOrder.id);
      }

      // Fetch updated deliveries
      const { data: fetchedDeliveries } = await supabase
        .from('deliveries')
        .select('*')
        .eq('order_id', existingOrder.id);

      updatedDeliveries = fetchedDeliveries;
    }

    return NextResponse.json({ order: { ...updatedOrder, deliveries: updatedDeliveries } });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
