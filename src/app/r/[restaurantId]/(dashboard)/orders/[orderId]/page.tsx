import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddOrderItemDialog } from "./ui/add-order-item-dialog";
import { OrderStatusDropdown } from "./ui/order-status-dropdown";
import { RemoveOrderItemButton } from "./ui/remove-order-item-button";
import { OrderTableSelector } from "./ui/order-table-selector";

interface OrderDetailsPageProps {
  params: Promise<{ restaurantId: string; orderId: string }>;
}

export default async function OrderDetailsPage({
  params,
}: OrderDetailsPageProps) {
  const { restaurantId, orderId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Validate the order belongs to this restaurant
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (orderError || !order) {
    notFound();
  }

  // Fetch tables for this restaurant
  const { data: tables, error: tablesError } = await supabase
    .from("tables")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .order("name", { ascending: true });

  if (tablesError) {
    console.error("Error fetching tables:", tablesError);
  }

  const tablesList = tables || [];

  // Fetch order items with menu item names
  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select(
      `
      *,
      menu_items (
        id,
        name
      )
    `
    )
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("Error fetching order items:", itemsError);
  }

  const itemsList = orderItems || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Order</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {orderId.slice(0, 8).toUpperCase()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrderTableSelector
              restaurantId={restaurantId}
              orderId={orderId}
              tables={tablesList}
              currentTableId={order.table_id}
            />
            <OrderStatusDropdown
              restaurantId={restaurantId}
              orderId={orderId}
              currentStatus={order.status}
            />
            <Badge variant="outline" className="text-lg px-4 py-2">
              Total: {formatCurrency(order.total_amount)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <AddOrderItemDialog
          restaurantId={restaurantId}
          orderId={orderId}
        />
      </div>

      {itemsList.length === 0 ? (
        <div className="rounded-lg border p-8 text-center">
          <p className="text-muted-foreground">No items in this order</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add items to get started
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Price</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemsList.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    {(item.menu_items as any)?.name || "Unknown Item"}
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell>{formatCurrency(item.subtotal)}</TableCell>
                  <TableCell className="text-right">
                    <RemoveOrderItemButton
                      restaurantId={restaurantId}
                      orderId={orderId}
                      itemId={item.id}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
