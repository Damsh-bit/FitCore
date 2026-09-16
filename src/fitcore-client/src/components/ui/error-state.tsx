import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ErrorState({
  message = "Ocurrió un error al cargar los datos.",
  onRetry,
  compact = false,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3", className)}>
        <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
        <p className="text-xs font-semibold text-rose-600 dark:text-rose-300 flex-1">{message}</p>
        {onRetry && (
          <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs h-7 shrink-0" onClick={onRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reintentar
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}>
      <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <p className="text-sm text-muted-foreground font-medium max-w-xs">{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Reintentar
        </Button>
      )}
    </div>
  );
}
