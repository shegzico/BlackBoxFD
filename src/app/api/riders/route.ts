import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('riders')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data: riders, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enrich each rider with delivery counts
    const ridersWithCounts = await Promise.all(
      (riders || []).map(async (rider) => {
        const { count: assignedCount } = await supabase
          .from('deliveries')
          .select('id', { count: 'exact', head: true })
          .eq('rider_id', rider.id)
          .not('status', 'in', '("delivered","confirmed")');

        const { count: completedCount } = await supabase
          .from('deliveries')
          .select('id', { count: 'exact', head: true })
          .eq('rider_id', rider.id)
          .in('status', ['delivered', 'confirmed']);

        return {
          ...rider,
          assigned_deliveries: assignedCount ?? 0,
          completed_deliveries: completedCount ?? 0,
        };
      })
    );

    return NextResponse.json({ riders: ridersWithCounts });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, pin, bike_plate, bike_model, bike_color, image_url } = body;

    if (!name || !phone || !pin) {
      return NextResponse.json({ error: 'Name, phone, and PIN are required' }, { status: 400 });
    }

    const { data: rider, error } = await supabase
      .from('riders')
      .insert({
        name,
        phone,
        pin,
        is_active: true,
        bike_plate: bike_plate || null,
        bike_model: bike_model || null,
        bike_color: bike_color || null,
        image_url: image_url || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ rider }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
