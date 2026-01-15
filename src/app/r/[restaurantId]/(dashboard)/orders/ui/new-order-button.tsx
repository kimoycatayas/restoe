"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface NewOrderButtonProps {
  restaurantId: string;
}

export function NewOrderButton({ restaurantId }: NewOrderButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCreateOrder = async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to create an order");
        return;
      }

      // Create new order
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          status: "pending",
          total_amount: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Order created successfully");
      router.push(`/r/${restaurantId}/orders/${order.id}`);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCreateOrder} disabled={loading}>
      <Plus className="h-4 w-4" />
      {loading ? "Creating..." : "New Order"}
    </Button>
  );
}
