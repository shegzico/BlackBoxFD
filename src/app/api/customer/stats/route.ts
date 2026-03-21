import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyToken } from '@/lib/auth';

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
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    let query = supabase
      .from('deliveries')
      .select('status')
      .eq('customer_id', payload.id);

    if (from) query = query.gte('created_at', new Date(from).toISOString());
    if (to) {
      // Include the full end date (set time to end of day)
      const endDate = new Date(to);
      endDate.setHours(23, 59, 59, 999);
      query = query.lte('created_at', endDate.toISOString());
    }

    const { data: deliveries, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      total: deliveries.length,
      pending: 0,
      assigned: 0,
      picked_up: 0,
      in_transit: 0,
      delivered: 0,
      confirmed: 0,
      cancelled: 0,
    };

    for (const delivery of deliveries) {
      const status = delivery.status as keyof typeof stats;
      if (status in stats && status !== 'total') {
        stats[status]++;
      }
    }

    return NextResponse.json(stats);
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
