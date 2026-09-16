import { cn } from "@/lib/utils";

type ChartTooltipPayloadEntry = {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
};

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string | number;
  formatter?: (value: number) => string;
  labelFormatter?: (label: string | number) => string;
  /** "line" para series de línea/área (traza corta), "rect" para barras (cuadrado). */
  variant?: "line" | "rect";
}

/**
 * Tooltip compartido para los gráficos de recharts de la app. El valor va
 * primero y en negrita (el lector ya tiene la serie, quiere el número); el
 * nombre de la serie queda como texto secundario, nunca coloreado — la
 * identidad la lleva la marca (línea o cuadrado) al lado, no el texto.
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  variant = "rect",
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-popover shadow-xl px-3 py-2 min-w-[120px] text-popover-foreground">
      {label != null && (
        <p className="text-[11px] font-bold text-foreground mb-1.5 pb-1.5 border-b border-border">
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? entry.name ?? i}`} className="flex items-center gap-2">
            {variant === "line" ? (
              <span className="h-0.5 w-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
            ) : (
              <span className="h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
            )}
            <span className="text-[11px] text-muted-foreground">{entry.name}</span>
            <span className={cn("text-xs font-black text-foreground ml-auto tabular-nums")}>
              {typeof entry.value === "number" && formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
