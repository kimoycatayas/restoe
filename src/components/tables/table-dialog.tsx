"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface Table {
  id: string;
  restaurant_id: string;
  name: string;
  capacity: number;
  status: string;
}

interface TableDialogProps {
  restaurantId: string;
  table?: Table | null;
  trigger?: React.ReactNode;
}

export function TableDialog({
  restaurantId,
  table,
  trigger,
}: TableDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [status, setStatus] = useState("available");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (table) {
      setName(table.name);
      setCapacity(table.capacity.toString());
      setStatus(table.status);
    } else {
      setName("");
      setCapacity("");
      setStatus("available");
    }
  }, [table, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      toast.error("Capacity must be a valid number greater than 0");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (table) {
        // Update existing table
        const { error } = await supabase
          .from("tables")
          .update({
            name: name.trim(),
            capacity: capacityNum,
            status: status,
          })
          .eq("id", table.id)
          .eq("restaurant_id", restaurantId);

        if (error) throw error;

        toast.success("Table updated successfully");
      } else {
        // Create new table
        const { error } = await supabase.from("tables").insert({
          restaurant_id: restaurantId,
          name: name.trim(),
          capacity: capacityNum,
          status: status,
        });

        if (error) throw error;

        toast.success("Table created successfully");
      }

      setOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to save table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Table
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{table ? "Edit Table" : "Add Table"}</DialogTitle>
            <DialogDescription>
              {table
                ? "Update the table details below."
                : "Create a new table for your restaurant."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="table-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="table-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Table 1, VIP Booth"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="table-capacity" className="text-sm font-medium">
                Capacity <span className="text-destructive">*</span>
              </label>
              <Input
                id="table-capacity"
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="e.g., 4"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="table-status" className="text-sm font-medium">
                Status <span className="text-destructive">*</span>
              </label>
              <select
                id="table-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
                className={cn(
                  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
                  "placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
                required
              >
                <option value="available">Available</option>
                <option value="occupied">Occupied</option>
                <option value="reserved">Reserved</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : table ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
