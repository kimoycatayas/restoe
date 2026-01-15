import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { KitchenBoard } from "@/components/kitchen/kitchen-board";

interface KitchenPageProps {
  params: Promise<{ restaurantId: string }>;
}

export default async function KitchenPage({ params }: KitchenPageProps) {
  const { restaurantId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch active orders (exclude completed and cancelled)
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("id, status, created_at, notes")
    .eq("restaurant_id", restaurantId)
    .in("status", ["confirmed", "preparing", "ready", "served"])
    .order("created_at", { ascending: true });

  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  }

  const ordersList = orders || [];

  // Fetch order items for all orders
  const orderIds = ordersList.map((order) => order.id);
  let itemsList: any[] = [];
  
  if (orderIds.length > 0) {
    const { data: orderItems, error: itemsError } = await supabase
      .from("order_items")
      .select(
        `
        order_id,
        quantity,
        notes,
        menu_items (
          name
        )
      `
      )
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("Error fetching order items:", itemsError);
    } else {
      itemsList = orderItems || [];
    }
  }


  // Group items by order_id
  const itemsByOrderId = itemsList.reduce(
    (acc, item) => {
      const orderId = item.order_id;
      if (!acc[orderId]) {
        acc[orderId] = [];
      }
      acc[orderId].push({
        name: (item.menu_items as any)?.name || "Unknown Item",
        quantity: item.quantity,
        notes: item.notes,
      });
      return acc;
    },
    {} as Record<string, Array<{ name: string; quantity: number; notes: string | null }>>
  );

  // Combine orders with their items
  const ordersWithItems = ordersList.map((order) => ({
    id: order.id,
    status: order.status,
    created_at: order.created_at,
    notes: order.notes,
    items: itemsByOrderId[order.id] || [],
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Kitchen View</h1>
        <p className="mt-2 text-muted-foreground">
          Manage active orders in the kitchen
        </p>
      </div>
      <KitchenBoard
        restaurantId={restaurantId}
        initialOrders={ordersWithItems}
      />
    </div>
  );
}
