import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background min-w-0">
        <div key={location.pathname} className="p-4 pt-20 md:p-8 md:pr-14 h-full page-transition">
          {children}
        </div>
      </main>

      {/* Theme toggle — fixed top-right */}
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
              className="fixed top-4 right-4 z-50 h-9 w-9 rounded-xl bg-card border border-border shadow-md
                         flex items-center justify-center text-muted-foreground
                         hover:bg-muted hover:text-foreground hover:shadow-lg
                         transition-all duration-200"
            >
              <span
                key={isDark ? "moon" : "sun"}
                className="flex items-center justify-center animate-in spin-in-90 fade-in-0 duration-300"
              >
                {isDark
                  ? <Sun className="h-4 w-4" />
                  : <Moon className="h-4 w-4" />
                }
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isDark ? "Modo claro" : "Modo oscuro"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
