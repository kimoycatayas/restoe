"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Utensils,
  Table as TableIcon,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
}

const navigation = [
  { name: "Dashboard", path: "", icon: LayoutDashboard },
  { name: "Orders", path: "orders", icon: ShoppingCart },
  { name: "Menu", path: "menu", icon: Utensils },
  { name: "Tables", path: "tables", icon: TableIcon },
  { name: "Staff", path: "staff", icon: Users },
];

export function MobileSidebar({
  open,
  onOpenChange,
  restaurantId,
}: MobileSidebarProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="border-b p-6">
          <SheetTitle className="text-xl font-semibold">Restoe</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 space-y-1 p-4">
          {navigation.map((item) => {
            const Icon = item.icon;
            const href = `/r/${restaurantId}${item.path ? `/${item.path}` : ""}`;
            const isActive = pathname === href;
            return (
              <Link
                key={item.name}
                href={href}
                onClick={() => onOpenChange(false)}
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
      </SheetContent>
    </Sheet>
  );
}
