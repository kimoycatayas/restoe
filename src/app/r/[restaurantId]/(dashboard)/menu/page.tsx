import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { MenuView } from "@/components/menu/menu-view";

interface MenuPageProps {
  params: Promise<{ restaurantId: string }>;
  searchParams: Promise<{ categoryId?: string }>;
}

export default async function MenuPage({
  params,
  searchParams,
}: MenuPageProps) {
  const { restaurantId } = await params;
  const { categoryId } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch categories for this restaurant
  const { data: categories, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  }

  // Fetch all items for this restaurant (we'll filter by category in the client)
  const { data: items, error: itemsError } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (itemsError) {
    console.error("Error fetching items:", itemsError);
  }

  const categoriesList = categories || [];
  const itemsList = items || [];

  // Determine selected category
  // If categoryId is provided and exists, use it. Otherwise, use first category.
  const selectedCategoryId =
    categoryId && categoriesList.some((c) => c.id === categoryId)
      ? categoryId
      : categoriesList[0]?.id || null;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Menu</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your restaurant menu categories and items
        </p>
      </div>

      <MenuView
        restaurantId={restaurantId}
        categories={categoriesList}
        items={itemsList}
        selectedCategoryId={selectedCategoryId}
      />
    </div>
  );
}
