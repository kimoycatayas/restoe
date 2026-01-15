"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Utensils,
  Table as TableIcon,
  Users,
  ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  restaurantId: string;
  userRole: "owner" | "staff" | "member" | null;
}

type NavigationItem = {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  ownerOnly?: boolean;
};

const navigation: NavigationItem[] = [
  { name: "Dashboard", path: "", icon: LayoutDashboard },
  { name: "Orders", path: "orders", icon: ShoppingCart },
  { name: "Kitchen", path: "kitchen", icon: ChefHat },
  { name: "Menu", path: "menu", icon: Utensils },
  { name: "Tables", path: "tables", icon: TableIcon },
  { name: "Staff", path: "staff", icon: Users, ownerOnly: true },
];

export function Sidebar({ restaurantId, userRole }: SidebarProps) {
  const pathname = usePathname();

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(
    (item) => !item.ownerOnly || userRole === "owner"
  );

  return (
    <div className="flex h-full w-64 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-semibold">Restoe</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const href = `/r/${restaurantId}${item.path ? `/${item.path}` : ""}`;
          const isActive = pathname === href;
          return (
            <Link
              key={item.name}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
