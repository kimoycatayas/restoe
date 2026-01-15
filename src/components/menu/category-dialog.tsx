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

interface Category {
  id: string;
  name: string;
  description: string | null;
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  category: Category | null;
  onSuccess: () => void;
}

export function CategoryDialog({
  open,
  onOpenChange,
  restaurantId,
  category,
  onSuccess,
}: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description || "");
    } else {
      setName("");
      setDescription("");
    }
  }, [category, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      if (category) {
        // Update existing category
        const { error } = await supabase
          .from("menu_categories")
          .update({
            name: name.trim(),
            description: description.trim() || null,
          })
          .eq("id", category.id)
          .eq("restaurant_id", restaurantId);

        if (error) throw error;

        toast.success("Category updated successfully");
      } else {
        // Create new category
        // Get the max display_order for this restaurant
        const { data: maxOrderData } = await supabase
          .from("menu_categories")
          .select("display_order")
          .eq("restaurant_id", restaurantId)
          .order("display_order", { ascending: false })
          .limit(1)
          .single();

        const nextOrder = maxOrderData?.display_order
          ? maxOrderData.display_order + 1
          : 0;

        const { error } = await supabase.from("menu_categories").insert({
          restaurant_id: restaurantId,
          name: name.trim(),
          description: description.trim() || null,
          display_order: nextOrder,
          is_active: true,
        });

        if (error) throw error;

        toast.success("Category created successfully");
      }

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="select-none [&_input]:select-text [&_textarea]:select-text">
          <DialogHeader>
            <DialogTitle>
              {category ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {category
                ? "Update the category details below."
                : "Create a new menu category to organize your items."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium select-none">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Appetizers, Main Course"
                required
                disabled={loading}
                className="select-text"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium select-none">
                Description
              </label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                disabled={loading}
                className="select-text"
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
              {loading ? "Saving..." : category ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
