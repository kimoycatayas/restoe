import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Order {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
}

interface RecentOrdersTableProps {
  orders: Order[];
  restaurantId: string;
  currency?: string;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "pending":
      return "outline";
    case "confirmed":
    case "preparing":
      return "secondary";
    case "ready":
    case "served":
      return "default";
    case "completed":
      return "default";
    case "cancelled":
      return "destructive";
    default:
      return "outline";
  }
};

const formatCurrency = (amount: number, currency: string = "$") => {
  // Simple formatting - if currency is a symbol, prepend it
  // Otherwise, assume it's a currency code and use Intl.NumberFormat
  if (currency.length === 1 || currency === "PHP") {
    // Single character symbol or PHP
    const symbol = currency === "PHP" ? "₱" : currency;
    return `${symbol}${amount.toFixed(2)}`;
  }
  
  // Use Intl.NumberFormat for currency codes
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid
    return `${currency}${amount.toFixed(2)}`;
  }
};

export function RecentOrdersTable({
  orders,
  restaurantId,
  currency = "$",
}: RecentOrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No orders today</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Time</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-medium">
                {order.id.slice(0, 8).toUpperCase()}
              </TableCell>
              <TableCell>
                <Badge variant={getStatusVariant(order.status)}>
                  {order.status}
                </Badge>
              </TableCell>
              <TableCell>{formatCurrency(order.total_amount, currency)}</TableCell>
              <TableCell>
                {new Date(order.created_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </TableCell>
              <TableCell className="text-right">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/r/${restaurantId}/orders/${order.id}`}>
                    Open
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
