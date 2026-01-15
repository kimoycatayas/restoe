"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChefHat,
  RefreshCw,
  ArrowRight,
  MoreHorizontal,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

interface OrderItem {
  name: string;
  quantity: number;
  notes: string | null;
}

interface Order {
  id: string;
  status: string;
  created_at: string;
  notes: string | null;
  items: OrderItem[];
}

interface KitchenBoardProps {
  restaurantId: string;
  initialOrders: Order[];
}

const STATUSES = ["confirmed", "preparing", "ready", "served"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_LABELS: Record<Status, string> = {
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
};

const NEXT_STATUS: Record<Status, Status | "completed"> = {
  confirmed: "preparing",
  preparing: "ready",
  ready: "served",
  served: "completed",
};

export function KitchenBoard({
  restaurantId,
  initialOrders,
}: KitchenBoardProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      router.refresh();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, router]);

  // Update orders when initialOrders changes (from router.refresh)
  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const updateOrderStatus = async (
    orderId: string,
    newStatus: string
  ): Promise<void> => {
    setLoading((prev) => ({ ...prev, [orderId]: true }));
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      toast.success("Order status updated");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order status");
    } finally {
      setLoading((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  const handleNextStatus = (order: Order) => {
    const currentStatus = order.status as Status;
    const nextStatus = NEXT_STATUS[currentStatus];
    if (nextStatus) {
      updateOrderStatus(order.id, nextStatus);
    }
  };

  const handleCancel = (order: Order) => {
    if (confirm("Are you sure you want to cancel this order?")) {
      updateOrderStatus(order.id, "cancelled");
    }
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getOrdersByStatus = (status: Status): Order[] => {
    return orders.filter((order) => order.status === status);
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {orders.length} active order{orders.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto-refresh: {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATUSES.map((status) => {
          const statusOrders = getOrdersByStatus(status);
          return (
            <div key={status} className="flex flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wide">
                  {STATUS_LABELS[status]}
                </h3>
                <Badge variant="outline" className="ml-2">
                  {statusOrders.length}
                </Badge>
              </div>
              <div className="flex-1 space-y-3 min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto rounded-lg border bg-muted/20 p-3">
                {statusOrders.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                    No orders
                  </div>
                ) : (
                  statusOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onNextStatus={() => handleNextStatus(order)}
                      onCancel={() => handleCancel(order)}
                      isLoading={loading[order.id] || false}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface OrderCardProps {
  order: Order;
  onNextStatus: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

function OrderCard({
  order,
  onNextStatus,
  onCancel,
  isLoading,
}: OrderCardProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const currentStatus = order.status as Status;
  const nextStatus = NEXT_STATUS[currentStatus];

  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Order Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="font-semibold text-sm">
            #{order.id.slice(0, 8).toUpperCase()}
          </div>
          <div className="text-xs text-muted-foreground">
            {formatTime(order.created_at)}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onCancel} className="text-destructive">
              <XCircle className="h-4 w-4 mr-2" />
              Cancel Order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Items List */}
      <div className="mb-3 space-y-1">
        {order.items.map((item, idx) => (
          <div key={idx} className="text-sm">
            <span className="font-medium">{item.quantity}x</span>{" "}
            <span>{item.name}</span>
            {item.notes && (
              <div className="text-xs text-muted-foreground italic mt-0.5">
                Note: {item.notes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Order Notes */}
      {order.notes && (
        <div className="mb-3 rounded bg-muted p-2 text-xs">
          <div className="font-medium mb-1">Order Note:</div>
          <div className="text-muted-foreground">{order.notes}</div>
        </div>
      )}

      {/* Action Button */}
      {nextStatus && (
        <Button
          onClick={onNextStatus}
          disabled={isLoading}
          className="w-full"
          size="sm"
        >
          {isLoading ? (
            "Updating..."
          ) : (
            <>
              Move to {STATUS_LABELS[nextStatus as Status] || "Completed"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
