import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentOrdersTable } from "@/components/dashboard/recent-orders-table";
import {
  DollarSign,
  ShoppingCart,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";

interface DashboardPageProps {
  params: Promise<{ restaurantId: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { restaurantId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Get today's date range (start and end of day in local time)
  const today = new Date();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  // Fetch restaurant to get currency from settings
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("settings")
    .eq("id", restaurantId)
    .single();

  // Extract currency from settings, default to "$" or "PHP"
  const currency =
    (restaurant?.settings as { currency?: string })?.currency || "$";

  // Fetch all orders for today to calculate metrics
  const { data: allOrdersToday, error: ordersError } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", tomorrow.toISOString());

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  }

  const orders = allOrdersToday || [];

  // Calculate metrics
  const totalSalesToday = orders
    .filter((order) => order.status === "completed")
    .reduce((sum, order) => sum + Number(order.total_amount || 0), 0);

  const ordersTodayCount = orders.length;

  const completedCount = orders.filter(
    (order) => order.status === "completed"
  ).length;

  const cancelledCount = orders.filter(
    (order) => order.status === "cancelled"
  ).length;

  const avgOrderValue =
    completedCount > 0 ? totalSalesToday / completedCount : 0;

  // Fetch latest 10 orders (today's orders, ordered by created_at desc)
  const { data: latestOrders, error: latestOrdersError } = await supabase
    .from("orders")
    .select("id, status, total_amount, created_at")
    .eq("restaurant_id", restaurantId)
    .gte("created_at", startOfDay.toISOString())
    .lt("created_at", tomorrow.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  if (latestOrdersError) {
    console.error("Error fetching latest orders:", latestOrdersError);
  }

  // Format currency helper
  const formatCurrency = (amount: number) => {
    if (currency.length === 1 || currency === "PHP") {
      const symbol = currency === "PHP" ? "₱" : currency;
      return `${symbol}${amount.toFixed(2)}`;
    }
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount);
    } catch {
      return `${currency}${amount.toFixed(2)}`;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Today at a glance</p>
      </div>

      {/* Metrics Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Today's Sales"
          value={formatCurrency(totalSalesToday)}
          icon={DollarSign}
        />
        <MetricCard
          label="Orders Today"
          value={ordersTodayCount}
          icon={ShoppingCart}
        />
        <MetricCard
          label="Completed"
          value={completedCount}
          icon={CheckCircle2}
        />
        <MetricCard
          label="Cancelled"
          value={cancelledCount}
          icon={XCircle}
        />
      </div>

      {/* Optional: Average Order Value */}
      {completedCount > 0 && (
        <div className="mb-8">
          <MetricCard
            label="Avg Order Value"
            value={formatCurrency(avgOrderValue)}
            icon={TrendingUp}
            className="max-w-xs"
          />
        </div>
      )}

      {/* Recent Orders */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Orders</h2>
        <RecentOrdersTable
          orders={latestOrders || []}
          restaurantId={restaurantId}
          currency={currency}
        />
      </div>
    </div>
  );
}
