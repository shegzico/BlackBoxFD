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
      .select('id, status, pickup_area, dropoff_area, pickup_date, is_express, rider_id')
      .eq('id', id)
      .single();

    if (error || !delivery) {
      return NextResponse.json({ error: 'Delivery not found' }, { status: 404, headers: CORS });
    }

    const { data: history } = await supabase
      .from('delivery_history')
      .select('id, status, timestamp, note')
      .eq('delivery_id', id)
      .order('timestamp', { ascending: true });

    return NextResponse.json({
      tracking: {
        id: delivery.id,
        status: delivery.status,
        pickup_area: delivery.pickup_area,
        dropoff_area: delivery.dropoff_area,
        pickup_date: delivery.pickup_date,
        is_express: delivery.is_express,
        rider_assigned: delivery.rider_id !== null,
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
