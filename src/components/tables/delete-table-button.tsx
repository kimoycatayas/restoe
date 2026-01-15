"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteTableButtonProps {
  restaurantId: string;
  tableId: string;
  tableName: string;
}

export function DeleteTableButton({
  restaurantId,
  tableId,
  tableName,
}: DeleteTableButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${tableName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", tableId)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      toast.success("Table deleted successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={loading}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
