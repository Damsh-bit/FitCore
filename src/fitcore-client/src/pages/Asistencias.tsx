import { useEffect, useState, useCallback, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Clock, Users, Search,
  TrendingUp, TrendingDown, Flame, Trophy, CalendarCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ClienteCombobox from "@/components/ui/client-combobox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell,
} from "recharts";
import ChartTooltip from "@/components/charts/ChartTooltip";
import StatTile from "@/components/StatTile";
import PersonaAvatar from "@/components/ui/persona-avatar";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Asistencia = {
  id: number;
  userId: string;
  clienteNombre: string;
  fecha: string;
  horaIngreso: string;
};

type ResumenDia = {
  fecha: string;
  total: number;
  asistentes: string[];
};

type Cliente = {
  id: string;
  nombre: string;
  activo: boolean;
};

type DiaPico = {
  fecha: string;
  total: number;
};

type TopAsistente = {
  userId: string;
  nombre: string;
  total: number;
};

type PorDiaSemana = {
  diaSemana: number;
  total: number;
};

type Estadisticas = {
  totalMes: number;
  totalMesAnterior: number;
  variacionPorcentual: number | null;
  diasConAsistencia: number;
  promedioPorDiaActivo: number;
  diaPico: DiaPico | null;
  topAsistentes: TopAsistente[];
  porDiaSemana: PorDiaSemana[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MAX_TOOLTIP_PREVIEW = 5;

function toDateOnly(date: Date): string {
  // Usar fecha local para evitar desfasajes de zona horaria al convertir a YYYY-MM-DD
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHora(hora: string): string {
  // hora viene como "HH:mm:ss" desde la API
  return hora.slice(0, 5);
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

function getHeatmapClass(total: number, selected: boolean, esHoy: boolean) {
  if (selected) return "bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold";
  if (esHoy) return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-bold ring-2 ring-indigo-400 dark:ring-indigo-500 ring-offset-1 ring-offset-card";
  if (total === 0) return "text-muted-foreground/40 hover:bg-muted";
  if (total <= 5) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/60";
  if (total <= 15) return "bg-emerald-300 text-emerald-950 dark:bg-emerald-700/60 dark:text-emerald-100 font-bold hover:bg-emerald-400 dark:hover:bg-emerald-600/60";
  return "bg-emerald-500 text-white font-black hover:bg-emerald-600";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Asistencias() {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date | null>(null);

  // Datos
  const [resumen, setResumen] = useState<ResumenDia[]>([]);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [asistenciasDia, setAsistenciasDia] = useState<Asistencia[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [busqueda, setBusqueda] = useState("");

  // Loading states
  const [loadingResumen, setLoadingResumen] = useState(true);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true);
  const [loadingDia, setLoadingDia] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Modal registro
  const [modalOpen, setModalOpen] = useState(false);
  const [formClienteId, setFormClienteId] = useState("");
  const [formHora, setFormHora] = useState("08:00");
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  // ── Cargar resumen del mes ─────────────────────────────────────────────────
  const cargarResumen = useCallback(async () => {
    setLoadingResumen(true);
    try {
      const res = await apiFetch(`/api/asistencias/resumen?mes=${mes + 1}&anio=${anio}`);
      const data = await res.json();
      setResumen(data);
    } catch {
      toast({ variant: "destructive", title: "Error al cargar el calendario" });
    } finally {
      setLoadingResumen(false);
    }
  }, [mes, anio]);

  // ── Cargar estadísticas del mes ─────────────────────────────────────────────
  const cargarEstadisticas = useCallback(async () => {
    setLoadingEstadisticas(true);
    try {
      const res = await apiFetch(`/api/asistencias/estadisticas?mes=${mes + 1}&anio=${anio}`);
      const data = await res.json();
      setEstadisticas(data);
    } catch {
      toast({ variant: "destructive", title: "Error al cargar las estadísticas" });
    } finally {
      setLoadingEstadisticas(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    cargarResumen();
    cargarEstadisticas();
  }, [cargarResumen, cargarEstadisticas]);

  // ── Cargar clientes activos (una sola vez) ─────────────────────────────────
  useEffect(() => {
    apiFetch("/api/usuarios?categoria=Cliente&activo=true")
      .then((r) => r.json())
      .then((data: Cliente[]) => setClientes(data));
  }, []);

  // ── Cargar asistencias del día seleccionado ────────────────────────────────
  const cargarDia = useCallback(async (fecha: Date) => {
    setLoadingDia(true);
    setAsistenciasDia([]);
    try {
      const res = await apiFetch(`/api/asistencias?fecha=${toDateOnly(fecha)}`);
      const data = await res.json();
      setAsistenciasDia(data);
    } catch {
      toast({ variant: "destructive", title: "Error al cargar asistencias del día" });
    } finally {
      setLoadingDia(false);
    }
  }, []);

  const seleccionarDia = (dia: Date) => {
    setDiaSeleccionado(dia);
    setBusqueda("");
    cargarDia(dia);
  };

  // ── Navegación de mes ──────────────────────────────────────────────────────
  const irMesAnterior = () => {
    if (mes === 0) { setMes(11); setAnio((a) => a - 1); }
    else setMes((m) => m - 1);
    setDiaSeleccionado(null);
  };

  const irMesSiguiente = () => {
    if (mes === 11) { setMes(0); setAnio((a) => a + 1); }
    else setMes((m) => m + 1);
    setDiaSeleccionado(null);
  };

  const irAHoy = () => {
    setAnio(hoy.getFullYear());
    setMes(hoy.getMonth());
    seleccionarDia(hoy);
  };

  // ── Registrar asistencia ───────────────────────────────────────────────────
  const handleRegistrar = async () => {
    if (!diaSeleccionado || !formClienteId) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/asistencias", {
        method: "POST",
        body: JSON.stringify({
          userId: formClienteId,
          fecha: toDateOnly(diaSeleccionado),
          horaIngreso: `${formHora}:00`,
        }),
      });
      if (!res.ok) throw new Error();

      toast({ variant: "success", title: "Asistencia registrada" });
      setModalOpen(false);
      setFormClienteId("");
      setFormHora("08:00");
      await cargarDia(diaSeleccionado);
      await cargarResumen();
      await cargarEstadisticas();
    } catch {
      toast({ variant: "destructive", title: "No se pudo registrar", description: "Intentá nuevamente." });
    } finally {
      setSaving(false);
    }
  };

  // ── Eliminar asistencia ────────────────────────────────────────────────────
  const handleEliminar = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/asistencias/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setAsistenciasDia((prev) => prev.filter((a) => a.id !== id));
      await cargarResumen();
      await cargarEstadisticas();
      toast({ variant: "success", title: "Asistencia eliminada" });
    } catch {
      toast({ variant: "destructive", title: "No se pudo eliminar" });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Datos calendario ───────────────────────────────────────────────────────
  const celdas = getDiasDelMes(anio, mes);
  const resumenMap = new Map(resumen.map((r) => [r.fecha.slice(0, 10), r]));
  const hoyStr = toDateOnly(hoy);
  const diaSeleccionadoStr = diaSeleccionado ? toDateOnly(diaSeleccionado) : null;

  const asistenciasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return asistenciasDia;
    const q = busqueda.trim().toLowerCase();
    return asistenciasDia.filter((a) => a.clienteNombre.toLowerCase().includes(q));
  }, [asistenciasDia, busqueda]);

  const maxTopAsistente = estadisticas?.topAsistentes[0]?.total ?? 0;

  const variacion = estadisticas?.variacionPorcentual ?? null;
  const variacionEsPositiva = (variacion ?? 0) >= 0;

  const diaPicoLabel = estadisticas?.diaPico
    ? new Date(`${estadisticas.diaPico.fecha}T00:00:00`).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
    : "—";

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Asistencias</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Registro diario de check-ins y estadísticas de concurrencia</p>
      </div>

      {/* ── Fila de estadísticas ── */}
      <div className="bg-card border border-border rounded-2xl shadow-xs overflow-hidden">
        <div className="grid grid-cols-2 lg:grid-cols-4">
          <StatTile
            icon={Users}
            color="indigo"
            value={estadisticas ? estadisticas.totalMes : 0}
            label={`Asistencias en ${MESES[mes]}`}
            loading={loadingEstadisticas}
            className="border-r border-b border-border lg:border-b-0"
          />
          <StatTile
            icon={Flame}
            color="amber"
            value={estadisticas ? estadisticas.promedioPorDiaActivo : 0}
            label="Promedio por día activo"
            loading={loadingEstadisticas}
            className="border-b border-border lg:border-b-0 lg:border-r"
          />
          <StatTile
            icon={CalendarCheck2}
            color="purple"
            value={estadisticas ? estadisticas.diaPico?.total ?? 0 : 0}
            label={estadisticas?.diaPico ? `Día pico · ${diaPicoLabel}` : "Día pico"}
            loading={loadingEstadisticas}
            className="border-r border-border"
          />
          <StatTile
            icon={variacionEsPositiva ? TrendingUp : TrendingDown}
            color={variacionEsPositiva ? "emerald" : "rose"}
            value={variacion === null ? "—" : `${variacion > 0 ? "+" : ""}${variacion}%`}
            label="Vs. mes anterior"
            loading={loadingEstadisticas}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">

        {/* ── Calendario ── */}
        <div className="xl:col-span-4 bg-card border border-border rounded-2xl p-6">

          {/* Navegación */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={irMesAnterior}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="flex flex-col items-center">
              <span className="text-sm font-semibold text-foreground">
                {MESES[mes]} {anio}
              </span>
              <button
                onClick={irAHoy}
                className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                Ir a hoy
              </button>
            </div>
            <button
              onClick={irMesSiguiente}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Días de la semana */}
          <div className="grid grid-cols-7 mb-2">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Celdas */}
          {loadingResumen ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: celdas.length }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full rounded-md" />
              ))}
            </div>
          ) : (
            <TooltipProvider delayDuration={150}>
              <div className="grid grid-cols-7 gap-1">
                {celdas.map((dia, i) => {
                  if (!dia) return <div key={`empty-${i}`} />;
                  const fechaStr = toDateOnly(dia);
                  const diaData = resumenMap.get(fechaStr);
                  const total = diaData?.total ?? 0;
                  const asistentes = diaData?.asistentes ?? [];
                  const esHoy = fechaStr === hoyStr;
                  const esSeleccionado = fechaStr === diaSeleccionadoStr;

                  return (
                    <Tooltip key={fechaStr}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => seleccionarDia(dia)}
                          className={cn(
                            "relative flex flex-col items-center justify-center h-11 w-full rounded-md text-sm transition-colors",
                            getHeatmapClass(total, esSeleccionado, esHoy)
                          )}
                        >
                          <span>{dia.getDate()}</span>
                          {total > 0 && (
                            <span
                              className={cn(
                                "text-[9px] font-semibold leading-none mt-0.5",
                                esSeleccionado || total > 15 ? "text-white/80" : "text-current opacity-60"
                              )}
                            >
                              {total}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="rounded-xl p-3">
                        <div className="space-y-2 min-w-[140px]">
                          <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5">
                            <span className="text-xs font-semibold">
                              {dia.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">{total} asist.</span>
                          </div>
                          {asistentes.length > 0 ? (
                            <ul className="space-y-1">
                              {asistentes.slice(0, MAX_TOOLTIP_PREVIEW).map((nombre) => (
                                <li key={nombre} className="text-xs text-foreground/80">{nombre}</li>
                              ))}
                              {asistentes.length > MAX_TOOLTIP_PREVIEW && (
                                <li className="text-xs text-muted-foreground">
                                  +{asistentes.length - MAX_TOOLTIP_PREVIEW} más
                                </li>
                              )}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground">Sin asistencias</p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </TooltipProvider>
          )}

          {/* Leyenda */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-[11px] text-muted-foreground">Menos</span>
            <span className="h-3 w-3 rounded bg-muted" />
            <span className="h-3 w-3 rounded bg-emerald-100 dark:bg-emerald-950/60" />
            <span className="h-3 w-3 rounded bg-emerald-300 dark:bg-emerald-700/60" />
            <span className="h-3 w-3 rounded bg-emerald-500" />
            <span className="text-[11px] text-muted-foreground">Más</span>
          </div>
        </div>

        {/* ── Panel del día ── */}
        <div className="xl:col-span-5 bg-card border border-border rounded-2xl flex flex-col">
          {!diaSeleccionado ? (
            <div className="flex flex-col items-center justify-center h-full py-20 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Seleccioná un día</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tocá cualquier día del calendario para ver o registrar asistencias
              </p>
            </div>
          ) : (
            <>
              {/* Header del panel */}
              <div className="flex items-center justify-between p-6 border-b border-border gap-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground capitalize">
                    {diaSeleccionado.toLocaleDateString("es-AR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </h2>
                  {loadingDia ? (
                    <Skeleton className="h-3 w-20 rounded mt-1" />
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {`${asistenciasDia.length} asistencia${asistenciasDia.length !== 1 ? "s" : ""}`}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  disabled={loadingDia}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Registrar
                </Button>
              </div>

              {/* Buscador (solo si hay varias asistencias) */}
              {!loadingDia && asistenciasDia.length > 6 && (
                <div className="px-6 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar por nombre..."
                      className="pl-9 h-9"
                    />
                  </div>
                </div>
              )}

              {/* Lista de asistencias */}
              <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
                {loadingDia ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-36" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  ))
                ) : asistenciasDia.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    No hay asistencias registradas para este día
                  </div>
                ) : asistenciasFiltradas.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    Ningún resultado para "{busqueda}"
                  </div>
                ) : (
                  asistenciasFiltradas.map((a, i) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/50 transition-colors animate-fade-in-up"
                      style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PersonaAvatar seed={a.userId} size={36} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{a.clienteNombre}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{formatHora(a.horaIngreso)}</span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleEliminar(a.id)}
                        disabled={deletingId === a.id}
                        className="p-2 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-40 shrink-0"
                        aria-label="Eliminar asistencia"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* ── Top asistentes y actividad semanal ── */}
        <div className="xl:col-span-3 bg-card border border-border rounded-2xl p-5 flex flex-col gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Top asistentes del mes</h3>
            </div>

            {loadingEstadisticas ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                    <Skeleton className="h-3 flex-1 rounded" />
                  </div>
                ))}
              </div>
            ) : !estadisticas || estadisticas.topAsistentes.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Sin asistencias registradas este mes
              </p>
            ) : (
              <ul className="space-y-2.5">
                {estadisticas.topAsistentes.map((persona, idx) => (
                  <li key={persona.userId} className="flex items-center gap-2.5">
                    <span className={cn(
                      "text-[11px] font-black w-4 text-center shrink-0",
                      idx === 0 ? "text-amber-500" : idx === 1 ? "text-muted-foreground" : idx === 2 ? "text-orange-400" : "text-muted-foreground/50"
                    )}>
                      {idx + 1}
                    </span>
                    <PersonaAvatar seed={persona.userId} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{persona.nombre}</p>
                      <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${maxTopAsistente > 0 ? (persona.total / maxTopAsistente) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground shrink-0">{persona.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-3">Actividad por día de la semana</h3>
            {loadingEstadisticas ? (
              <Skeleton className="h-28 w-full rounded" />
            ) : (
              <div className="h-28 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(estadisticas?.porDiaSemana ?? []).map((d) => ({ dia: DIAS_SEMANA[d.diaSemana], total: d.total }))}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="dia"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fontWeight: 600, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis hide domain={[0, "dataMax"]} />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                      content={(props) => <ChartTooltip {...(props as object)} formatter={(v) => `${v} asist.`} />}
                    />
                    <Bar dataKey="total" name="Asistencias" radius={[4, 4, 0, 0]} maxBarSize={28}>
                      {(estadisticas?.porDiaSemana ?? []).map((d) => (
                        <Cell key={d.diaSemana} fill={d.total > 0 ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal registrar asistencia ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar asistencia</DialogTitle>
            <DialogDescription>
              {diaSeleccionado?.toLocaleDateString("es-AR", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <ClienteCombobox
                id="cliente"
                clientes={clientes}
                value={formClienteId}
                onChange={setFormClienteId}
                disabled={saving}
                placeholder="Buscá por nombre..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hora">Hora de ingreso</Label>
              <Input
                id="hora"
                type="time"
                value={formHora}
                onChange={(e) => setFormHora(e.target.value)}
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleRegistrar}
              disabled={!formClienteId}
              loading={saving}
            >
              {saving ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
