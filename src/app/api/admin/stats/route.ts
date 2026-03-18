import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const now = new Date();

    // Today boundaries
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // This week boundaries (Monday as week start)
    const weekStart = new Date(now);
    const dayOfWeek = weekStart.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    weekStart.setDate(weekStart.getDate() + diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    // This month boundaries
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const completedStatuses = ['delivered', 'confirmed'];
    const activeStatuses = ['pending', 'assigned', 'picked_up', 'in_transit'];

    // Total created today
    const { count: total_today } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    // Active deliveries (not completed)
    const { count: active } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .in('status', activeStatuses);

    // Completed deliveries
    const { count: completed } = await supabase
      .from('deliveries')
      .select('id', { count: 'exact', head: true })
      .in('status', completedStatuses);

    // Total revenue from completed deliveries
    const { data: revenueData } = await supabase
      .from('deliveries')
      .select('fee')
      .in('status', completedStatuses)
      .not('fee', 'is', null);

    const total_revenue = (revenueData || []).reduce((sum, d) => sum + (d.fee ?? 0), 0);

    // Revenue today
    const { data: revenueDailyData } = await supabase
      .from('deliveries')
      .select('fee')
      .in('status', completedStatuses)
      .not('fee', 'is', null)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const revenue_daily = (revenueDailyData || []).reduce((sum, d) => sum + (d.fee ?? 0), 0);

    // Revenue this week
    const { data: revenueWeeklyData } = await supabase
      .from('deliveries')
      .select('fee')
      .in('status', completedStatuses)
      .not('fee', 'is', null)
      .gte('created_at', weekStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    const revenue_weekly = (revenueWeeklyData || []).reduce((sum, d) => sum + (d.fee ?? 0), 0);

    // Revenue this month
    const { data: revenueMonthlyData } = await supabase
      .from('deliveries')
      .select('fee')
      .in('status', completedStatuses)
      .not('fee', 'is', null)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString());

    const revenue_monthly = (revenueMonthlyData || []).reduce((sum, d) => sum + (d.fee ?? 0), 0);

    // All deliveries for grouping by status
    const { data: allDeliveries } = await supabase
      .from('deliveries')
      .select('status, payment_method, fee')
      .in('status', completedStatuses)
      .not('fee', 'is', null);

    const { data: allStatuses } = await supabase
      .from('deliveries')
      .select('status');

    // Group by status
    const by_status: Record<string, number> = {};
    for (const row of allStatuses || []) {
      by_status[row.status] = (by_status[row.status] || 0) + 1;
    }

    // Group revenue by payment method (completed only)
    const by_payment: Record<string, number> = {};
    for (const row of allDeliveries || []) {
      if (row.payment_method && row.fee != null) {
        by_payment[row.payment_method] = (by_payment[row.payment_method] || 0) + row.fee;
      }
    }

    return NextResponse.json({
      total_today: total_today ?? 0,
      active: active ?? 0,
      completed: completed ?? 0,
      total_revenue,
      by_status,
      revenue_daily,
      revenue_weekly,
      revenue_monthly,
      by_payment,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
