import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

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
    const { deliveries } = body;

    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      return NextResponse.json({ error: 'deliveries array is required' }, { status: 400 });
    }

    // Collect all unique areas to look up
    const areas = new Set<string>();
    for (const d of deliveries) {
      if (d.pickup_area) areas.add(d.pickup_area);
      if (d.dropoff_area) areas.add(d.dropoff_area);
    }

    const { data: pricingData, error: pricingError } = await supabase
      .from('pricing')
      .select('location, price')
      .in('location', Array.from(areas))
      .eq('is_active', true);

    if (pricingError) {
      return NextResponse.json({ error: pricingError.message }, { status: 500 });
    }

    const priceMap: Record<string, number> = {};
    for (const entry of pricingData || []) {
      priceMap[entry.location] = entry.price;
    }

    const estimates = deliveries.map((d: { pickup_area: string; dropoff_area: string; is_express?: boolean }) => {
      const pickupPrice = priceMap[d.pickup_area] ?? 0;
      const dropoffPrice = priceMap[d.dropoff_area] ?? 0;
      let fee = Math.max(pickupPrice, dropoffPrice);

      if (d.is_express) {
        fee = fee * 1.5;
      }

      return {
        pickup_area: d.pickup_area,
        dropoff_area: d.dropoff_area,
        fee,
      };
    });

    const total = estimates.reduce((sum: number, e: { fee: number }) => sum + e.fee, 0);

    return NextResponse.json({ estimates, total });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
