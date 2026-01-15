"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddOrderItemDialogProps {
  restaurantId: string;
  orderId: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
}

export function AddOrderItemDialog({
  restaurantId,
  orderId,
}: AddOrderItemDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [loading, setLoading] = useState(false);
  const [fetchingItems, setFetchingItems] = useState(false);

  // Fetch available menu items when dialog opens
  useEffect(() => {
    if (open) {
      fetchMenuItems();
    }
  }, [open, restaurantId]);

  const fetchMenuItems = async () => {
    setFetchingItems(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("id, name, price, is_available")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("name");

      if (error) throw error;

      setMenuItems(data || []);
      if (data && data.length > 0) {
        setSelectedMenuItemId(data[0].id);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch menu items");
    } finally {
      setFetchingItems(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMenuItemId) {
      toast.error("Please select a menu item");
      return;
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const selectedItem = menuItems.find((item) => item.id === selectedMenuItemId);
    if (!selectedItem) {
      toast.error("Selected menu item not found");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const subtotal = quantityNum * selectedItem.price;

      const { error } = await supabase.from("order_items").insert({
        order_id: orderId,
        menu_item_id: selectedMenuItemId,
        quantity: quantityNum,
        unit_price: selectedItem.price,
        subtotal: subtotal,
      });

      if (error) throw error;

      toast.success("Item added to order");
      setOpen(false);
      setQuantity("1");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to add item to order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add Item
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Add Item to Order</DialogTitle>
              <DialogDescription>
                Select a menu item and quantity to add to this order.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="menu-item" className="text-sm font-medium">
                  Menu Item <span className="text-destructive">*</span>
                </label>
                {fetchingItems ? (
                  <div className="text-sm text-muted-foreground">
                    Loading menu items...
                  </div>
                ) : menuItems.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No available menu items found
                  </div>
                ) : (
                  <select
                    id="menu-item"
                    value={selectedMenuItemId}
                    onChange={(e) => setSelectedMenuItemId(e.target.value)}
                    disabled={loading || fetchingItems}
                    className={cn(
                      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                      "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
                      "placeholder:text-muted-foreground",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                    required
                  >
                    <option value="">Select a menu item</option>
                    {menuItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} - ${item.price.toFixed(2)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-2">
                <label htmlFor="quantity" className="text-sm font-medium">
                  Quantity <span className="text-destructive">*</span>
                </label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  required
                  disabled={loading || fetchingItems}
                />
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
              <Button type="submit" disabled={loading || fetchingItems || menuItems.length === 0}>
                {loading ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
