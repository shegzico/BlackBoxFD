import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: delivery, error } = await supabase
      .from('deliveries')
      .select('id, status, pickup_area, dropoff_area, pickup_date, is_express, package_description, sender_name, recipient_name, rider:riders(name)')
      .eq('id', id)
      .single();

    if (error || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404, headers: CORS });
    }

    const { data: history } = await supabase
      .from('delivery_history')
      .select('id, status, timestamp, note, triggered_by')
      .eq('delivery_id', id)
      .order('timestamp', { ascending: true });

    // Mask recipient to first name + last initial only for privacy
    const recipientParts = (delivery.recipient_name || '').trim().split(' ');
    const maskedRecipient = recipientParts.length > 1
      ? `${recipientParts[0]} ${recipientParts[recipientParts.length - 1][0]}.`
      : recipientParts[0] || 'Recipient';

    const rider = Array.isArray(delivery.rider) ? delivery.rider[0] : delivery.rider;

    return NextResponse.json({
      tracking: {
        id: delivery.id,
        status: delivery.status,
        pickup_area: delivery.pickup_area,
        dropoff_area: delivery.dropoff_area,
        pickup_date: delivery.pickup_date,
        is_express: delivery.is_express,
        package_description: delivery.package_description,
        sender_name: delivery.sender_name,
        recipient_name: maskedRecipient,
        rider_name: rider?.name ?? null,
        history: (history || []).map((h) => ({
          id: h.id,
          status: h.status,
          timestamp: h.timestamp,
          note: h.note,
        })),
      },
    }, { status: 200, headers: CORS });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: CORS });
  }
}
