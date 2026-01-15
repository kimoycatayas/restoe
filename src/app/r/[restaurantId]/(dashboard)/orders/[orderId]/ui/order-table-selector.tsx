"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";

interface Table {
  id: string;
  name: string;
}

interface OrderTableSelectorProps {
  restaurantId: string;
  orderId: string;
  tables: Table[];
  currentTableId: string | null;
}

export function OrderTableSelector({
  restaurantId,
  orderId,
  tables,
  currentTableId,
}: OrderTableSelectorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const currentTable = tables.find((t) => t.id === currentTableId);

  const handleTableChange = async (tableId: string | null) => {
    if (tableId === currentTableId) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("orders")
        .update({ table_id: tableId })
        .eq("id", orderId)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      toast.success("Table assigned");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={loading}>
          <TableIcon className="mr-2 h-4 w-4" />
          {currentTable ? currentTable.name : "No table"}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => handleTableChange(null)}
          disabled={loading || currentTableId === null}
        >
          No table
        </DropdownMenuItem>
        {tables.map((table) => (
          <DropdownMenuItem
            key={table.id}
            onClick={() => handleTableChange(table.id)}
            disabled={loading || table.id === currentTableId}
          >
            {table.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
