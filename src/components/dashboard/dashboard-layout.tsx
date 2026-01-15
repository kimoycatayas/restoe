"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { MobileSidebar } from "./mobile-sidebar";
import { Header } from "./header";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col">
      <Header onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block">
          <Sidebar />
        </aside>
        <MobileSidebar
          open={mobileMenuOpen}
          onOpenChange={setMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
