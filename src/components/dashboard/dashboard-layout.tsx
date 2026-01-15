"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { Header } from "./header";

interface Restaurant {
  id: string;
  name: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  currentRestaurant: Restaurant;
  restaurants: Restaurant[];
  userRole: "owner" | "staff" | "member" | null;
}

export function DashboardLayout({
  children,
  currentRestaurant,
  restaurants,
  userRole,
}: DashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <Header
        onMenuClick={() => setMobileMenuOpen(true)}
        currentRestaurant={currentRestaurant}
        restaurants={restaurants}
      />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block">
          <Sidebar restaurantId={currentRestaurant.id} userRole={userRole} />
        </aside>
        <MobileSidebar
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
          restaurantId={currentRestaurant.id}
          userRole={userRole}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
