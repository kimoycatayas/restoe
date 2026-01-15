import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

interface DashboardGroupLayoutProps {
  children: React.ReactNode;
  params: Promise<{ restaurantId: string }>;
}

export default async function DashboardGroupLayout({
  children,
  params,
}: DashboardGroupLayoutProps) {
  const { restaurantId } = await params;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // Fetch authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all restaurant_ids from restaurant_users for this user
  const { data: memberships, error: membershipsError } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id);

  if (membershipsError || !memberships || memberships.length === 0) {
    redirect("/create-restaurant");
  }

  const userRestaurantIds = memberships.map((m) => m.restaurant_id);

  // Validate that params.restaurantId exists in that list
  const isValidRestaurant = userRestaurantIds.includes(restaurantId);

  if (!isValidRestaurant) {
    // If user has restaurants → redirect to /r/<firstRestaurantId>
    // Else → redirect("/create-restaurant")
    if (userRestaurantIds.length > 0) {
      redirect(`/r/${userRestaurantIds[0]}`);
    } else {
      redirect("/create-restaurant");
    }
  }

  // Fetch current restaurant details (id, name)
  const { data: currentRestaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .single();

  if (restaurantError || !currentRestaurant) {
    // If restaurant doesn't exist, redirect to first available
    if (userRestaurantIds.length > 0) {
      redirect(`/r/${userRestaurantIds[0]}`);
    } else {
      redirect("/create-restaurant");
    }
  }

  // Fetch list of all user restaurants (id, name)
  const { data: restaurants, error: restaurantsError } = await supabase
    .from("restaurants")
    .select("id, name")
    .in("id", userRestaurantIds)
    .order("name");

  const restaurantList = restaurants || [];

  // Get current user's role for this restaurant
  const { data: userRole } = await supabase
    .from("restaurant_users")
    .select("role")
    .eq("restaurant_id", restaurantId)
    .eq("user_id", user.id)
    .single();

  const currentUserRole = (userRole?.role as "owner" | "staff" | "member") || null;

  return (
    <DashboardLayout
      currentRestaurant={currentRestaurant}
      restaurants={restaurantList}
      userRole={currentUserRole}
    >
      {children}
    </DashboardLayout>
  );
}
