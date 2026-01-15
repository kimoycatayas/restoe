"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Pencil, MoreHorizontal, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { CategoryDialog } from "./category-dialog";
import { ItemDialog } from "./item-dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  display_order: number;
}

interface MenuViewProps {
  restaurantId: string;
  categories: Category[];
  items: MenuItem[];
  selectedCategoryId: string | null;
}

export function MenuView({
  restaurantId,
  categories,
  items,
  selectedCategoryId,
}: MenuViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Filter items by selected category
  const filteredItems = selectedCategoryId
    ? items.filter((item) => item.category_id === selectedCategoryId)
    : [];

  const handleCategoryClick = (categoryId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("categoryId", categoryId);
    router.push(`?${params.toString()}`);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setItemDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemDialogOpen(true);
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);

    if (error) {
      toast.error("Failed to update availability");
    } else {
      toast.success(
        `Item ${!item.is_available ? "enabled" : "disabled"} successfully`
      );
      router.refresh();
    }
  };

  return (
    <div className="flex gap-6">
      {/* Categories Sidebar */}
      <div className="w-64 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Categories</h2>
          <Button
            size="icon"
            variant="outline"
            onClick={handleAddCategory}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No categories yet
            </p>
            <Button onClick={handleAddCategory} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </div>
        ) : (
          <div className="space-y-1 border rounded-lg p-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  selectedCategoryId === category.id
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Items List */}
      <div className="flex-1">
        {!selectedCategoryId ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-muted-foreground">
              {categories.length === 0
                ? "Create a category to get started"
                : "Select a category to view items"}
            </p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="border rounded-lg p-12 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              No items in this category
            </p>
            <Button onClick={handleAddItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {categories.find((c) => c.id === selectedCategoryId)?.name}{" "}
                Items
              </h2>
              <Button onClick={handleAddItem} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(item.price).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={item.is_available ? "default" : "secondary"}
                        >
                          {item.is_available ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Available
                            </>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Unavailable
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditItem(item)}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleAvailability(item)}
                            >
                              {item.is_available ? (
                                <>
                                  <X className="h-4 w-4 mr-2" />
                                  Mark Unavailable
                                </>
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark Available
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        restaurantId={restaurantId}
        category={editingCategory}
        onSuccess={() => {
          router.refresh();
        }}
      />

      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        restaurantId={restaurantId}
        categories={categories}
        item={editingItem}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
