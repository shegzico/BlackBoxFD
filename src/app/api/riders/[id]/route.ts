import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: rider, error } = await supabase
      .from('riders')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    const { count: assignedCount } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('rider_id', id)
      .not('status', 'in', '("delivered","confirmed")');

    const { count: completedCount } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('rider_id', id)
      .in('status', ['delivered', 'confirmed']);

    const { count: totalCount } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .eq('rider_id', id);

    return NextResponse.json({
      rider: {
        ...rider,
        stats: {
          total: totalCount ?? 0,
          active: assignedCount ?? 0,
          completed: completedCount ?? 0,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { data: rider, error } = await supabase
      .from('riders')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    return NextResponse.json({ rider });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: rider, error } = await supabase
      .from('riders')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rider) {
      return NextResponse.json({ error: 'Rider not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Rider deactivated successfully', rider });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
