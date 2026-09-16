import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import BentoCard from "./BentoCard";
import PersonaAvatar from "@/components/ui/persona-avatar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const MAX_TOOLTIP_PREVIEW = 5;

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function toDateOnly(date: Date): string {
  // Use local date to avoid timezone issues when converting to YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDiasDelMes(anio: number, mes: number): (Date | null)[] {
  const primerDia = new Date(anio, mes, 1).getDay();
  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const celdas: (Date | null)[] = Array(primerDia).fill(null);
  for (let d = 1; d <= diasEnMes; d++) {
    celdas.push(new Date(anio, mes, d));
  }
  return celdas;
}

interface CalendarBentoCardProps {
  className?: string;
  delay?: number;
  onSelectDate?: (date: Date) => void;
  selectedDate?: Date | null;
}

type ResumenDia = {
  fecha: string;
  total: number;
  asistentes: string[];
};

type AsistenciaDetalle = {
  id: number;
  clienteNombre: string;
  horaIngreso: string;
};

function formatHora(hora: string): string {
  return hora.slice(0, 5);
}

export default function CalendarBentoCard({ className, delay, onSelectDate, selectedDate }: CalendarBentoCardProps) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [resumen, setResumen] = useState<ResumenDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaModal, setDiaModal] = useState<Date | null>(null);
  const [asistenciasDia, setAsistenciasDia] = useState<AsistenciaDetalle[]>([]);
  const [loadingDia, setLoadingDia] = useState(false);
  const { toast } = useToast();

  const abrirModalDia = useCallback(async (dia: Date) => {
    setDiaModal(dia);
    setLoadingDia(true);
    setAsistenciasDia([]);
    try {
      const res = await apiFetch(`/api/asistencias?fecha=${toDateOnly(dia)}`);
      const data = await res.json();
      setAsistenciasDia(data);
    } catch {
      toast({ variant: "destructive", title: "Error al cargar asistencias del día" });
    } finally {
      setLoadingDia(false);
    }
  }, [toast]);

  const cargarResumen = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/asistencias/resumen?mes=${mes + 1}&anio=${anio}`);
      const data = await res.json();
      setResumen(data);
    } catch {
      toast({ variant: "destructive", title: "Error al cargar el resumen" });
    } finally {
      setLoading(false);
    }
  }, [mes, anio, toast]);

  useEffect(() => {
    cargarResumen();
  }, [cargarResumen]);

  const irMesAnterior = () => {
    if (mes === 0) { setMes(11); setAnio((a) => a - 1); }
    else setMes((m) => m - 1);
  };

  const irMesSiguiente = () => {
    if (mes === 11) { setMes(0); setAnio((a) => a + 1); }
    else setMes((m) => m + 1);
  };

  const celdas = getDiasDelMes(anio, mes);
  const resumenMap = new Map(resumen.map((r) => [r.fecha.slice(0, 10), r]));
  const hoyStr = toDateOnly(hoy);
  const seleccionadoStr = selectedDate ? toDateOnly(selectedDate) : null;

  const getHeatmapClass = (total: number, selected: boolean, esHoy: boolean) => {
    if (selected) return "bg-primary text-primary-foreground shadow-lg";
    if (esHoy) return "bg-primary/15 text-primary font-bold";
    if (total === 0) return "text-muted-foreground/50 hover:bg-muted";
    if (total <= 5) return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-500/30";
    if (total <= 15) return "bg-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-500/50";
    return "bg-emerald-500 text-white font-black hover:bg-emerald-600";
  };

  return (
    <BentoCard className={cn("flex flex-col lg:h-full !p-3", className)} delay={delay}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-bold text-foreground">{MESES[mes]} {anio}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={irMesAnterior} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <ChevronLeft className="h-3 w-3 text-muted-foreground" />
          </button>
          <button onClick={irMesSiguiente} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="text-center text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            {d}
          </div>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1 lg:flex-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square w-full rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <TooltipProvider delayDuration={100}>
          <div className="grid grid-cols-7 gap-1 lg:flex-1">
            {celdas.map((dia, i) => {
              if (!dia) return <div key={`empty-${i}`} />;
              const fechaStr = toDateOnly(dia);
              const diaData = resumenMap.get(fechaStr);
              const total = diaData?.total ?? 0;
              const asistentes = diaData?.asistentes ?? [];
              const esHoy = fechaStr === hoyStr;
              const esSeleccionado = fechaStr === seleccionadoStr;

              return (
                <Tooltip key={fechaStr}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onSelectDate?.(dia)}
                      className={cn(
                        "relative flex flex-col items-center justify-center aspect-square w-full rounded-xl text-[11px] transition-all duration-200 cursor-pointer",
                        getHeatmapClass(total, esSeleccionado, esHoy),
                        esHoy && !esSeleccionado && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      )}
                    >
                      <span className="leading-none">{dia.getDate()}</span>
                      {total > 0 && (
                        <span className={cn(
                          "text-[7px] mt-0.5 font-black",
                          esSeleccionado || total > 15 ? "text-white/80" : "text-muted-foreground"
                        )}>
                          {total}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    className="rounded-2xl border border-border shadow-2xl p-4 bg-popover text-popover-foreground animate-in fade-in zoom-in-95"
                  >
                    <div className="space-y-3 min-w-[160px]">
                      <div className="flex justify-between items-center border-b border-border pb-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-primary">
                          {esHoy ? "Asistencias de Hoy" : `Asistencias (${dia.getDate()} de ${MESES[mes]})`}
                        </p>
                        <div className="bg-primary/10 px-2 py-0.5 rounded-full">
                          <span className="text-[11px] font-black text-primary">{total}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {asistentes && asistentes.length > 0 ? asistentes.slice(0, MAX_TOOLTIP_PREVIEW).map((nombre, idx) => (
                          <div key={idx} className="flex items-center gap-2 group/item">
                            <PersonaAvatar seed={nombre} size={20} />
                            <span className="text-[11px] font-bold text-foreground group-hover/item:text-primary transition-colors">{nombre}</span>
                          </div>
                        )) : (
                          <div className="py-4 text-center">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Sin asistencias registradas</p>
                          </div>
                        )}
                      </div>
                      {total > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirModalDia(dia);
                          }}
                          className="w-full py-1.5 rounded-lg bg-muted hover:bg-primary/10 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-all cursor-pointer"
                        >
                          Ver {total > MAX_TOOLTIP_PREVIEW ? `todas (${total})` : "detalle"}
                        </button>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      )}

      <Dialog open={diaModal !== null} onOpenChange={(open) => !open && setDiaModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asistencias del día</DialogTitle>
            <DialogDescription>
              {diaModal?.toLocaleDateString("es-AR", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 divide-y divide-border max-h-[60vh] overflow-y-auto">
            {loadingDia ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-14" />
                </div>
              ))
            ) : asistenciasDia.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No hay asistencias registradas para este día</p>
              </div>
            ) : (
              asistenciasDia.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <PersonaAvatar seed={a.clienteNombre} size={28} />
                    <span className="text-sm font-medium text-foreground">{a.clienteNombre}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">{formatHora(a.horaIngreso)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </BentoCard>
  );
}
