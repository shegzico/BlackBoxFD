import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'blackbox-secret';

function verifyAdmin(request: NextRequest): boolean {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { role?: string };
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

export interface CustomerRecord {
  name: string;
  phone: string;
  email: string;
  location: string;          // most recent pickup_area
  address: string;           // registered default_pickup_address
  order_count: number;
  completed_orders: number;
  total_spent: number;
  last_order_date: string;
  first_order_date: string;
}

export interface RecipientRecord {
  name: string;
  phone: string;
  location: string;          // most recent dropoff_area
  address: string;           // registered default_pickup_address (if any)
  delivery_count: number;
  last_delivery_date: string;
  first_delivery_date: string;
}

export interface BusinessRecord {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  business_type: string;
  state: string;
  date_added: string;
  order_count: number;
  total_spent: number;
  last_order_date: string;
}

export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // ── Deliveries data (for Customers + Recipients tabs) ──
    const { data: rawDeliveries, error: deliveriesError } = await supabase
      .from('deliveries')
      .select(
        'sender_name, sender_phone, sender_email, recipient_name, recipient_phone,' +
        'created_at, fee, status, pickup_area, dropoff_area'
      );

    if (deliveriesError) {
      return NextResponse.json({ error: deliveriesError.message }, { status: 500 });
    }

    type DeliveryRow = {
      sender_name: string; sender_phone: string; sender_email: string;
      recipient_name: string; recipient_phone: string;
      created_at: string; fee: number | null; status: string;
      pickup_area: string; dropoff_area: string;
    };
    const deliveries = (rawDeliveries ?? []) as unknown as DeliveryRow[];

    // ── Registered customer profiles (email + address enrichment) ──
    const { data: rawProfiles } = await supabase
      .from('customers')
      .select('phone, email, default_pickup_address');

    type ProfileRow = { phone: string; email: string | null; default_pickup_address: string | null };
    const profiles = (rawProfiles ?? []) as unknown as ProfileRow[];

    const profileMap = new Map<string, ProfileRow>();
    for (const p of profiles) {
      if (p.phone) profileMap.set(p.phone, p);
    }

    // ── CUSTOMERS (senders) ──────────────────────────────────────
    const customerMap = new Map<string, CustomerRecord>();

    for (const d of deliveries) {
      const phone = d.sender_phone;
      if (!phone) continue;

      const isCompleted = d.status === 'delivered' || d.status === 'confirmed';
      const fee = typeof d.fee === 'number' ? d.fee : 0;
      const profile = profileMap.get(phone);

      const existing = customerMap.get(phone);
      if (existing) {
        existing.order_count += 1;
        if (isCompleted) {
          existing.completed_orders += 1;
          existing.total_spent += fee;
        }
        if (d.created_at > existing.last_order_date) {
          existing.last_order_date = d.created_at;
          existing.name = d.sender_name || existing.name;
          existing.location = d.pickup_area || existing.location;
        }
        // Always prefer registered profile email & address
        if (!existing.email) existing.email = profile?.email || d.sender_email || '';
        if (!existing.address && profile?.default_pickup_address) existing.address = profile.default_pickup_address;
        if (d.created_at < existing.first_order_date) {
          existing.first_order_date = d.created_at;
        }
      } else {
        customerMap.set(phone, {
          name: d.sender_name || '',
          phone,
          email: profile?.email || d.sender_email || '',
          location: d.pickup_area || '',
          address: profile?.default_pickup_address || '',
          order_count: 1,
          completed_orders: isCompleted ? 1 : 0,
          total_spent: isCompleted ? fee : 0,
          last_order_date: d.created_at,
          first_order_date: d.created_at,
        });
      }
    }

    // Final pass: enrich any remaining records from profile map
    for (const [phone, record] of customerMap) {
      const profile = profileMap.get(phone);
      if (profile) {
        if (!record.email && profile.email) record.email = profile.email;
        if (!record.address && profile.default_pickup_address) record.address = profile.default_pickup_address;
      }
    }

    const customers: CustomerRecord[] = Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.last_order_date).getTime() - new Date(a.last_order_date).getTime()
    );

    // ── RECIPIENTS ───────────────────────────────────────────────
    const recipientMap = new Map<string, RecipientRecord>();

    for (const d of deliveries) {
      const phone = d.recipient_phone;
      if (!phone) continue;

      const profile = profileMap.get(phone);
      const existing = recipientMap.get(phone);
      if (existing) {
        existing.delivery_count += 1;
        if (d.created_at > existing.last_delivery_date) {
          existing.last_delivery_date = d.created_at;
          existing.name = d.recipient_name || existing.name;
          existing.location = d.dropoff_area || existing.location;
        }
        if (!existing.address && profile?.default_pickup_address) existing.address = profile.default_pickup_address;
        if (d.created_at < existing.first_delivery_date) {
          existing.first_delivery_date = d.created_at;
        }
      } else {
        recipientMap.set(phone, {
          name: d.recipient_name || '',
          phone,
          location: d.dropoff_area || '',
          address: profile?.default_pickup_address || '',
          delivery_count: 1,
          last_delivery_date: d.created_at,
          first_delivery_date: d.created_at,
        });
      }
    }

    const recipients: RecipientRecord[] = Array.from(recipientMap.values()).sort(
      (a, b) => new Date(b.last_delivery_date).getTime() - new Date(a.last_delivery_date).getTime()
    );

    // ── BUSINESSES (registered accounts) ────────────────────────
    const { data: bizCustomers, error: bizError } = await supabase
      .from('customers')
      .select('name, email, phone, created_at, business_id, businesses(name, email, phone, address, type, state)')
      .eq('account_type', 'business')
      .eq('business_role', 'admin');

    if (bizError) {
      return NextResponse.json({ error: bizError.message }, { status: 500 });
    }

    // Build business order stats from deliveries by sender_phone
    const spendByPhone = new Map<string, { count: number; spent: number; last: string }>();
    for (const d of deliveries) {
      const phone = d.sender_phone;
      if (!phone) continue;
      const isCompleted = d.status === 'delivered' || d.status === 'confirmed';
      const fee = typeof d.fee === 'number' ? d.fee : 0;
      const existing = spendByPhone.get(phone);
      if (existing) {
        existing.count += 1;
        if (isCompleted) existing.spent += fee;
        if (d.created_at > existing.last) existing.last = d.created_at;
      } else {
        spendByPhone.set(phone, {
          count: 1,
          spent: isCompleted ? fee : 0,
          last: d.created_at,
        });
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const businesses: BusinessRecord[] = (bizCustomers ?? []).map((c: any) => {
      const biz = Array.isArray(c.businesses) ? c.businesses[0] : c.businesses;
      const stats = spendByPhone.get(c.phone) ?? { count: 0, spent: 0, last: '' };
      return {
        business_name: biz?.name || c.name,
        contact_name: c.name,
        email: biz?.email || c.email || '',
        phone: biz?.phone || c.phone || '',
        address: biz?.address || '',
        business_type: biz?.type || '',
        state: biz?.state || '',
        date_added: c.created_at,
        order_count: stats.count,
        total_spent: stats.spent,
        last_order_date: stats.last,
      };
    }).sort((a: BusinessRecord, b: BusinessRecord) =>
      new Date(b.date_added).getTime() - new Date(a.date_added).getTime()
    );

    return NextResponse.json({ customers, recipients, businesses });
  } catch (err) {
    console.error('customers API error:', err);
    return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { phones, tab } = await request.json() as { phones: string[]; tab: string };

    if (!Array.isArray(phones) || phones.length === 0) {
      return NextResponse.json({ error: 'No records specified' }, { status: 400 });
    }

    if (tab === 'customers') {
      // Remove deliveries where they are the sender
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .in('sender_phone', phones);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      // Also remove their registered account if present
      await supabase.from('customers').delete().in('phone', phones);

    } else if (tab === 'recipients') {
      // Remove deliveries where they are the recipient
      const { error } = await supabase
        .from('deliveries')
        .delete()
        .in('recipient_phone', phones);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    } else if (tab === 'businesses') {
      // Remove business accounts from customers table
      const { error } = await supabase
        .from('customers')
        .delete()
        .in('phone', phones)
        .eq('account_type', 'business');
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('delete customers error:', err);
    return NextResponse.json({ error: 'Failed to delete records' }, { status: 500 });
  }
}
