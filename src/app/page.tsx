import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export default async function HomePage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all restaurant_ids from restaurant_users for this user
  const { data: memberships, error } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id);

  // If error or no memberships, redirect to create restaurant
  if (error || !memberships || memberships.length === 0) {
    redirect("/create-restaurant");
  }

  // Redirect to the first restaurant
  redirect(`/r/${memberships[0].restaurant_id}`);
}
