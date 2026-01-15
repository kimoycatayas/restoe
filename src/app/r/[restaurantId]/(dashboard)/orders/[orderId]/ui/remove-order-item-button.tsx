"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface RemoveOrderItemButtonProps {
  restaurantId: string;
  orderId: string;
  itemId: string;
}

export function RemoveOrderItemButton({
  restaurantId,
  orderId,
  itemId,
}: RemoveOrderItemButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove this item from the order?")) {
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("order_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;

      toast.success("Item removed from order");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to remove item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleRemove}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
