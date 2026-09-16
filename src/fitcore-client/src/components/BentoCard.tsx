import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export default function BentoCard({ children, className, delay = 0 }: BentoCardProps) {
  return (
    <div
      className={cn(
        "bg-card/80 backdrop-blur-xl border border-border/60 rounded-[var(--radius)] p-6 group relative shadow-sm",
        "animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both",
        "min-h-0",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative z-10 h-full w-full flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}
