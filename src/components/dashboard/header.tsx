"use client";

import { usePathname, useRouter } from "next/navigation";
import { Menu, User, Store, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface Restaurant {
  id: string;
  name: string;
}

interface HeaderProps {
  onMenuClick: () => void;
  currentRestaurant: Restaurant;
  restaurants: Restaurant[];
}

export function Header({
  onMenuClick,
  currentRestaurant,
  restaurants,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleRestaurantChange = (restaurantId: string) => {
    // Extract the current sub-route (e.g., menu, orders, etc.)
    // Path format: /r/[restaurantId] or /r/[restaurantId]/[subRoute]
    const pathParts = pathname.split("/").filter(Boolean);
    
    // Path should be: ['r', restaurantId, subRoute?]
    if (pathParts.length >= 3 && pathParts[0] === "r") {
      const subRoute = pathParts[2]; // menu, orders, etc.
      // Preserve the sub-route when switching restaurants
      router.push(`/r/${restaurantId}/${subRoute}`);
    } else {
      // Navigate to the restaurant root dashboard
      router.push(`/r/${restaurantId}`);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Restoe</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Store className="h-4 w-4" />
              <span className="font-medium">{currentRestaurant.name}</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Switch Restaurant</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {restaurants.map((restaurant) => (
              <DropdownMenuItem
                key={restaurant.id}
                onClick={() => handleRestaurantChange(restaurant.id)}
                className="flex items-center justify-between"
              >
                <span>{restaurant.name}</span>
                {restaurant.id === currentRestaurant.id && (
                  <Check className="h-4 w-4" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
