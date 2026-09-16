import { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
  Flame,
  Award,
  Filter,
  CalendarCheck
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Asistencia {
  id: number;
  fecha: string;
  horaIngreso: string;
}

export default function MisAsistencias() {
  const [asistencias, setAsistencias] = useState<Asistencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState<string>("todos");

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/asistencias/mis-asistencias")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Asistencia[]) => setAsistencias(data))
      .catch(() => setAsistencias([]))
      .finally(() => setLoading(false));
  }, []);

  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  // Filtrado
  const asistenciasFiltradas = asistencias.filter((a) => {
    if (filtroMes === "todos") return true;
    const f = new Date(a.fecha);
    if (filtroMes === "este-mes") {
      return f.getMonth() === mesActual && f.getFullYear() === anioActual;
    }
    if (filtroMes === "mes-pasado") {
      const mesPasado = mesActual === 0 ? 11 : mesActual - 1;
      const anioPasado = mesActual === 0 ? anioActual - 1 : anioActual;
      return f.getMonth() === mesPasado && f.getFullYear() === anioPasado;
    }
    return true;
  });

  const asistenciasMes = asistencias.filter((a) => {
    const f = new Date(a.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const formatFechaLinda = (fechaStr: string) => {
    try {
      // Evitar desfases por timezone sumando la hora o parseando YYYY-MM-DD directamente
      const [y, m, d] = fechaStr.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return fechaStr;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ── Encabezado ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <CalendarCheck className="w-8 h-8 text-orange-600 dark:text-orange-500" /> Mis Asistencias
          </h1>
          <p className="text-sm text-muted-foreground font-medium mt-1">
            Historial de accesos y constancia de tus entrenamientos en FitCore.
          </p>
        </div>

        {/* Filtro rápido */}
        <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-1.5 shadow-2xs">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          <select
            value={filtroMes}
            onChange={(e) => setFiltroMes(e.target.value)}
            className="text-xs font-semibold text-foreground bg-card border-0 focus:ring-0 outline-none pr-3 cursor-pointer"
          >
            <option value="todos">Todos los registros</option>
            <option value="este-mes">Este mes ({asistenciasMes.length})</option>
            <option value="mes-pasado">Mes anterior</option>
          </select>
        </div>
      </div>

      {/* ── Tarjetas de Estadísticas ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Este Mes</p>
            {loading ? (
              <Skeleton className="h-8 w-10 rounded mt-0.5" />
            ) : (
              <p className="text-3xl font-black text-foreground mt-0.5 animate-fade-in-up">{asistenciasMes.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">días entrenados</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Histórico</p>
            {loading ? (
              <Skeleton className="h-8 w-10 rounded mt-0.5" />
            ) : (
              <p className="text-3xl font-black text-foreground mt-0.5 animate-fade-in-up">{asistencias.length}</p>
            )}
            <p className="text-xs text-muted-foreground mt-0.5">visitas registradas</p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Promedio Semanal</p>
            {loading ? (
              <Skeleton className="h-8 w-14 rounded mt-0.5" />
            ) : (
              <p className="text-3xl font-black text-foreground mt-0.5 animate-fade-in-up">{(asistenciasMes.length / 4).toFixed(1)}</p>
            )}
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold mt-0.5">sesiones por semana</p>
          </div>
        </div>
      </div>

      {/* ── Listado de Asistencias ── */}
      <div className="bg-card border border-border rounded-3xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Registro de Ingresos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Cada vez que presentás tu acceso en recepción o molinete</p>
          </div>
          <Badge variant="outline" className="text-xs font-semibold px-3 py-1">
            {asistenciasFiltradas.length} {asistenciasFiltradas.length === 1 ? "registro" : "registros"}
          </Badge>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : asistenciasFiltradas.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">No hay asistencias registradas</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Tus ingresos al gimnasio se registrarán de forma automática cuando hagas check-in en el acceso.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {asistenciasFiltradas.map((item, i) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/40 transition-colors animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground capitalize">
                      {formatFechaLinda(item.fecha)}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Clock className="w-3.5 h-3.5" />
                      Hora de ingreso: <span className="font-semibold text-foreground/80">{item.horaIngreso.slice(0, 5)} hs</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    Presente
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
