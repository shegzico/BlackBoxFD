import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface CustomerRecord {
  name: string;
  phone: string;
  email?: string;
  order_count: number;
  last_order_date: string;
}

interface RecipientRecord {
  name: string;
  phone: string;
  delivery_count: number;
  last_delivery_date: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const { data: deliveries, error } = await supabase
      .from('deliveries')
      .select('sender_name, sender_phone, sender_email, recipient_name, recipient_phone, created_at');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const response: { customers?: CustomerRecord[]; recipients?: RecipientRecord[] } = {};

    if (!type || type === 'customers') {
      const customerMap = new Map<string, CustomerRecord>();

      for (const delivery of deliveries) {
        const phone = delivery.sender_phone;
        if (!phone) continue;

        const existing = customerMap.get(phone);
        const createdAt = delivery.created_at;

        if (existing) {
          existing.order_count += 1;
          if (createdAt > existing.last_order_date) {
            existing.last_order_date = createdAt;
            existing.name = delivery.sender_name || existing.name;
            if (delivery.sender_email) {
              existing.email = delivery.sender_email;
            }
          }
        } else {
          customerMap.set(phone, {
            name: delivery.sender_name || '',
            phone,
            email: delivery.sender_email || undefined,
            order_count: 1,
            last_order_date: createdAt,
          });
        }
      }

      response.customers = Array.from(customerMap.values()).sort(
        (a, b) => new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
      );
    }

    if (!type || type === 'recipients') {
      const recipientMap = new Map<string, RecipientRecord>();

      for (const delivery of deliveries) {
        const phone = delivery.recipient_phone;
        if (!phone) continue;

        const existing = recipientMap.get(phone);
        const createdAt = delivery.created_at;

        if (existing) {
          existing.delivery_count += 1;
          if (createdAt > existing.last_delivery_date) {
            existing.last_delivery_date = createdAt;
            existing.name = delivery.recipient_name || existing.name;
          }
        } else {
          recipientMap.set(phone, {
            name: delivery.recipient_name || '',
            phone,
            delivery_count: 1,
            last_delivery_date: createdAt,
          });
        }
      }

      response.recipients = Array.from(recipientMap.values()).sort(
        (a, b) => new Date(b.last_delivery_date).getTime() - new Date(a.last_delivery_date).getTime()
      );
    }

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { error: 'Failed to fetch customer data' },
      { status: 500 }
    );
  }
}
