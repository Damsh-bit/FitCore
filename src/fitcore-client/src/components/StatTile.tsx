import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type StatTileColor = "indigo" | "rose" | "emerald" | "amber" | "blue" | "purple" | "orange";

interface StatTileProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color: StatTileColor;
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

const COLOR_MAP: Record<StatTileColor, string> = {
  indigo: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  blue: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  purple: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  orange: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

/**
 * Fila compacta de una métrica — pensada para vivir dentro de un panel
 * único (ver Dashboard.tsx) en vez de ser cada una su propia tarjeta con
 * borde/sombra propios, que dejaba mucho espacio en blanco a la derecha
 * del valor cuando la columna era ancha.
 */
export default function StatTile({ icon: Icon, value, label, color, onClick, loading, className }: StatTileProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-2.5 px-3 py-2", className)}>
        <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
        <Skeleton className="h-2.5 flex-1 rounded" />
        <Skeleton className="h-4 w-10 rounded shrink-0" />
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 animate-fade-in-up",
        onClick && "cursor-pointer hover:bg-muted/80 transition-colors",
        className
      )}
    >
      <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", COLOR_MAP[color])}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide leading-tight flex-1 min-w-0">{label}</span>
      <span className="text-base font-black text-foreground shrink-0">{value}</span>
    </div>
  );
}
