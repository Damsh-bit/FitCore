import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Dumbbell,
  Plus,
  Save,
  Scale,
  Trash2,
  ImageOff,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Phone,
  Mail,
  Sparkles,
  Share2,
  X,
  Eye,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { apiFetch } from "@/lib/api";
import { fileToBase64 } from "@/lib/fileToBase64";
import { buildWhatsAppUrl } from "@/lib/utils";
import { useGymSettings } from "@/context/GymSettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/components/ui/use-toast";
import ChartTooltip from "@/components/charts/ChartTooltip";

// ── Interfaces ───────────────────────────────────────────────

interface Medicion {
  id: number;
  fecha: string;
  pesoKg: number;
  nota: string | null;
  fotoFrenteBase64: string | null;
  fotoPerfilBase64: string | null;
}

interface RutinaDia {
  diaSemana: number;
  descripcion: string;
}

interface ClienteDetalle {
  id: string;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  activo?: boolean;
  planNombre?: string | null;
  membresiaVence?: string | null;
  totalPagado?: number;
  totalAsistencias?: number;
  asistenciasUltimos30Dias?: number;
  ultimaAsistencia?: string | null;
}

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MAX_FOTO_BYTES = 5 * 1024 * 1024;

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

function formatFechaCorta(fechaStr: string) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

function formatFechaCompleta(fechaStr: string) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

// ── Plantillas de Rutina de Gimnasio ─────────────────────────

const PLANTILLAS_RUTINA: {
  nombre: string;
  badge: string;
  descripcion: string;
  dias: Record<number, string>;
}[] = [
  {
    nombre: "Full Body (3 Días)",
    badge: "Principiante / Acondicionamiento",
    descripcion: "Lunes, Miércoles y Viernes. Ideal para quienes inician o tienen disponibilidad reducida.",
    dias: {
      1: "Pecho (Press plano 3x10) · Espalda (Remo con barra 3x10) · Pierna (Sentadilla copa 3x12) · Hombro (Press militar mancuernas 3x10)",
      3: "Pierna (Prensa 45° 3x12) · Espalda (Jalón al pecho 3x10) · Pecho (Inclinado con mancuernas 3x10) · Bíceps y Tríceps superserie (3x12)",
      5: "Pierna (Peso muerto rumano 3x10) · Espalda (Remo en polea baja 3x12) · Fondos asistidos (3x10) · Plancha abdominal (3x45s)",
    },
  },
  {
    nombre: "Torso / Pierna (4 Días)",
    badge: "Intermedio / Hipertrofia",
    descripcion: "Lunes, Martes, Jueves y Viernes. Equilibrio óptimo de volumen y recuperación muscular.",
    dias: {
      1: "Torso A: Press de banca plano (4x8) · Remo con barra (4x8) · Press militar (3x10) · Jalón agarre neutro (3x10) · Tríceps en polea (3x12)",
      2: "Pierna A: Sentadilla libre trasera (4x8) · Prensa a 45° (3x10) · Sillón de cuádriceps (3x12) · Gemelos de pie (4x15)",
      4: "Torso B: Press inclinado con mancuernas (4x10) · Remo Gironda (4x10) · Vuelos laterales (4x12) · Fondos en paralelas (3x10) · Curl de bíceps barra Z (3x10)",
      5: "Pierna B: Peso muerto convencional (4x6) · Camilla femoral acostado (4x10) · Zancadas búlgaras (3x10/pierna) · Abdominales colgado (3x15)",
    },
  },
  {
    nombre: "Push / Pull / Legs (6 Días)",
    badge: "Avanzado / Alto Rendimiento",
    descripcion: "Patrón Empuje, Tirón y Pierna con frecuencia 2 semanal. Para practicantes avanzados.",
    dias: {
      1: "Empuje A: Press banca plano con barra · Press militar mancuernas · Aperturas en polea · Extensiones tríceps soga",
      2: "Tracción A: Dominadas lastradas/asistidas · Remo con barra T · Jalón al pecho supino · Face pull · Curl martillo",
      3: "Pierna A: Sentadilla con barra · Prensa 45° · Sillón de cuádriceps · Elevación de talones de pie",
      4: "Empuje B: Press banca inclinada mancuernas · Fondos en paralelas · Cruces en polea baja · Rompecráneos barra Z",
      5: "Tracción B: Peso muerto rumano · Remo serrucho con mancuerna · Jalón agarre estrecho · Curl en banco Scott",
      6: "Pierna B: Hip thrust pesado · Sentadilla búlgara · Camilla femoral sentado · Pantorrillas en máquina",
    },
  },
  {
    nombre: "Fuerza & Acondicionamiento (3 Días)",
    badge: "Fuerza / Funcional",
    descripcion: "Fuerza básica con barra combinada con bloques metabólicos HIIT.",
    dias: {
      1: "Fuerza: Sentadilla 5x5 + Press Banca 5x5. Circuito HIIT final: 15 min Assault Bike + Swings con Kettlebell",
      3: "Fuerza: Peso Muerto 5x5 + Press Militar 5x5. Bloque Metabólico: Tabata Cuerdas de batalla + Burpees",
      5: "Fuerza: Dominadas 4x6 + Zancadas 4x8. Acondicionamiento: 20 min Remo ergómetro + Planchas dinámicas",
    },
  },
];

export default function ClienteProgreso() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useGymSettings();

  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [rutina, setRutina] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [guardandoRutina, setGuardandoRutina] = useState(false);

  // Pestañas activas: "evolucion" | "nueva" | "rutina"
  const [tabActiva, setTabActiva] = useState<"evolucion" | "nueva" | "rutina">("evolucion");

  // Form nueva medición
  const [fecha, setFecha] = useState(hoyISO());
  const [peso, setPeso] = useState("");
  const [nota, setNota] = useState("");
  const [cinturaCm, setCinturaCm] = useState("");
  const [grasaPct, setGrasaPct] = useState("");
  const [fotoFrente, setFotoFrente] = useState<string | null>(null);
  const [fotoPerfil, setFotoPerfil] = useState<string | null>(null);
  const [guardandoMedicion, setGuardandoMedicion] = useState(false);

  // Modal para ver foto en tamaño completo
  const [fotoModal, setFotoModal] = useState<{ url: string; titulo: string } | null>(null);

  // Modal de confirmación para eliminar
  const [medicionAEliminar, setMedicionAEliminar] = useState<number | null>(null);

  // Comparador Antes / Después seleccionable
  const [antesId, setAntesId] = useState<number | null>(null);
  const [despuesId, setDespuesId] = useState<number | null>(null);

  const cargar = () => {
    if (!userId) return;
    setLoading(true);
    setError(false);
    Promise.all([
      apiFetch(`/api/usuarios/${userId}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      apiFetch(`/api/mediciones/cliente/${userId}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      apiFetch(`/api/rutinas/cliente/${userId}`).then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([c, m, r]: [ClienteDetalle, Medicion[], RutinaDia[]]) => {
        setCliente(c);
        const sortedM = [...m].sort((a, b) => a.fecha.localeCompare(b.fecha));
        setMediciones(sortedM);

        // Inicializar antes/después por defecto con el primero y el último
        if (sortedM.length > 0) {
          setAntesId(sortedM[0].id);
          setDespuesId(sortedM[sortedM.length - 1].id);
        }

        const mapa: Record<number, string> = {};
        r.forEach((d) => (mapa[d.diaSemana] = d.descripcion));
        setRutina(mapa);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Métricas de evolución calculadas
  const metrics = useMemo(() => {
    if (mediciones.length === 0) {
      return {
        pesoActual: null,
        pesoInicial: null,
        deltaTotal: 0,
        deltaPct: 0,
        ultimaFecha: null,
        totalRegistros: 0,
      };
    }
    const inicial = mediciones[0];
    const actual = mediciones[mediciones.length - 1];
    const deltaTotal = actual.pesoKg - inicial.pesoKg;
    const deltaPct = inicial.pesoKg > 0 ? (deltaTotal / inicial.pesoKg) * 100 : 0;

    return {
      pesoActual: actual.pesoKg,
      pesoInicial: inicial.pesoKg,
      deltaTotal,
      deltaPct,
      ultimaFecha: actual.fecha,
      totalRegistros: mediciones.length,
    };
  }, [mediciones]);

  // Días activos de rutina
  const diasRutinaActivos = useMemo(() => {
    return Object.values(rutina).filter((desc) => desc && desc.trim().length > 0).length;
  }, [rutina]);

  // Manejo de carga de fotos
  const handleFoto = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FOTO_BYTES) {
      toast({ variant: "destructive", title: "Foto muy pesada", description: "El máximo es 5MB por imagen." });
      e.target.value = "";
      return;
    }
    setter(await fileToBase64(file));
  };

  // Guardar nueva medición
  const handleAgregarMedicion = async (e: React.FormEvent) => {
    e.preventDefault();
    const pesoNum = parseFloat(peso);
    if (!pesoNum || pesoNum <= 0) {
      toast({ variant: "destructive", title: "Peso inválido", description: "Ingresá un peso válido en kg (ej: 78.5)." });
      return;
    }

    // Armar nota estructurada con medidas opcionales si las cargó
    const partesNota: string[] = [];
    if (nota.trim()) partesNota.push(nota.trim());
    if (cinturaCm.trim()) partesNota.push(`Cintura: ${cinturaCm.trim()} cm`);
    if (grasaPct.trim()) partesNota.push(`Grasa: ${grasaPct.trim()}%`);
    const notaFinal = partesNota.length > 0 ? partesNota.join(" | ") : null;

    setGuardandoMedicion(true);
    try {
      const res = await apiFetch(`/api/mediciones/cliente/${userId}`, {
        method: "POST",
        body: JSON.stringify({
          fecha,
          pesoKg: pesoNum,
          nota: notaFinal,
          fotoFrenteBase64: fotoFrente,
          fotoPerfilBase64: fotoPerfil,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje ?? "No se pudo guardar la medición.");
      }
      const nueva: Medicion = await res.json();
      const updated = [...mediciones, nueva].sort((a, b) => a.fecha.localeCompare(b.fecha));
      setMediciones(updated);
      setDespuesId(nueva.id);
      if (updated.length === 1) setAntesId(nueva.id);

      setPeso("");
      setNota("");
      setCinturaCm("");
      setGrasaPct("");
      setFotoFrente(null);
      setFotoPerfil(null);
      setFecha(hoyISO());

      toast({
        variant: "success",
        title: "¡Medición registrada con éxito!",
        description: `Se guardó el registro de ${pesoNum} kg para ${cliente?.nombre}.`,
      });
      setTabActiva("evolucion");
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err instanceof Error ? err.message : "Intentá de nuevo.",
      });
    } finally {
      setGuardandoMedicion(false);
    }
  };

  // Eliminar medición
  const handleConfirmarEliminar = async () => {
    if (!medicionAEliminar) return;
    const id = medicionAEliminar;
    const prev = mediciones;
    setMediciones((m) => m.filter((x) => x.id !== id));
    setMedicionAEliminar(null);

    const res = await apiFetch(`/api/mediciones/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMediciones(prev);
      toast({ variant: "destructive", title: "No se pudo eliminar la medición" });
    } else {
      toast({ variant: "success", title: "Medición eliminada" });
    }
  };

  // Guardar rutina semanal
  const handleGuardarRutina = async () => {
    setGuardandoRutina(true);
    try {
      const dias = Object.entries(rutina).map(([dia, descripcion]) => ({
        diaSemana: Number(dia),
        descripcion: descripcion.trim(),
      }));
      const res = await apiFetch(`/api/rutinas/cliente/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ dias }),
      });
      if (!res.ok) throw new Error();
      toast({
        variant: "success",
        title: "¡Rutina guardada con éxito!",
        description: "El socio ya puede ver su rutina actualizada desde su portal.",
      });
    } catch {
      toast({ variant: "destructive", title: "Error al guardar la rutina", description: "Intentá nuevamente." });
    } finally {
      setGuardandoRutina(false);
    }
  };

  // Aplicar plantilla rápida de rutina
  const aplicarPlantilla = (p: typeof PLANTILLAS_RUTINA[0]) => {
    setRutina((prev) => {
      const nueva: Record<number, string> = { ...prev };
      for (let i = 0; i <= 6; i++) {
        nueva[i] = p.dias[i] ?? "";
      }
      return nueva;
    });
    toast({
      variant: "success",
      title: `Plantilla aplicada: ${p.nombre}`,
      description: "Podés personalizar las series, repeticiones o ejercicios antes de guardar.",
    });
  };

  // Compartir ficha de progreso por WhatsApp
  const compartirProgresoWhatsApp = () => {
    if (!cliente) return "";
    const gymName = settings.nombreGimnasio || "FitCore";
    const deltaStr =
      metrics.deltaTotal === 0
        ? "0 kg (Mantenimiento)"
        : metrics.deltaTotal > 0
        ? `+${metrics.deltaTotal.toFixed(1)} kg (${metrics.deltaPct > 0 ? "+" : ""}${metrics.deltaPct.toFixed(1)}%)`
        : `${metrics.deltaTotal.toFixed(1)} kg (${metrics.deltaPct.toFixed(1)}%)`;

    let msg = `*RESUMEN DE EVOLUCIÓN - ${gymName.toUpperCase()}* 🏆\n\n`;
    msg += `¡Hola ${cliente.nombre}! Te compartimos el seguimiento de tu progreso:\n\n`;
    if (metrics.pesoActual !== null) {
      msg += `• *Peso Actual:* ${metrics.pesoActual} kg (${metrics.ultimaFecha ? formatFechaCorta(metrics.ultimaFecha) : ""})\n`;
      if (metrics.pesoInicial !== null && metrics.totalRegistros > 1) {
        msg += `• *Punto de Partida:* ${metrics.pesoInicial} kg\n`;
        msg += `• *Variación Acumulada:* ${deltaStr}\n`;
      }
    }
    if (cliente.asistenciasUltimos30Dias !== undefined) {
      msg += `• *Asistencias (últimos 30 días):* ${cliente.asistenciasUltimos30Dias} entrenamientos\n`;
    }
    msg += `\n¡Gran disciplina y constancia! Sigamos entrenando con todo hacia tus metas 💪🔥`;

    return buildWhatsAppUrl(cliente.telefono, msg) || "";
  };

  // Compartir rutina por WhatsApp
  const compartirRutinaWhatsApp = () => {
    if (!cliente) return "";
    const gymName = settings.nombreGimnasio || "FitCore";
    let msg = `*TU PLAN DE ENTRENAMIENTO - ${gymName.toUpperCase()}* 🏋️‍♂️\n\n`;
    msg += `¡Hola ${cliente.nombre}! Acá tenés tu rutina semanal asignada por tu entrenador:\n\n`;
    NOMBRES_DIA.forEach((nombre, idx) => {
      const texto = rutina[idx]?.trim();
      if (texto) {
        msg += `• *${nombre.toUpperCase()}:*\n  ${texto}\n\n`;
      } else {
        msg += `• *${nombre.toUpperCase()}:* _Descanso / Recuperación_\n\n`;
      }
    });
    msg += `¡A darlo todo en cada sesión! Si tenés dudas con alguna técnica o carga, consultanos en el salón 💥`;

    return buildWhatsAppUrl(cliente.telefono, msg) || "";
  };

  // Mediciones seleccionadas para antes/después
  const medicionAntes = useMemo(() => {
    return mediciones.find((m) => m.id === antesId) || mediciones[0] || null;
  }, [mediciones, antesId]);

  const medicionDespues = useMemo(() => {
    return (
      mediciones.find((m) => m.id === despuesId) ||
      mediciones[mediciones.length - 1] ||
      null
    );
  }, [mediciones, despuesId]);

  const deltaAntesDespues = useMemo(() => {
    if (!medicionAntes || !medicionDespues) return null;
    return medicionDespues.pesoKg - medicionAntes.pesoKg;
  }, [medicionAntes, medicionDespues]);

  // Datos para el gráfico de curva de peso
  const chartData = useMemo(() => {
    return mediciones.map((m) => ({
      id: m.id,
      fechaStr: formatFechaCorta(m.fecha),
      fechaIso: m.fecha,
      peso: m.pesoKg,
      nota: m.nota || "",
    }));
  }, [mediciones]);

  if (loading) {
    return (
      <div className="space-y-6 pb-12">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="space-y-4 pb-12">
        <button
          onClick={() => navigate("/clientes")}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Volver a Clientes
        </button>
        <ErrorState
          message="No se pudo cargar el progreso de este socio. Verificá la conexión y volvé a intentar."
          onRetry={cargar}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-14 animate-fade-in-up">
      {/* ── Botón Volver ── */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate("/clientes")}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Gestión de Clientes
        </button>
      </div>

      {/* ── Ficha de Cabecera del Socio ── */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/20 text-primary font-black text-xl flex items-center justify-center shrink-0 shadow-xs">
            {cliente.nombre.slice(0, 1).toUpperCase()}
            {cliente.apellido ? cliente.apellido.slice(0, 1).toUpperCase() : ""}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {cliente.nombre} {cliente.apellido}
              </h1>
              <Badge
                variant="outline"
                className={
                  cliente.activo
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs"
                    : "bg-slate-100 text-slate-600 border-slate-200 font-bold text-xs"
                }
              >
                {cliente.activo ? "Socio Activo" : "Inactivo"}
              </Badge>
              {cliente.planNombre && (
                <Badge variant="secondary" className="font-semibold text-xs rounded-lg">
                  {cliente.planNombre}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1.5 flex-wrap font-medium">
              {cliente.telefono && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {cliente.telefono}
                </span>
              )}
              {cliente.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {cliente.email}
                </span>
              )}
              <span className="flex items-center gap-1 text-slate-600 font-semibold">
                <Activity className="w-3.5 h-3.5 text-primary" />
                {cliente.asistenciasUltimos30Dias ?? 0} asistencias este mes
              </span>
            </div>
          </div>
        </div>

        {/* Acciones de Cabecera */}
        <div className="flex items-center gap-2 flex-wrap">
          {cliente.telefono && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = tabActiva === "rutina" ? compartirRutinaWhatsApp() : compartirProgresoWhatsApp();
                if (url) window.open(url, "_blank");
              }}
              className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold text-xs shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              {tabActiva === "rutina" ? "Enviar Rutina WhatsApp" : "Compartir Evolución"}
            </Button>
          )}

          <Button
            onClick={() => setTabActiva("nueva")}
            className="rounded-xl bg-primary hover:bg-primary/95 font-bold text-xs shadow-xs shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva Medición
          </Button>
        </div>
      </div>

      {/* ── KPIs Superiores Centrados y Calibrados ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Peso Actual */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Peso Actual</span>
          </div>
          <div className="my-1">
            {metrics.pesoActual !== null ? (
              <p className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-none">
                {metrics.pesoActual} <span className="text-base font-semibold text-slate-400">kg</span>
              </p>
            ) : (
              <p className="text-2xl font-black text-slate-400 tracking-tight leading-none">—</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0" />
            <span>
              {metrics.ultimaFecha ? `Registrado el ${formatFechaCorta(metrics.ultimaFecha)}` : "Sin registros aún"}
            </span>
          </div>
        </div>

        {/* 2. Peso Inicial */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Punto de Partida</span>
          </div>
          <div className="my-1">
            {metrics.pesoInicial !== null ? (
              <p className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-none">
                {metrics.pesoInicial} <span className="text-base font-semibold text-slate-400">kg</span>
              </p>
            ) : (
              <p className="text-2xl font-black text-slate-400 tracking-tight leading-none">—</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-blue-700 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>{mediciones[0] ? `Inicio: ${formatFechaCorta(mediciones[0].fecha)}` : "Primer control pendiente"}</span>
          </div>
        </div>

        {/* 3. Variación Total (Delta) */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                metrics.deltaTotal < 0
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
                  : metrics.deltaTotal > 0
                  ? "bg-blue-50 text-blue-600 border border-blue-200/60"
                  : "bg-slate-100 text-slate-600 border border-slate-200/60"
              }`}
            >
              {metrics.deltaTotal < 0 ? (
                <TrendingDown className="w-3.5 h-3.5" />
              ) : metrics.deltaTotal > 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <Minus className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Variación Neta</span>
          </div>
          <div className="my-1">
            {metrics.totalRegistros > 1 ? (
              <p
                className={`text-2xl sm:text-[28px] font-black tracking-tight leading-none ${
                  metrics.deltaTotal < 0
                    ? "text-emerald-700"
                    : metrics.deltaTotal > 0
                    ? "text-blue-700"
                    : "text-slate-900"
                }`}
              >
                {metrics.deltaTotal > 0 ? `+${metrics.deltaTotal.toFixed(1)}` : metrics.deltaTotal.toFixed(1)}{" "}
                <span className="text-base font-semibold text-slate-400">kg</span>
              </p>
            ) : (
              <p className="text-2xl font-black text-slate-400 tracking-tight leading-none">0.0 kg</p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium truncate w-full">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                metrics.deltaTotal < 0
                  ? "bg-emerald-500"
                  : metrics.deltaTotal > 0
                  ? "bg-blue-500"
                  : "bg-slate-400"
              }`}
            />
            <span
              className={
                metrics.deltaTotal < 0
                  ? "text-emerald-700"
                  : metrics.deltaTotal > 0
                  ? "text-blue-700"
                  : "text-slate-500"
              }
            >
              {metrics.totalRegistros > 1
                ? `${metrics.deltaPct > 0 ? "+" : ""}${metrics.deltaPct.toFixed(1)}% acumulado`
                : "Requiere 2+ mediciones"}
            </span>
          </div>
        </div>

        {/* 4. Rutina Semanal y Disciplina */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Plan de Rutina</span>
          </div>
          <div className="my-1">
            <p className="text-2xl sm:text-[28px] font-black text-slate-900 tracking-tight leading-none">
              {diasRutinaActivos} <span className="text-base font-semibold text-slate-400">días</span>
            </p>
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-700 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>{diasRutinaActivos > 0 ? `${diasRutinaActivos} de entreno / ${7 - diasRutinaActivos} descanso` : "Sin rutina asignada"}</span>
          </div>
        </div>
      </div>

      {/* ── Barra de Navegación por Pestañas ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTabActiva("evolucion")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tabActiva === "evolucion"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Evolución y Gráficos
          {mediciones.length > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tabActiva === "evolucion" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {mediciones.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("nueva")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tabActiva === "nueva"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Plus className="w-4 h-4" />
          Registrar Medición
        </button>

        <button
          type="button"
          onClick={() => setTabActiva("rutina")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            tabActiva === "rutina"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          Rutina Semanal
          {diasRutinaActivos > 0 && (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                tabActiva === "rutina" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700"
              }`}
            >
              {diasRutinaActivos}d
            </span>
          )}
        </button>
      </div>

      {/* ── CONTENIDO: PESTAÑA 1 - EVOLUCIÓN Y GRÁFICOS ── */}
      {tabActiva === "evolucion" && (
        <div className="space-y-6">
          {/* Gráfico de Peso */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Curva de Evolución de Peso Corporal
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Seguimiento cronológico de pesajes registrados en el gimnasio.
                </p>
              </div>
              {mediciones.length > 1 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-semibold text-slate-500">Tendencia:</span>
                  <Badge
                    variant="outline"
                    className={
                      metrics.deltaTotal < 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold"
                        : metrics.deltaTotal > 0
                        ? "bg-blue-50 text-blue-700 border-blue-200 font-bold"
                        : "bg-slate-50 text-slate-700 border-slate-200 font-bold"
                    }
                  >
                    {metrics.deltaTotal < 0
                      ? `En descenso (${metrics.deltaTotal.toFixed(1)} kg)`
                      : metrics.deltaTotal > 0
                      ? `En aumento (+${metrics.deltaTotal.toFixed(1)} kg)`
                      : "Peso estable"}
                  </Badge>
                </div>
              )}
            </div>

            {chartData.length < 2 ? (
              <div className="py-12 px-4 text-center space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Scale className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">Se necesitan al menos 2 mediciones para graficar la curva</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Cargá periódicamente el peso de {cliente.nombre} para visualizar su progreso y calcular la velocidad de cambio.
                </p>
                <Button
                  size="sm"
                  onClick={() => setTabActiva("nueva")}
                  className="rounded-xl font-bold text-xs bg-primary hover:bg-primary/95 mt-2"
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Agregar medición ahora
                </Button>
              </div>
            ) : (
              <div className="h-64 sm:h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pesoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--color-primary, #3b82f6)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="fechaStr"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      dy={5}
                    />
                    <YAxis
                      domain={["dataMin - 1", "dataMax + 1"]}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(val) => `${val}k`}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip
                          variant="line"
                          formatter={(v) => `${v} kg`}
                          labelFormatter={(label) => `Fecha: ${label}`}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="peso"
                      name="Peso Corporal"
                      stroke="var(--color-primary, #3b82f6)"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#pesoGradient)"
                      dot={{ r: 4, fill: "var(--color-primary, #3b82f6)", strokeWidth: 2, stroke: "#ffffff" }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* ── Comparador Visual "Antes y Después" ── */}
          {mediciones.length > 0 && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-600" />
                    Comparativa de Transformación (Antes y Después)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contrastá las fotografías iniciales y actuales para evaluar cambios en composición corporal.
                  </p>
                </div>

                {/* Selectores de medición para comparar */}
                {mediciones.length > 1 && (
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <span className="font-semibold text-slate-500">Comparar:</span>
                    <select
                      value={antesId ?? ""}
                      onChange={(e) => setAntesId(Number(e.target.value))}
                      className="rounded-xl border border-slate-200 bg-slate-50 py-1 px-2.5 text-xs font-semibold text-slate-700"
                    >
                      {mediciones.map((m) => (
                        <option key={`antes-${m.id}`} value={m.id}>
                          Antes: {formatFechaCorta(m.fecha)} ({m.pesoKg}kg)
                        </option>
                      ))}
                    </select>
                    <span className="text-slate-400">vs</span>
                    <select
                      value={despuesId ?? ""}
                      onChange={(e) => setDespuesId(Number(e.target.value))}
                      className="rounded-xl border border-slate-200 bg-slate-50 py-1 px-2.5 text-xs font-semibold text-slate-700"
                    >
                      {mediciones.map((m) => (
                        <option key={`despues-${m.id}`} value={m.id}>
                          Después: {formatFechaCorta(m.fecha)} ({m.pesoKg}kg)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Paneles lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* Lado ANTES */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-white border-slate-200 text-slate-700 font-bold text-xs">
                      ANTES
                    </Badge>
                    {medicionAntes && (
                      <span className="text-xs font-bold text-slate-900">
                        {formatFechaCompleta(medicionAntes.fecha)} · {medicionAntes.pesoKg} kg
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Foto Frente */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Frente
                      </span>
                      {medicionAntes?.fotoFrenteBase64 ? (
                        <div
                          onClick={() =>
                            setFotoModal({
                              url: medicionAntes.fotoFrenteBase64!,
                              titulo: `Foto de Frente - Antes (${formatFechaCorta(medicionAntes.fecha)})`,
                            })
                          }
                          className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-xs"
                        >
                          <img
                            src={medicionAntes.fotoFrenteBase64}
                            alt="Antes Frente"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-3">
                          <ImageOff className="w-6 h-6 mb-1 text-slate-300" />
                          <span>Sin foto de frente</span>
                        </div>
                      )}
                    </div>

                    {/* Foto Perfil */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Perfil
                      </span>
                      {medicionAntes?.fotoPerfilBase64 ? (
                        <div
                          onClick={() =>
                            setFotoModal({
                              url: medicionAntes.fotoPerfilBase64!,
                              titulo: `Foto de Perfil - Antes (${formatFechaCorta(medicionAntes.fecha)})`,
                            })
                          }
                          className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-xs"
                        >
                          <img
                            src={medicionAntes.fotoPerfilBase64}
                            alt="Antes Perfil"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-3">
                          <ImageOff className="w-6 h-6 mb-1 text-slate-300" />
                          <span>Sin foto de perfil</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lado DESPUÉS */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs">
                        DESPUÉS
                      </Badge>
                      {deltaAntesDespues !== null && (
                        <span
                          className={`text-xs font-black ${
                            deltaAntesDespues < 0
                              ? "text-emerald-700"
                              : deltaAntesDespues > 0
                              ? "text-blue-700"
                              : "text-slate-600"
                          }`}
                        >
                          {deltaAntesDespues > 0 ? `+${deltaAntesDespues.toFixed(1)}` : deltaAntesDespues.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    {medicionDespues && (
                      <span className="text-xs font-bold text-slate-900">
                        {formatFechaCompleta(medicionDespues.fecha)} · {medicionDespues.pesoKg} kg
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Foto Frente */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Frente
                      </span>
                      {medicionDespues?.fotoFrenteBase64 ? (
                        <div
                          onClick={() =>
                            setFotoModal({
                              url: medicionDespues.fotoFrenteBase64!,
                              titulo: `Foto de Frente - Actual (${formatFechaCorta(medicionDespues.fecha)})`,
                            })
                          }
                          className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-xs"
                        >
                          <img
                            src={medicionDespues.fotoFrenteBase64}
                            alt="Después Frente"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-3">
                          <ImageOff className="w-6 h-6 mb-1 text-slate-300" />
                          <span>Sin foto de frente</span>
                        </div>
                      )}
                    </div>

                    {/* Foto Perfil */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Perfil
                      </span>
                      {medicionDespues?.fotoPerfilBase64 ? (
                        <div
                          onClick={() =>
                            setFotoModal({
                              url: medicionDespues.fotoPerfilBase64!,
                              titulo: `Foto de Perfil - Actual (${formatFechaCorta(medicionDespues.fecha)})`,
                            })
                          }
                          className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-slate-200 cursor-pointer shadow-xs"
                        >
                          <img
                            src={medicionDespues.fotoPerfilBase64}
                            alt="Después Perfil"
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye className="w-5 h-5" />
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-[3/4] rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs text-center p-3">
                          <ImageOff className="w-6 h-6 mb-1 text-slate-300" />
                          <span>Sin foto de perfil</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Historial Cronológico de Mediciones ── */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Historial Detallado de Controles</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Registro completo de pesajes, notas de sensaciones y registro fotográfico.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400">
                {mediciones.length} {mediciones.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            {mediciones.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm space-y-2">
                <Scale className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="font-semibold text-slate-600">Todavía no hay mediciones cargadas para este cliente.</p>
                <p className="text-xs text-slate-400">Registrá la primera medición para inaugurar su ficha de seguimiento.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {[...mediciones].reverse().map((m, i) => {
                  const ant = mediciones[mediciones.length - 2 - i];
                  const dif = ant ? m.pesoKg - ant.pesoKg : 0;
                  return (
                    <div
                      key={m.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {/* Miniaturas de fotos */}
                        <div className="flex -space-x-2 shrink-0">
                          {[
                            { foto: m.fotoFrenteBase64, etiqueta: "Frente" },
                            { foto: m.fotoPerfilBase64, etiqueta: "Perfil" },
                          ].map((item, idx) =>
                            item.foto ? (
                              <div
                                key={idx}
                                onClick={() =>
                                  setFotoModal({
                                    url: item.foto!,
                                    titulo: `Foto de ${item.etiqueta} (${formatFechaCorta(m.fecha)})`,
                                  })
                                }
                                className="w-11 h-11 rounded-xl overflow-hidden border-2 border-white shadow-xs cursor-pointer hover:scale-110 transition-transform relative"
                              >
                                <img src={item.foto} alt="" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div
                                key={idx}
                                className="w-11 h-11 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-slate-300"
                              >
                                <ImageOff className="w-4 h-4" />
                              </div>
                            )
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="text-base font-black text-slate-900">{m.pesoKg} kg</span>
                            {ant && (
                              <span
                                className={`text-xs font-bold ${
                                  dif < 0 ? "text-emerald-600" : dif > 0 ? "text-blue-600" : "text-slate-400"
                                }`}
                              >
                                {dif > 0 ? `+${dif.toFixed(1)}` : dif.toFixed(1)} kg
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {formatFechaCompleta(m.fecha)}
                            {m.nota && <span className="text-slate-700 font-medium"> · {m.nota}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setMedicionAEliminar(m.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-8 px-2.5 text-xs font-semibold"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTENIDO: PESTAÑA 2 - NUEVA MEDICIÓN ── */}
      {tabActiva === "nueva" && (
        <form
          onSubmit={handleAgregarMedicion}
          className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6 max-w-3xl mx-auto"
        >
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Cargar Nuevo Control Físico
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Registrá el peso actual, medidas opcionales y fotos de progreso para {cliente.nombre}.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700">Fecha del Pesaje</Label>
              <Input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700">Peso Corporal (kg)</Label>
                {metrics.pesoActual !== null && (
                  <span className="text-[11px] font-semibold text-slate-400">
                    Último: {metrics.pesoActual} kg
                  </span>
                )}
              </div>
              <Input
                type="number"
                step="0.1"
                min="20"
                max="350"
                placeholder="Ej: 78.5"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                required
                className="rounded-xl text-base font-bold"
              />
            </div>
          </div>

          {/* Medidas opcionales */}
          <div className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Medidas Antropométricas Opcionales</span>
              <span className="text-[11px] text-slate-400 font-medium">Recomendado cada 30 días</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">Perímetro de Cintura (cm)</Label>
                <Input
                  type="number"
                  step="0.5"
                  placeholder="Ej: 82.5"
                  value={cinturaCm}
                  onChange={(e) => setCinturaCm(e.target.value)}
                  className="rounded-xl bg-white h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-600">% Grasa Estimado (BIA o plicómetro)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 16.5"
                  value={grasaPct}
                  onChange={(e) => setGrasaPct(e.target.value)}
                  className="rounded-xl bg-white h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Notas / Sensaciones del Socio</Label>
            <Input
              placeholder="Ej: Buena adherencia al plan, aumentó cargas en prensa, descansó bien..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="rounded-xl text-xs"
            />
          </div>

          {/* Carga de Fotos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Foto Frente */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                Foto de Frente (opcional)
              </Label>
              {fotoFrente ? (
                <div className="relative aspect-[3/4] w-36 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <img src={fotoFrente} alt="Preview Frente" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotoFrente(null)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors text-center">
                  <Camera className="w-6 h-6 text-slate-400 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-700">Subir foto frontal</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG o PNG hasta 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFoto(e, setFotoFrente)}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Foto Perfil */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-slate-500" />
                Foto de Perfil (opcional)
              </Label>
              {fotoPerfil ? (
                <div className="relative aspect-[3/4] w-36 rounded-xl overflow-hidden border border-slate-200 shadow-xs">
                  <img src={fotoPerfil} alt="Preview Perfil" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setFotoPerfil(null)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 hover:bg-slate-50 transition-colors text-center">
                  <Camera className="w-6 h-6 text-slate-400 mb-1.5" />
                  <span className="text-xs font-semibold text-slate-700">Subir foto lateral</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG o PNG hasta 5MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFoto(e, setFotoPerfil)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setTabActiva("evolucion")}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={guardandoMedicion}
              className="rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs h-10 px-6 shadow-sm shadow-primary/20"
            >
              {guardandoMedicion ? "Guardando Registro..." : "Guardar Medición"}
            </Button>
          </div>
        </form>
      )}

      {/* ── CONTENIDO: PESTAÑA 3 - RUTINA SEMANAL ── */}
      {tabActiva === "rutina" && (
        <div className="space-y-6">
          {/* Selector de Plantillas Rápidas */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Cargar Plantilla de Rutina Rápida (1 Clic)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cargá una estructura base prediseñada y ajustá los ejercicios según la necesidad del socio.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PLANTILLAS_RUTINA.map((p, idx) => (
                <div
                  key={idx}
                  onClick={() => aplicarPlantilla(p)}
                  className="bg-slate-50/70 border border-slate-200/80 hover:border-primary/40 hover:bg-primary/[0.02] rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between space-y-2 group shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {p.nombre}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold bg-white border-slate-200 mb-1.5">
                      {p.badge}
                    </Badge>
                    <p className="text-[11px] text-slate-500 line-clamp-2">{p.descripcion}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs font-bold text-primary group-hover:bg-primary group-hover:text-white rounded-lg h-7 mt-1"
                  >
                    Usar Plantilla
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Editor Día a Día */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-primary" />
                  Plan Semanal Asignado
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Dejá el campo vacío para los días de descanso o recuperación activa.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {cliente.telefono && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const url = compartirRutinaWhatsApp();
                      if (url) window.open(url, "_blank");
                    }}
                    className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 text-xs font-bold"
                  >
                    <Share2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Enviar al WhatsApp
                  </Button>
                )}

                <Button
                  onClick={handleGuardarRutina}
                  loading={guardandoRutina}
                  className="rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs h-9 px-4 shadow-sm shadow-primary/20"
                >
                  {!guardandoRutina && <Save className="w-3.5 h-3.5 mr-1.5" />}
                  {guardandoRutina ? "Guardando..." : "Guardar Rutina"}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {NOMBRES_DIA.map((nombre, idx) => {
                const tieneTexto = Boolean(rutina[idx]?.trim());
                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border transition-all ${
                      tieneTexto
                        ? "bg-white border-slate-200 shadow-2xs"
                        : "bg-slate-50/50 border-slate-200/60"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            tieneTexto ? "bg-primary" : "bg-slate-300"
                          }`}
                        />
                        {nombre}
                      </Label>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          tieneTexto
                            ? "bg-primary/5 text-primary border-primary/20"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}
                      >
                        {tieneTexto ? "Entrenamiento" : "Descanso"}
                      </Badge>
                    </div>

                    <textarea
                      rows={3}
                      placeholder="Ej: Pecho y tríceps: Press banca 4x8, Aperturas 3x12, Fondos 3x10... (Dejar vacío para descanso)"
                      value={rutina[idx] ?? ""}
                      onChange={(e) => setRutina((prev) => ({ ...prev, [idx]: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-500">
                {diasRutinaActivos} {diasRutinaActivos === 1 ? "día con entrenamiento asignado" : "días con entrenamiento asignados"}
              </span>
              <Button
                onClick={handleGuardarRutina}
                loading={guardandoRutina}
                className="rounded-xl bg-primary hover:bg-primary/95 text-white font-bold text-xs h-9 px-5 shadow-sm shadow-primary/20"
              >
                {!guardandoRutina && <Save className="w-3.5 h-3.5 mr-1.5" />}
                {guardandoRutina ? "Guardando..." : "Guardar Rutina"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal / Lightbox de Foto Ampliada ── */}
      {fotoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setFotoModal(null)}
        >
          <div
            className="relative bg-white rounded-2xl p-3 max-w-2xl max-h-[90vh] flex flex-col items-center overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full px-2 py-1 mb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">{fotoModal.titulo}</span>
              <button
                type="button"
                onClick={() => setFotoModal(null)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={fotoModal.url}
              alt={fotoModal.titulo}
              className="max-h-[75vh] w-auto rounded-xl object-contain"
            />
          </div>
        </div>
      )}

      {/* ── Modal de Confirmación para Eliminar Medición ── */}
      {medicionAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">¿Eliminar medición?</h3>
            </div>
            <p className="text-xs text-slate-500">
              Esta acción eliminará el registro de peso y sus fotos de forma permanente.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMedicionAEliminar(null)}
                className="rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleConfirmarEliminar}
                className="rounded-xl text-xs font-bold"
              >
                Sí, eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
