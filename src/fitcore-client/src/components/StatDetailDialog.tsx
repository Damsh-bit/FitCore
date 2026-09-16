import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import PersonaAvatar from "@/components/ui/persona-avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export type DetailRowVariant = "default" | "success" | "warning" | "danger" | "muted";

export type DetailRow = {
  id: string | number;
  title: string;
  subtitle?: string;
  right?: string;
  rightVariant?: DetailRowVariant;
  /** Seed para el avatar cuando `id` no es el id real del cliente (ej. id de un pago o una asistencia) — por defecto usa `id`. */
  avatarSeed?: string;
};

interface StatDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  rows: DetailRow[];
  loading?: boolean;
  emptyText?: string;
  navigateTo?: string;
  navigateLabel?: string;
}

const VARIANT_CLASS: Record<DetailRowVariant, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500 text-white",
  danger: "bg-rose-500 text-white",
  muted: "bg-transparent text-muted-foreground",
};

export default function StatDetailDialog({
  open,
  onOpenChange,
  title,
  description,
  rows,
  loading,
  emptyText = "Sin registros",
  navigateTo,
  navigateLabel = "Ver todo",
}: StatDetailDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="mt-2 divide-y divide-border max-h-[60vh] overflow-y-auto">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-3.5 w-32 rounded" />
                </div>
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            ))
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{emptyText}</p>
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="flex items-center justify-between py-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <PersonaAvatar seed={row.avatarSeed ?? String(row.id)} size={28} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{row.title}</p>
                    {row.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{row.subtitle}</p>
                    )}
                  </div>
                </div>
                {row.right && (
                  <span
                    className={cn(
                      "text-[10px] font-black uppercase shrink-0 ml-2 px-2 py-1 rounded-md",
                      VARIANT_CLASS[row.rightVariant ?? "default"]
                    )}
                  >
                    {row.right}
                  </span>
                )}
              </div>
            ))
          )}
        </div>

        {navigateTo && (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            onClick={() => {
              onOpenChange(false);
              navigate(navigateTo);
            }}
          >
            {navigateLabel}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
