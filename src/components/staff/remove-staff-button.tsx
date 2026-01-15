"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { removeStaff } from "@/app/actions/staff";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface RemoveStaffButtonProps {
  restaurantId: string;
  restaurantUserId: string;
  userRole: "owner" | "staff" | "member";
}

export function RemoveStaffButton({
  restaurantId,
  restaurantUserId,
  userRole,
}: RemoveStaffButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleRemove() {
    if (!confirm("Are you sure you want to remove this staff member?")) {
      return;
    }

    setIsLoading(true);

    const result = await removeStaff(restaurantId, restaurantUserId);

    if (result.success) {
      toast.success("Staff member removed successfully");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to remove staff member");
    }

    setIsLoading(false);
  }

  // Don't show remove button for owners
  if (userRole === "owner") {
    return null;
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleRemove}
      disabled={isLoading}
    >
      <Trash2 className="h-4 w-4 mr-1" />
      Remove
    </Button>
  );
}
