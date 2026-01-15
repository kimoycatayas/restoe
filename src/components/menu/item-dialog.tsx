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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
}

interface ItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  categories: Category[];
  item: MenuItem | null;
  onSuccess: () => void;
}

export function ItemDialog({
  open,
  onOpenChange,
  restaurantId,
  categories,
  item,
  onSuccess,
}: ItemDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setDescription(item.description || "");
      setPrice(item.price.toString());
      setCategoryId(item.category_id || "");
    } else {
      setName("");
      setDescription("");
      setPrice("");
      setCategoryId(categories[0]?.id || "");
    }
  }, [item, categories, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!categoryId) {
      toast.error("Category is required");
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Price must be a valid number >= 0");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (item) {
        // Update existing item
        const { error } = await supabase
          .from("menu_items")
          .update({
            name: name.trim(),
            description: description.trim() || null,
            price: priceNum,
            category_id: categoryId,
          })
          .eq("id", item.id)
          .eq("restaurant_id", restaurantId);

        if (error) throw error;

        toast.success("Item updated successfully");
      } else {
        // Create new item
        // Get the max display_order for this restaurant/category
        const { data: maxOrderData } = await supabase
          .from("menu_items")
          .select("display_order")
          .eq("restaurant_id", restaurantId)
          .eq("category_id", categoryId)
          .order("display_order", { ascending: false })
          .limit(1)
          .single();

        const nextOrder = maxOrderData?.display_order
          ? maxOrderData.display_order + 1
          : 0;

        const { error } = await supabase.from("menu_items").insert({
          restaurant_id: restaurantId,
          category_id: categoryId,
          name: name.trim(),
          description: description.trim() || null,
          price: priceNum,
          display_order: nextOrder,
          is_available: true,
        });

        if (error) throw error;

        toast.success("Item created successfully");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{item ? "Edit Item" : "Add Item"}</DialogTitle>
            <DialogDescription>
              {item
                ? "Update the item details below."
                : "Create a new menu item to add to your menu."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="item-name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="item-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Grilled Chicken"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="item-category" className="text-sm font-medium">
                Category <span className="text-destructive">*</span>
              </label>
              <select
                id="item-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
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
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="item-price" className="text-sm font-medium">
                Price <span className="text-destructive">*</span>
              </label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="item-description" className="text-sm font-medium">
                Description
              </label>
              <Input
                id="item-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : item ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
