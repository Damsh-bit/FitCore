import { useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Maximize2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import BentoCard from "./BentoCard";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import StatDetailDialog, { type DetailRow } from "./StatDetailDialog";
import ChartTooltip from "./charts/ChartTooltip";

type SerieItem = {
  dia: string;
  fecha: string;
  monto: number;
};

function formatMonto(n: number): string {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

interface PaymentsGraphBentoCardProps {
  className?: string;
  delay?: number;
  serie?: SerieItem[];
  totalSemana?: number;
  totalSemanaFormatted?: string;
  porcentajeCrecimiento?: number;
  loading?: boolean;
}

export default function PaymentsGraphBentoCard({
  className,
  delay,
  serie = [],
  totalSemana = 0,
  totalSemanaFormatted,
  porcentajeCrecimiento = 0,
  loading,
}: PaymentsGraphBentoCardProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (loading) {
    return (
      <BentoCard className={cn("flex flex-col !p-3", className)} delay={delay}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-3.5 w-16 rounded" />
              <Skeleton className="h-2.5 w-20 rounded" />
            </div>
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="lg:flex-1 flex flex-col justify-end mt-2">
          <div className="mb-3 space-y-1.5">
            <Skeleton className="h-7 w-28 rounded" />
            <Skeleton className="h-2.5 w-32 rounded" />
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      </BentoCard>
    );
  }

  const isPositive = porcentajeCrecimiento >= 0;

  const rows: DetailRow[] = [...serie].reverse().map((s, idx) => ({
    id: idx,
    title: new Date(s.fecha + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "2-digit" }),
    right: formatMonto(s.monto),
    rightVariant: s.monto > 0 ? ("success" as const) : ("muted" as const),
  }));

  return (
    <BentoCard className={cn("flex flex-col !p-3", className)} delay={delay}>
      <div
        className="flex items-center justify-between mb-1 cursor-pointer group"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">Ingresos</h3>
            <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Últimos 7 días</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-full border",
            isPositive ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
          )}>
            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span className="text-[10px] font-black">{isPositive ? `+${porcentajeCrecimiento}%` : `${porcentajeCrecimiento}%`}</span>
          </div>
          <Maximize2 className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>

      <div className="lg:flex-1 flex flex-col mt-2 min-h-0">
        <div className="mb-2">
          <p className="text-2xl font-black text-foreground tracking-tighter">
            {totalSemanaFormatted ?? `$${totalSemana.toLocaleString("es-AR")}`}
          </p>
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Total Semanal Cobrado</p>
        </div>

        {/* Gráfico de área — recharts */}
        <div className="h-[160px] lg:flex-1 min-h-0 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={serie} margin={{ top: 8, right: 2, left: 2, bottom: 0 }}>
              <defs>
                <linearGradient id="gradient-pay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="currentColor" className="text-border/40" />
              <XAxis
                dataKey="dia"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 9, fontWeight: 700, fill: "currentColor" }}
                className="text-muted-foreground"
                padding={{ left: 8, right: 8 }}
              />
              <YAxis hide domain={[0, (max: number) => max * 1.2]} />
              <Tooltip
                cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                content={(props) => (
                  <ChartTooltip
                    {...(props as object)}
                    variant="line"
                    formatter={formatMonto}
                  />
                )}
              />
              <Area
                type="monotone"
                dataKey="monto"
                name="Ingresos"
                stroke="var(--primary)"
                strokeWidth={2}
                fill="url(#gradient-pay)"
                dot={false}
                activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
                isAnimationActive
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <StatDetailDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Ingresos de la Semana"
        description={`Total cobrado: ${totalSemanaFormatted ?? formatMonto(totalSemana)}`}
        rows={rows}
        emptyText="Sin ingresos en los últimos 7 días"
        navigateTo="/pagos"
        navigateLabel="Ir a Pagos"
      />
    </BentoCard>
  );
}
