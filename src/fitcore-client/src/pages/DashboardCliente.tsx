import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame,
  Calendar,
  CreditCard,
  Clock,
  ArrowRight,
  Sparkles,
  Dumbbell,
  AlertCircle,
  TrendingUp,
  MapPin,
  Bell,
  Users,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGymSettings } from "@/context/GymSettingsContext";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface MiMembresia {
  id: number;
  planId: number;
  planNombre: string;
  planPrecio: number;
  fechaInicio: string;
  fechaFin: string;
  activa: boolean;
}

interface AsistenciaItem {
  id: number;
  fecha: string;
  horaIngreso: string;
}

export default function DashboardCliente() {
  const { user } = useAuth();
  const { settings } = useGymSettings();
  const navigate = useNavigate();

  const [membresia, setMembresia] = useState<MiMembresia | null>(null);
  const [asistencias, setAsistencias] = useState<AsistenciaItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      apiFetch("/api/membresias/mi-membresia").then((r) => (r.ok ? r.json() : null)),
      apiFetch("/api/asistencias/mis-asistencias").then((r) => (r.ok ? r.json() : []))
    ]).then(([resMem, resAsis]) => {
      if (resMem.status === "fulfilled" && resMem.value) {
        setMembresia(resMem.value);
      }
      if (resAsis.status === "fulfilled" && Array.isArray(resAsis.value)) {
        setAsistencias(resAsis.value);
      }
      setLoading(false);
    });
  }, []);

  // Calcular días restantes
  const diasRestantes = membresia
    ? Math.max(0, Math.ceil((new Date(membresia.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const membresiaActiva = membresia && diasRestantes > 0;

  // Asistencias este mes
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  const asistenciasMes = asistencias.filter((a) => {
    const f = new Date(a.fecha);
    return f.getMonth() === mesActual && f.getFullYear() === anioActual;
  });

  const ultimaAsistencia = asistencias.length > 0 ? asistencias[0] : null;

  // Consejos permanentes (no son anuncios reales del gimnasio: evitamos fechas
  // o hechos específicos inventados que no aplicarían a todos los gimnasios
  // que usan la plataforma).
  const tips = [
    {
      id: 1,
      titulo: "Reservá las máquinas solo mientras las usás",
      detalle: "Así hay lugar para todos, sobre todo en el horario pico.",
      tag: "Convivencia"
    },
    {
      id: 2,
      titulo: "Consultá a los profes antes de sumar peso",
      detalle: "Te ayudan a progresar de forma segura y sin lesiones.",
      tag: "Entrenamiento"
    },
    {
      id: 3,
      titulo: "Hidratate antes, durante y después de entrenar",
      detalle: "Mejora tu rendimiento y tu recuperación.",
      tag: "Salud"
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* ── 1. Header de bienvenida ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              ¡Hola, {user?.nombre || "Atleta"}!
            </h1>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            {settings.mensajeBienvenida || "Bienvenido a tu panel de FitCore. Tu constancia forja tus resultados."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate("/mis-asistencias")}
            variant="outline"
            className="rounded-2xl text-xs font-semibold h-11 px-4 cursor-pointer"
          >
            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
            Mis Asistencias
          </Button>
          <Button
            onClick={() => navigate("/mi-membresia")}
            className="rounded-2xl text-xs font-bold h-11 px-5 bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20 cursor-pointer"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {membresiaActiva ? "Gestionar Plan" : "Activar Membresía"}
          </Button>
        </div>
      </div>

      {/* ── 2. Banner de Estado de Membresía ── */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-3xl" />
      ) : membresiaActiva ? (
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 border-emerald-400/30 text-xs font-bold">
                  Membresía Activa
                </Badge>
                <span className="text-xs text-zinc-400 font-medium">
                  {membresia?.planNombre}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Te quedan {diasRestantes} {diasRestantes === 1 ? "día" : "días"} de entrenamiento
              </h2>
              <p className="text-xs text-zinc-400">
                Válida hasta el{" "}
                <span className="text-zinc-200 font-semibold">
                  {new Date(membresia!.fechaFin).toLocaleDateString("es-AR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}
                </span>
                . Podés renovar con antelación para no interrumpir tu acceso al gimnasio.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                onClick={() => navigate("/mi-membresia")}
                className="bg-white hover:bg-gray-100 text-zinc-900 font-bold text-xs h-11 px-5 rounded-2xl cursor-pointer"
              >
                Ver recibos y pagos
                <ArrowRight className="w-4 h-4 ml-2 text-zinc-700" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-3xl p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-900">No contás con una membresía activa</h3>
              <p className="text-xs text-amber-800/80 mt-1 max-w-xl">
                Para ingresar a la sala de musculación necesitás activar tu cuota.
                Aboná de forma segura con Mercado Pago, Tarjeta o Transferencia.
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/mi-membresia")}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-11 px-6 rounded-2xl shrink-0 cursor-pointer shadow-sm"
          >
            Elegir mi Plan
          </Button>
        </div>
      )}

      {/* ── 3. Métricas rápidas del Socio ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Entrenamientos del mes */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <Flame className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Asistencias del Mes</p>
            {loading ? (
              <Skeleton className="h-7 w-16 rounded mt-0.5" />
            ) : (
              <p className="text-2xl font-black text-foreground mt-0.5 animate-fade-in-up">
                {asistenciasMes.length} <span className="text-xs font-medium text-muted-foreground">visitas</span>
              </p>
            )}
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> ¡Excelente constancia!
            </p>
          </div>
        </div>

        {/* Última visita */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Calendar className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Último Entrenamiento</p>
            {loading ? (
              <Skeleton className="h-6 w-24 rounded mt-0.5" />
            ) : (
              <p className="text-lg font-bold text-foreground mt-0.5 truncate animate-fade-in-up">
                {ultimaAsistencia ? `${ultimaAsistencia.fecha}` : "Aún sin registros"}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {loading ? "" : ultimaAsistencia ? `Ingreso: ${ultimaAsistencia.horaIngreso.slice(0, 5)} hs` : "¡Vení a entrenar hoy!"}
            </p>
          </div>
        </div>

        {/* Sede y Equipamiento */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-xs flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Dumbbell className="w-7 h-7" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sala de Musculación</p>
            <p className="text-base font-bold text-foreground mt-0.5 truncate">
              {membresia?.planNombre || "Pase Libre"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {settings.nombreGimnasio ?? "Tu gimnasio"}
            </p>
          </div>
        </div>
      </div>

      {/* ── 4. Grilla de 2 Columnas: Horarios / Concurrencia de Sala y Novedades ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Horarios y Concurrencia de Sala de Musculación */}
        <div className="lg:col-span-7 bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-600" />
                <h3 className="text-base font-bold text-foreground">Horarios de Referencia</h3>
              </div>
              <p className="text-xs text-muted-foreground">Confirmá el horario vigente con recepción — puede variar por sede o temporada</p>
            </div>
          </div>

          {/* Horarios habituales de apertura */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Lunes a Viernes</p>
              <p className="text-sm font-black text-foreground mt-0.5">07:00 — 23:00 hs</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Horario corrido</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Sábados</p>
              <p className="text-sm font-black text-foreground mt-0.5">09:00 — 20:00 hs</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Tarde completa</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Domingos y Feriados</p>
              <p className="text-sm font-black text-foreground mt-0.5">09:00 — 14:00 hs</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Turno mañana</p>
            </div>
          </div>

          {/* Termómetro de Concurrencia de la Sala de Pesas */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Franjas horarias orientativas
              </h4>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              Guía general de referencia — la afluencia real puede variar según el día.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">10:00 - 16:30 hs</span>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">Tranquilo • Bancos y racks libres</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </div>

              <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-blue-700 dark:text-blue-300">07:00 - 09:30 hs</span>
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Moderado • Flujo dinámico</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              </div>

              <div className="p-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-orange-700 dark:text-orange-300">18:00 - 20:30 hs</span>
                  <p className="text-[11px] text-orange-600 dark:text-orange-400 font-semibold">Horario Pico 🔥 • Mayor concurrencia</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-orange-500 animate-pulse" />
              </div>

              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold text-purple-700 dark:text-purple-300">20:30 - 23:00 hs</span>
                  <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold">Descomprimiendo • Espacio disponible</p>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
              </div>
            </div>
          </div>

          {/* Normas de convivencia en sala tradicional */}
          <div className="pt-4 border-t border-border flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Toalla obligatoria sobre bancos
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Descargar barras al finalizar
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Devolver mancuernas a su lugar
            </span>
          </div>
        </div>

        {/* Novedades y Anuncios del Gym */}
        <div className="lg:col-span-5 bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-orange-600" />
              <h3 className="text-base font-bold text-foreground">Tips para tu Entrenamiento</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-5">Consejos generales — consultá con recepción por avisos puntuales del gimnasio</p>

            <div className="space-y-3.5">
              {tips.map((t) => (
                <div key={t.id} className="p-4 rounded-2xl border border-border bg-muted/40 space-y-1.5">
                  <Badge className="bg-muted text-muted-foreground hover:bg-muted text-[10px] font-bold border-0">
                    {t.tag}
                  </Badge>
                  <h4 className="text-xs font-bold text-foreground">{t.titulo}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.detalle}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>¿Armado de rutina? Consultá a los profes en sala.</span>
            </div>
            <Button
              onClick={() => navigate("/mi-perfil")}
              variant="outline"
              size="sm"
              className="text-xs rounded-xl font-semibold cursor-pointer"
            >
              Mi Perfil
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
