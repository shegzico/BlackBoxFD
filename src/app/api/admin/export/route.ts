import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const completedStatuses = ['delivered', 'confirmed'];

    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('id, sender_name, recipient_name, pickup_area, dropoff_area, payment_method, fee, status, created_at, updated_at')
      .in('status', completedStatuses)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const headers = [
      'Tracking ID',
      'Sender',
      'Recipient',
      'Pickup Area',
      'Dropoff Area',
      'Payment Method',
      'Fee',
      'Status',
      'Created At',
      'Completed At',
    ];

    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value == null) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = (deliveries || []).map((d) => [
      escapeCSV(d.id),
      escapeCSV(d.sender_name),
      escapeCSV(d.recipient_name),
      escapeCSV(d.pickup_area),
      escapeCSV(d.dropoff_area),
      escapeCSV(d.payment_method),
      escapeCSV(d.fee),
      escapeCSV(d.status),
      escapeCSV(d.created_at),
      escapeCSV(d.updated_at),
    ].join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    const filename = `deliveries-export-${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
