import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { generateTrackingId } from '@/lib/tracking-id';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const rider_id = searchParams.get('rider_id');
    const sort = searchParams.get('sort');

    let query = supabase
      .from('deliveries')
      .select('*, rider:riders(id, name, phone)');

    if (sort === 'priority') {
      // Urgent pickups first: pickup_date ASC (nulls last), then created_at DESC
      query = query
        .order('pickup_date', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      if (statuses.length === 1) {
        query = query.eq('status', statuses[0]);
      } else {
        query = query.in('status', statuses);
      }
    }

    if (rider_id) {
      query = query.eq('rider_id', rider_id);
    }

    if (search) {
      query = query.or(
        `id.ilike.%${search}%,sender_name.ilike.%${search}%,recipient_name.ilike.%${search}%,sender_phone.ilike.%${search}%,recipient_phone.ilike.%${search}%`
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      sender_name,
      sender_phone,
      sender_email,
      pickup_area,
      pickup_address,
      recipient_name,
      recipient_phone,
      dropoff_area,
      dropoff_address,
      package_description,
      payment_method,
      is_express,
      fee,
      created_by = 'customer',
    } = body;

    // Generate a unique tracking ID
    let tracking_id = generateTrackingId();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      const { data: existing } = await supabase
        .from('deliveries')
        .select('id')
        .eq('id', tracking_id)
        .maybeSingle();

      if (!existing) {
        isUnique = true;
      } else {
        tracking_id = generateTrackingId();
        attempts++;
      }
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Could not generate a unique tracking ID' }, { status: 500 });
    }

    // Insert the delivery record
    const { data: delivery, error: deliveryError } = await supabase
      .from('deliveries')
      .insert({
        id: tracking_id,
        sender_name,
        sender_phone,
        sender_email: sender_email || null,
        pickup_area,
        pickup_address,
        recipient_name,
        recipient_phone,
        dropoff_area,
        dropoff_address,
        package_description: package_description || null,
        payment_method,
        is_express: is_express ?? false,
        fee: fee ?? null,
        created_by,
        status: 'pending',
      })
      .select()
      .single();

    if (deliveryError) {
      return NextResponse.json({ error: deliveryError.message }, { status: 500 });
    }

    // Insert initial history entry
    const { error: historyError } = await supabase
      .from('delivery_history')
      .insert({
        delivery_id: tracking_id,
        status: 'pending',
        triggered_by: 'system',
        note: 'Delivery created',
      });

    if (historyError) {
      return NextResponse.json({ error: historyError.message }, { status: 500 });
    }

    return NextResponse.json({ delivery }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
