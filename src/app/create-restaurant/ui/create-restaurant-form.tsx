"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function CreateRestaurantForm() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("PHP");
  const [address, setAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage("Please enter a restaurant name.");
      return;
    }

    setIsLoading(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "You must be logged in to create a restaurant. Please sign in and try again."
        );
        return;
      }

      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .insert({
          name: name.trim(),
          currency: currency.trim() || "PHP",
          address: address.trim() || null,
        })
        .select("id")
        .single();

      if (restaurantError || !restaurant) {
        setErrorMessage(
          "We couldn't create your restaurant. Please try again in a moment."
        );
        return;
      }

      const { error: membershipError } = await supabase
        .from("restaurant_users")
        .insert({
          restaurant_id: restaurant.id,
          user_id: user.id,
          role: "owner",
        });

      if (membershipError) {
        setErrorMessage(
          "Your restaurant was created, but we couldn't link it to your account. Please contact support."
        );
        return;
      }

      // Redirect to the new restaurant dashboard
      router.push(`/r/${restaurant.id}`);
      router.refresh();
    } catch {
      setErrorMessage(
        "Something went wrong while creating your restaurant. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="restaurant-name">
          Restaurant name
        </label>
        <Input
          id="restaurant-name"
          placeholder="e.g. Restoe Bistro"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="currency">
          Currency
        </label>
        <Input
          id="currency"
          placeholder="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium" htmlFor="address">
          Address{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (optional)
          </span>
        </label>
        <Input
          id="address"
          placeholder="Street, city, country"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? "Creating..." : "Create restaurant"}
      </Button>
    </form>
  );
}
