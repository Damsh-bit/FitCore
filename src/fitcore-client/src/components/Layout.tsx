import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background min-w-0">
        <div key={location.pathname} className="p-4 pt-20 md:p-8 h-full page-transition">
          {children}
        </div>
      </main>
    </div>
  );
}
