import { NextRequest, NextResponse } from 'next/server';
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

    const csvContent = [
      'recipient_name,recipient_phone,recipient_email,dropoff_area,dropoff_address,package_weight,package_description',
      'John Doe,08012345678,john@example.com,Victoria Island,12 Adeola Odeku Street,2.5,₦25000 – Sneakers – No Insurance – Leave at door',
      'Jane Smith,08098765432,,Ikeja,45 Allen Avenue,0.8,₦15000 – Laptop Bag – No Insurance – Leave with reception',
    ].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="bulk-delivery-template.csv"',
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
