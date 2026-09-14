import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  CalendarX,
  TrendingUp,
  Phone,
  Mail,
  Users,
  MessageCircle,
  HeartPulse,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  Download,
  Eye,
  DollarSign,
  ShieldCheck,
  AlertCircle,
  Clock,
  X,
  UserPlus,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Tags
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PersonaAvatar from "@/components/ui/persona-avatar";
import { apiFetch } from "@/lib/api";
import { buildWhatsAppUrl } from "@/lib/utils";
import { useGymSettings } from "@/context/GymSettingsContext";

// ── Tipos ──────────────────────────────────────────────────

export type Cliente = {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string;
  fechaAlta: string;
  activo: boolean;
  categoria: number;
  planId: number | null;
  planNombre: string | null;
  membresiaVence: string | null;
  aptoMedicoVence: string | null;
  contactoEmergenciaNombre?: string | null;
  contactoEmergenciaTelefono?: string | null;
  contactoEmergenciaRelacion?: string | null;
  totalPagado?: number;
  totalAsistencias?: number;
  asistenciasUltimos30Dias?: number;
  ultimaAsistencia?: string | null;
};

export type ClienteBadgeInfo = {
  id: "vip" | "frecuente" | "en_riesgo" | "baja_frecuencia" | "fiel" | "nuevo";
  label: string;
  icon: typeof Sparkles;
  className: string;
  iconClassName: string;
  tooltip: string;
};

const BADGE_NOMBRES: Record<string, string> = {
  vip: "Mayor Aporte (VIP)",
  frecuente: "Atleta Frecuente",
  en_riesgo: "En Riesgo (+14d)",
  baja_frecuencia: "Baja Asistencia",
  fiel: "Socio Fiel (+6m)",
  nuevo: "Nuevo Socio (<30d)",
};

type Plan = {
  id: number;
  nombre: string;
  precio: number;
};

const METODOS_PAGO = ["Efectivo", "Transferencia", "Débito", "Crédito"];

// Genera los últimos 3 meses + el actual
function generarPeriodos() {
  const hoy = new Date();
  return Array.from({ length: 4 }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    return {
      mes: d.getMonth() + 1,
      anio: d.getFullYear(),
      label: d.toLocaleDateString("es-AR", { month: "long", year: "numeric" }),
    };
  });
}

const PERIODOS = generarPeriodos();

// ── Funciones de Estado y Vencimiento ─────────────────────

function getDiasRestantes(fechaVence: string | null): { diff: number; texto: string; urgente: boolean } | null {
  if (!fechaVence) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVence);
  vence.setHours(0, 0, 0, 0);
  const diff = Math.ceil((vence.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return { diff, texto: "Vencida", urgente: true };
  if (diff === 0) return { diff, texto: "Vence hoy", urgente: true };
  if (diff === 1) return { diff, texto: "Vence mañana", urgente: true };
  return { diff, texto: `${diff} días`, urgente: diff <= 7 };
}

function getEstadoApto(fechaVence: string | null): { vencido: boolean; texto: string; className: string } {
  if (!fechaVence) {
    return { vencido: true, texto: "Sin apto médico", className: "text-amber-600 bg-amber-50 border-amber-200" };
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vence = new Date(fechaVence);
  if (vence.getTime() < hoy.getTime()) {
    return { vencido: true, texto: "Apto médico vencido", className: "text-rose-600 bg-rose-50 border-rose-200" };
  }
  return { vencido: false, texto: "Apto al día", className: "text-emerald-700 bg-emerald-50 border-emerald-200" };
}

// ── Cálculo Inteligente de Badges por Cliente ──────────────

function calcularBadgesCliente(
  c: Cliente,
  maxPagado: number,
  maxAsistencias30d: number
): ClienteBadgeInfo[] {
  const badges: ClienteBadgeInfo[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const pagado = c.totalPagado ?? 0;
  const asistencias30d = c.asistenciasUltimos30Dias ?? 0;
  const fechaAlta = new Date(c.fechaAlta);
  const diasDesdeAlta = Math.floor((hoy.getTime() - fechaAlta.getTime()) / (1000 * 60 * 60 * 24));

  // 1. Mayor Aporte (VIP)
  if (pagado > 0 && (pagado === maxPagado || pagado >= 50000 || (maxPagado > 0 && pagado >= maxPagado * 0.75))) {
    badges.push({
      id: "vip",
      label: "Mayor Aporte",
      icon: Sparkles,
      className: "text-amber-800 bg-amber-50/80 border-amber-200/90",
      iconClassName: "text-amber-600",
      tooltip: `Socio VIP: Facturación acumulada de $${pagado.toLocaleString()} en cuotas y pagos.`,
    });
  }

  // 2. Atleta Frecuente (Más Asistencias en los últimos 30 días)
  if (asistencias30d >= 12 || (maxAsistencias30d > 0 && asistencias30d === maxAsistencias30d)) {
    badges.push({
      id: "frecuente",
      label: "Atleta Frecuente",
      icon: Zap,
      className: "text-orange-800 bg-orange-50/80 border-orange-200/90",
      iconClassName: "text-orange-600",
      tooltip: `¡Gran disciplina! ${asistencias30d} asistencias registradas en los últimos 30 días.`,
    });
  }

  // 3. En Riesgo / Inactivo (+14 días sin ir con plan activo)
  if (c.activo && c.planNombre) {
    if (c.ultimaAsistencia) {
      const ultAsis = new Date(c.ultimaAsistencia);
      const diasSinIr = Math.floor((hoy.getTime() - ultAsis.getTime()) / (1000 * 60 * 60 * 24));
      if (diasSinIr >= 14) {
        badges.push({
          id: "en_riesgo",
          label: `Ausente (+${diasSinIr}d)`,
          icon: Clock,
          className: "text-rose-800 bg-rose-50/80 border-rose-200/90",
          iconClassName: "text-rose-600",
          tooltip: `Riesgo de baja: Pasaron ${diasSinIr} días desde su último entrenamiento (${new Date(c.ultimaAsistencia).toLocaleDateString("es-AR")}).`,
        });
      }
    } else {
      badges.push({
        id: "en_riesgo",
        label: "Sin Asistencias",
        icon: AlertCircle,
        className: "text-rose-800 bg-rose-50/80 border-rose-200/90",
        iconClassName: "text-rose-600",
        tooltip: "Tiene plan asignado pero nunca ha registrado un ingreso al gimnasio.",
      });
    }
  }

  // 4. Baja Asistencia (1 a 2 veces en 30 días, si no tiene ya badge de en_riesgo)
  if (
    c.activo &&
    c.planNombre &&
    asistencias30d > 0 &&
    asistencias30d <= 2 &&
    !badges.some((b) => b.id === "en_riesgo")
  ) {
    badges.push({
      id: "baja_frecuencia",
      label: "Baja Asistencia",
      icon: AlertCircle,
      className: "text-slate-700 bg-slate-50/80 border-slate-200/90",
      iconClassName: "text-slate-500",
      tooltip: `Poco uso del pase: Solo ${asistencias30d} ${asistencias30d === 1 ? "asistencia" : "asistencias"} en el mes.`,
    });
  }

  // 5. Socio Fiel / Veterano (+180 días de antigüedad)
  if (diasDesdeAlta >= 180) {
    const meses = Math.floor(diasDesdeAlta / 30);
    badges.push({
      id: "fiel",
      label: "Socio Fiel",
      icon: ShieldCheck,
      className: "text-indigo-800 bg-indigo-50/80 border-indigo-200/90",
      iconClassName: "text-indigo-600",
      tooltip: `Miembro leal con más de ${meses} meses de antigüedad continua.`,
    });
  }

  // 6. Nuevo Socio (primeros 30 días)
  if (diasDesdeAlta <= 30) {
    badges.push({
      id: "nuevo",
      label: "Nuevo Socio",
      icon: UserPlus,
      className: "text-teal-800 bg-teal-50/80 border-teal-200/90",
      iconClassName: "text-teal-600",
      tooltip: `Nuevo ingreso: Se sumó hace ${diasDesdeAlta === 0 ? "hoy" : `${diasDesdeAlta} días`}.`,
    });
  }

  return badges;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Vistas
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroRapido, setFiltroRapido] = useState<"todos" | "alDia" | "porVencer" | "vencidos" | "aptoVencido">("todos");
  const [filtroPlan, setFiltroPlan] = useState<string>("todos");
  const [filtroEstadoUsuario, setFiltroEstadoUsuario] = useState<"todos" | "activos" | "inactivos">("activos");
  const [filtroBadge, setFiltroBadge] = useState<string>("todos");

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(9);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: "",
    apellido: "",
    telefono: "",
    email: "",
    activo: true,
    aptoMedicoVence: "",
    contactoEmergenciaNombre: "",
    contactoEmergenciaTelefono: "",
    contactoEmergenciaRelacion: "",
  });
  const [editPlanId, setEditPlanId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Cliente | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Baja Membresía modal
  const [bajaModalOpen, setBajaModalOpen] = useState(false);
  const [clienteBaja, setClienteBaja] = useState<Cliente | null>(null);
  const [motivoBaja, setMotivoBaja] = useState("Económico / Presupuesto");
  const [observacionBaja, setObservacionBaja] = useState("");
  const [procesandoBaja, setProcesandoBaja] = useState(false);

  // Ficha 360 modal
  const [fichaOpen, setFichaOpen] = useState(false);
  const [clienteFicha, setClienteFicha] = useState<Cliente | null>(null);

  // Cobro Express modal
  const [cobroOpen, setCobroOpen] = useState(false);
  const [clienteCobro, setClienteCobro] = useState<Cliente | null>(null);
  const [cobroPeriodoMes, setCobroPeriodoMes] = useState<number>(PERIODOS[0].mes);
  const [cobroPeriodoAnio, setCobroPeriodoAnio] = useState<number>(PERIODOS[0].anio);
  const [cobroMonto, setCobroMonto] = useState<string>("");
  const [cobroMetodo, setCobroMetodo] = useState<string>("Efectivo");
  const [cobroNota, setCobroNota] = useState<string>("");
  const [cobroLoading, setCobroLoading] = useState(false);

  // Check-in rápido
  const [checkingInId, setCheckingInId] = useState<string | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { settings } = useGymSettings();

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [clientesData, planesData] = await Promise.all([
        apiFetch("/api/usuarios?categoria=Cliente").then((res) => res.json()),
        apiFetch("/api/planes").then((res) => res.json()),
      ]);
      setClientes(clientesData);
      setPlanes(planesData);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar datos",
        description: "No se pudieron obtener los clientes y planes.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Reset de página al cambiar filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda, filtroRapido, filtroPlan, filtroEstadoUsuario, filtroBadge, porPagina]);

  // ── Estadísticas Globales para Badges ─────────────────────
  const { maxPagado, maxAsistencias30d } = useMemo(() => {
    let maxP = 0;
    let maxA = 0;
    clientes.forEach((c) => {
      if ((c.totalPagado ?? 0) > maxP) maxP = c.totalPagado ?? 0;
      if ((c.asistenciasUltimos30Dias ?? 0) > maxA) maxA = c.asistenciasUltimos30Dias ?? 0;
    });
    return { maxPagado: maxP, maxAsistencias30d: maxA };
  }, [clientes]);

  // Mapa de Badges para búsqueda rápida
  const badgesPorCliente = useMemo(() => {
    const map = new Map<string, ClienteBadgeInfo[]>();
    clientes.forEach((c) => {
      map.set(c.id, calcularBadgesCliente(c, maxPagado, maxAsistencias30d));
    });
    return map;
  }, [clientes, maxPagado, maxAsistencias30d]);

  // ── Métricas Operativas (KPIs) ───────────────────────────
  const metrics = useMemo(() => {
    let alDia = 0;
    let porVencer = 0;
    let vencidos = 0;
    let aptoVencido = 0;
    let activos = 0;
    let inactivos = 0;

    clientes.forEach((c) => {
      if (c.activo) activos++;
      else inactivos++;

      const dias = getDiasRestantes(c.membresiaVence);
      const apto = getEstadoApto(c.aptoMedicoVence);

      if (apto.vencido && c.activo) {
        aptoVencido++;
      }

      if (!c.activo) return;

      if (!c.planNombre || !dias || dias.diff < 0) {
        vencidos++;
      } else if (dias.diff <= 7) {
        porVencer++;
      } else {
        alDia++;
      }
    });

    return {
      total: clientes.length,
      activos,
      inactivos,
      alDia,
      porVencer,
      vencidos,
      aptoVencido,
    };
  }, [clientes]);

  // ── Filtrado Integral ─────────────────────────────────────
  const clientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    return clientes.filter((c) => {
      // 1. Filtro de búsqueda universal
      if (q) {
        const nombreCompleto = `${c.nombre} ${c.apellido}`.toLowerCase();
        const email = (c.email ?? "").toLowerCase();
        const tel = (c.telefono ?? "").toLowerCase();
        const coincide =
          nombreCompleto.includes(q) ||
          email.includes(q) ||
          tel.includes(q);
        if (!coincide) return false;
      }

      // 2. Filtro estado del usuario (activo/inactivo)
      if (filtroEstadoUsuario === "activos" && !c.activo) return false;
      if (filtroEstadoUsuario === "inactivos" && c.activo) return false;

      // 3. Filtro de Plan
      if (filtroPlan !== "todos") {
        if (filtroPlan === "sin_plan" && c.planId !== null) return false;
        if (filtroPlan !== "sin_plan" && String(c.planId) !== filtroPlan) return false;
      }

      // 4. Filtro por Badge Inteligente
      if (filtroBadge !== "todos") {
        const badges = badgesPorCliente.get(c.id) ?? [];
        if (!badges.some((b) => b.id === filtroBadge)) return false;
      }

      // 5. Filtro Rápido KPI
      const dias = getDiasRestantes(c.membresiaVence);
      const apto = getEstadoApto(c.aptoMedicoVence);

      if (filtroRapido === "alDia") {
        if (!c.activo || !c.planNombre || !dias || dias.diff <= 7) return false;
      } else if (filtroRapido === "porVencer") {
        if (!c.activo || !c.planNombre || !dias || dias.diff < 0 || dias.diff > 7) return false;
      } else if (filtroRapido === "vencidos") {
        if (!c.activo || (c.planNombre && dias && dias.diff >= 0)) return false;
      } else if (filtroRapido === "aptoVencido") {
        if (!c.activo || !apto.vencido) return false;
      }

      return true;
    });
  }, [clientes, busqueda, filtroEstadoUsuario, filtroPlan, filtroBadge, filtroRapido, badgesPorCliente]);

  // ── Paginación ────────────────────────────────────────────
  const totalPaginas = Math.max(1, Math.ceil(clientesFiltrados.length / porPagina));
  const indiceInicio = (paginaActual - 1) * porPagina;
  const indiceFin = Math.min(indiceInicio + porPagina, clientesFiltrados.length);
  const clientesPaginados = useMemo(() => {
    return clientesFiltrados.slice(indiceInicio, indiceFin);
  }, [clientesFiltrados, indiceInicio, indiceFin]);

  // ── Generador de WhatsApp contextual ──────────────────────
  const getContextualWhatsAppUrl = (c: Cliente) => {
    const dias = getDiasRestantes(c.membresiaVence);
    const gymName = settings.nombreGimnasio ?? "FitCore";

    let mensaje = `Hola ${c.nombre}! Te escribimos desde ${gymName}.`;
    if (!c.activo) {
      mensaje = `Hola ${c.nombre}! Te escribimos desde ${gymName}. Queríamos saber cómo estás y si te gustaría retomar tu entrenamiento con nosotros!`;
    } else if (!c.planNombre || (dias && dias.diff < 0)) {
      mensaje = `Hola ${c.nombre}! Te escribimos desde ${gymName} para recordarte que tu membresía se encuentra vencida. ¡Escribinos para renovarla y seguir entrenando!`;
    } else if (dias && dias.diff <= 7) {
      mensaje = `Hola ${c.nombre}! Te escribimos desde ${gymName} para recordarte que tu plan ${c.planNombre} vence en ${dias.texto}. ¡Te esperamos para renovarlo!`;
    }

    return buildWhatsAppUrl(c.telefono, mensaje);
  };

  // ── Fast Desk Operation: Check-in Manual ─────────────────
  const handleCheckIn = async (c: Cliente) => {
    setCheckingInId(c.id);
    const ahora = new Date();
    const fecha = ahora.toISOString().split("T")[0];
    const horaIngreso = ahora.toTimeString().split(" ")[0];

    try {
      const res = await apiFetch("/api/asistencias", {
        method: "POST",
        body: JSON.stringify({
          userId: c.id,
          fecha,
          horaIngreso,
        }),
      });

      if (!res.ok) throw new Error("Error al registrar asistencia");

      toast({
        variant: "success",
        title: "¡Asistencia registrada!",
        description: `Se registró el ingreso de ${c.nombre} ${c.apellido} (${horaIngreso.slice(0, 5)} hs).`,
      });

      // Refrescar para sumar la asistencia
      cargarDatos();
    } catch {
      toast({
        variant: "destructive",
        title: "Error en Check-in",
        description: "No se pudo registrar la asistencia en este momento.",
      });
    } finally {
      setCheckingInId(null);
    }
  };

  // ── Fast Desk Operation: Cobro Express ────────────────────
  const openCobro = (c: Cliente) => {
    setClienteCobro(c);
    const plan = planes.find((p) => p.id === c.planId);
    setCobroMonto(plan ? String(plan.precio) : "");
    setCobroPeriodoMes(PERIODOS[0].mes);
    setCobroPeriodoAnio(PERIODOS[0].anio);
    setCobroMetodo("Efectivo");
    setCobroNota("");
    setCobroOpen(true);
  };

  const handleConfirmarCobro = async () => {
    if (!clienteCobro) return;
    const montoNum = parseFloat(cobroMonto);
    if (isNaN(montoNum) || montoNum <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "Ingresá un monto mayor a 0.",
      });
      return;
    }

    setCobroLoading(true);
    try {
      const res = await apiFetch("/api/pagos", {
        method: "POST",
        body: JSON.stringify({
          userId: clienteCobro.id,
          monto: montoNum,
          metodo: cobroMetodo,
          nota: cobroNota.trim() || undefined,
          periodoMes: cobroPeriodoMes,
          periodoAnio: cobroPeriodoAnio,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al registrar el cobro");
      }

      toast({
        variant: "success",
        title: "¡Cobro registrado con éxito!",
        description: `Se cobraron $${montoNum.toLocaleString()} a ${clienteCobro.nombre} (${cobroMetodo}).`,
      });

      setCobroOpen(false);
      setClienteCobro(null);
      // Refrescar clientes para actualizar membresía y total aportado
      cargarDatos();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error al cobrar",
        description: err instanceof Error ? err.message : "No se pudo procesar el pago.",
      });
    } finally {
      setCobroLoading(false);
    }
  };

  // ── Fast Desk Operation: Ficha 360 ────────────────────────
  const openFicha = (c: Cliente) => {
    setClienteFicha(c);
    setFichaOpen(true);
  };

  // ── Edición de Cliente ────────────────────────────────────
  const openEdit = (c: Cliente) => {
    setEditing(c);
    setEditForm({
      nombre: c.nombre ?? "",
      apellido: c.apellido ?? "",
      telefono: c.telefono ?? "",
      email: c.email ?? "",
      activo: c.activo,
      aptoMedicoVence: c.aptoMedicoVence ?? "",
      contactoEmergenciaNombre: c.contactoEmergenciaNombre ?? "",
      contactoEmergenciaTelefono: c.contactoEmergenciaTelefono ?? "",
      contactoEmergenciaRelacion: c.contactoEmergenciaRelacion ?? "",
    });
    setEditPlanId(c.planId ? String(c.planId) : "");
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);

    const payload = {
      nombre: editForm.nombre,
      apellido: editForm.apellido,
      telefono: editForm.telefono,
      email: editForm.email,
      activo: editForm.activo,
      categoria: editing.categoria ?? 2,
      aptoMedicoVence: editForm.aptoMedicoVence ? editForm.aptoMedicoVence : null,
      contactoEmergenciaNombre: editForm.contactoEmergenciaNombre.trim() || null,
      contactoEmergenciaTelefono: editForm.contactoEmergenciaTelefono.trim() || null,
      contactoEmergenciaRelacion: editForm.contactoEmergenciaRelacion.trim() || null,
    };

    try {
      const res = await apiFetch(`/api/usuarios/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("PUT failed");

      let planIdFinal = editing.planId;
      let planNombreFinal = editing.planNombre;
      let membresiaVenceFinal = editing.membresiaVence;

      // Sin plan seleccionado y antes tenía
      if (!editPlanId && editing.planId) {
        const bajaRes = await apiFetch(`/api/membresias/${editing.id}/activa`, { method: "DELETE" });
        if (bajaRes.ok) {
          planIdFinal = null;
          planNombreFinal = null;
          membresiaVenceFinal = null;
        }
      }

      // Nuevo plan seleccionado
      if (editPlanId && editPlanId !== String(editing.planId)) {
        const membresiaRes = await apiFetch("/api/membresias", {
          method: "POST",
          body: JSON.stringify({ userId: editing.id, planId: parseInt(editPlanId) }),
        });
        if (membresiaRes.ok) {
          const mData = await membresiaRes.json();
          planIdFinal = parseInt(editPlanId);
          planNombreFinal = planes.find((p) => p.id === parseInt(editPlanId))?.nombre ?? null;
          membresiaVenceFinal = mData.fechaFin;
        }
      }

      setClientes((prev) =>
        prev.map((c) =>
          c.id === editing.id
            ? {
                ...c,
                ...payload,
                planId: planIdFinal,
                planNombre: planNombreFinal,
                membresiaVence: membresiaVenceFinal,
              }
            : c
        )
      );

      // Si la ficha 360 está abierta para este cliente, actualizarla
      if (clienteFicha?.id === editing.id) {
        setClienteFicha((prev) => (prev ? { ...prev, ...payload, planId: planIdFinal, planNombre: planNombreFinal, membresiaVence: membresiaVenceFinal } : null));
      }

      setEditOpen(false);
      setEditing(null);
      toast({
        variant: "success",
        title: "Cliente actualizado",
        description: "Los cambios se guardaron correctamente.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo actualizar",
        description: "Revisá los datos e intentá nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Activar / Desactivar ──────────────────────────────────
  const handleToggleActivo = async (c: Cliente) => {
    setTogglingId(c.id);
    try {
      if (c.activo) {
        const res = await apiFetch(`/api/usuarios/${c.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("DELETE failed");
        setClientes((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: false } : x)));
        toast({ variant: "success", title: "Cliente desactivado", description: "El cliente quedó inactivo." });
      } else {
        const payload = { ...c, activo: true };
        const res = await apiFetch(`/api/usuarios/${c.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("PUT failed");
        setClientes((prev) => prev.map((x) => (x.id === c.id ? { ...x, activo: true } : x)));
        toast({ variant: "success", title: "Cliente reactivado", description: "El cliente quedó activo." });
      }
    } catch {
      toast({ variant: "destructive", title: "Acción fallida", description: "No se pudo cambiar el estado." });
    } finally {
      setTogglingId(null);
    }
  };

  // ── Eliminar Permanente ───────────────────────────────────
  const openDelete = (c: Cliente) => {
    setDeleting(c);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await apiFetch(`/api/usuarios/${deleting.id}/permanente`, { method: "DELETE" });
      if (!res.ok) throw new Error("DELETE failed");
      setClientes((prev) => prev.filter((c) => c.id !== deleting.id));
      setDeleteOpen(false);
      setDeleting(null);
      toast({ variant: "success", title: "Cliente eliminado", description: "El registro fue removido permanentemente." });
    } catch {
      toast({ variant: "destructive", title: "No se pudo eliminar", description: "Intentá nuevamente." });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Dar de Baja Membresía ─────────────────────────────────
  const openBaja = (c: Cliente) => {
    setClienteBaja(c);
    setMotivoBaja("Económico / Presupuesto");
    setObservacionBaja("");
    setBajaModalOpen(true);
  };

  const handleConfirmarBaja = async () => {
    if (!clienteBaja) return;
    setProcesandoBaja(true);
    try {
      const res = await apiFetch(`/api/membresias/${clienteBaja.id}/cancelar`, {
        method: "POST",
        body: JSON.stringify({
          motivo: motivoBaja,
          observaciones: observacionBaja.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al dar de baja la membresía");
      }

      setClientes((prev) =>
        prev.map((c) =>
          c.id === clienteBaja.id
            ? { ...c, planId: null, planNombre: null, membresiaVence: null }
            : c
        )
      );

      toast({
        variant: "success",
        title: "Membresía cancelada",
        description: `Se dio de baja el plan de ${clienteBaja.nombre} ${clienteBaja.apellido}.`,
      });
      setBajaModalOpen(false);
      setClienteBaja(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error al cancelar",
        description: err instanceof Error ? err.message : "Intentá nuevamente.",
      });
    } finally {
      setProcesandoBaja(false);
    }
  };

  // ── Exportar a CSV ────────────────────────────────────────
  const exportarCSV = () => {
    if (clientesFiltrados.length === 0) {
      toast({ title: "Sin datos", description: "No hay clientes en la vista actual para exportar." });
      return;
    }

    const headers = [
      "Nombre",
      "Apellido",
      "Email",
      "Telefono",
      "Plan",
      "Membresia Vence",
      "Estado Membresia",
      "Apto Medico",
      "Total Aportado",
      "Asistencias 30d",
      "Ultima Asistencia",
      "Contacto Emergencia",
      "Estado",
    ];

    const rows = clientesFiltrados.map((c) => {
      const dias = getDiasRestantes(c.membresiaVence);
      let estadoMem = "Sin Plan";
      if (c.planNombre) {
        if (!dias || dias.diff < 0) estadoMem = "Vencida";
        else if (dias.diff <= 7) estadoMem = "Por Vencer";
        else estadoMem = "Al Día";
      }

      const apto = getEstadoApto(c.aptoMedicoVence);
      const emergencia = c.contactoEmergenciaNombre
        ? `${c.contactoEmergenciaNombre} (${c.contactoEmergenciaTelefono ?? "-"})`
        : "No especificado";

      return [
        `"${c.nombre.replace(/"/g, '""')}"`,
        `"${c.apellido.replace(/"/g, '""')}"`,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${c.telefono.replace(/"/g, '""')}"`,
        `"${(c.planNombre ?? "Sin plan").replace(/"/g, '""')}"`,
        `"${c.membresiaVence ? new Date(c.membresiaVence).toLocaleDateString("es-AR") : "-"}"`,
        `"${estadoMem}"`,
        `"${apto.texto}"`,
        `"$${(c.totalPagado ?? 0).toLocaleString()}"`,
        `"${c.asistenciasUltimos30Dias ?? 0}"`,
        `"${c.ultimaAsistencia ? new Date(c.ultimaAsistencia).toLocaleDateString("es-AR") : "Nunca"}"`,
        `"${emergencia.replace(/"/g, '""')}"`,
        `"${c.activo ? "Activo" : "Inactivo"}"`,
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes_fitcore_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      variant: "success",
      title: "Padrón exportado",
      description: `Se descargaron ${clientesFiltrados.length} clientes en CSV.`,
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-12">
        {/* ── Encabezado Principal ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">Gestión de Clientes</h1>
              <Badge variant="outline" className="font-semibold text-xs border-gray-200">
                Mostrador
              </Badge>
            </div>
            <p className="text-sm text-gray-500 font-medium mt-1">
              Control de cuotas, asistencias rápidas, emergencias y badges de reconocimiento.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={exportarCSV}
              className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50 font-semibold"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Exportar CSV
            </Button>
            <Button
              onClick={() => navigate("/clientes/nuevo")}
              className="rounded-xl bg-primary hover:bg-primary/95 font-bold shadow-sm shadow-primary/20"
            >
              <UserPlus className="h-4 w-4 mr-1.5" />
              Nuevo Socio
            </Button>
          </div>
        </div>

        {/* ── Métricas y KPIs de Cabecera (Interactivos) ── */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Total Socios */}
          <button
            type="button"
            onClick={() => setFiltroRapido("todos")}
            className={`col-span-2 sm:col-span-1 lg:col-span-1 p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer h-[116px] flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-md group ${
              filtroRapido === "todos"
                ? "border-slate-800 ring-2 ring-slate-800/10 bg-slate-50/60 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-slate-300 hover:bg-slate-50/30"
            }`}
          >
            {filtroRapido === "todos" && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800" />
            )}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                filtroRapido === "todos" ? "text-slate-900" : "text-slate-500"
              }`}>
                Socios Totales
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                filtroRapido === "todos"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 border border-slate-200/60"
              }`}>
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {loading ? <Skeleton className="h-7 w-12" /> : metrics.total}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>{metrics.activos} activos</span>
                <span className="text-slate-300">·</span>
                <span>{metrics.inactivos} inactivos</span>
              </div>
            </div>
          </button>

          {/* Cuota Al Día */}
          <button
            type="button"
            onClick={() => setFiltroRapido(filtroRapido === "alDia" ? "todos" : "alDia")}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer h-[116px] flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-md group ${
              filtroRapido === "alDia"
                ? "border-emerald-500 ring-2 ring-emerald-500/15 bg-emerald-50/30 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-emerald-200 hover:bg-emerald-50/20"
            }`}
          >
            {filtroRapido === "alDia" && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
            )}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                filtroRapido === "alDia" ? "text-emerald-800" : "text-slate-500"
              }`}>
                Al Día
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                filtroRapido === "alDia"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-200/60"
              }`}>
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {loading ? <Skeleton className="h-7 w-12" /> : metrics.alDia}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium mt-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Vigencia &gt; 7 días</span>
              </div>
            </div>
          </button>

          {/* Por Vencer (7 días) */}
          <button
            type="button"
            onClick={() => setFiltroRapido(filtroRapido === "porVencer" ? "todos" : "porVencer")}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer h-[116px] flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-md group ${
              filtroRapido === "porVencer"
                ? "border-amber-500 ring-2 ring-amber-500/15 bg-amber-50/30 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-amber-200 hover:bg-amber-50/20"
            }`}
          >
            {filtroRapido === "porVencer" && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
            )}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                filtroRapido === "porVencer" ? "text-amber-800" : "text-slate-500"
              }`}>
                Vence Pronto
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                filtroRapido === "porVencer"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "bg-amber-50 text-amber-600 border border-amber-200/60"
              }`}>
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {loading ? <Skeleton className="h-7 w-12" /> : metrics.porVencer}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium mt-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span>Próximos 7 días</span>
              </div>
            </div>
          </button>

          {/* Vencidos / Sin Plan */}
          <button
            type="button"
            onClick={() => setFiltroRapido(filtroRapido === "vencidos" ? "todos" : "vencidos")}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer h-[116px] flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-md group ${
              filtroRapido === "vencidos"
                ? "border-rose-500 ring-2 ring-rose-500/15 bg-rose-50/30 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-rose-200 hover:bg-rose-50/20"
            }`}
          >
            {filtroRapido === "vencidos" && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
            )}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                filtroRapido === "vencidos" ? "text-rose-800" : "text-slate-500"
              }`}>
                Vencidos / Mora
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                filtroRapido === "vencidos"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-600 border border-rose-200/60"
              }`}>
                <AlertCircle className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {loading ? <Skeleton className="h-7 w-12" /> : metrics.vencidos}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-medium mt-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>Requiere cobro</span>
              </div>
            </div>
          </button>

          {/* Apto Médico Vencido */}
          <button
            type="button"
            onClick={() => setFiltroRapido(filtroRapido === "aptoVencido" ? "todos" : "aptoVencido")}
            className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer h-[116px] flex flex-col justify-between relative overflow-hidden shadow-xs hover:shadow-md group ${
              filtroRapido === "aptoVencido"
                ? "border-purple-500 ring-2 ring-purple-500/15 bg-purple-50/30 shadow-sm"
                : "border-slate-200/80 bg-white hover:border-purple-200 hover:bg-purple-50/20"
            }`}
          >
            {filtroRapido === "aptoVencido" && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-purple-500" />
            )}
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                filtroRapido === "aptoVencido" ? "text-purple-800" : "text-slate-500"
              }`}>
                Apto Vencido
              </span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                filtroRapido === "aptoVencido"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-600 border border-purple-200/60"
              }`}>
                <HeartPulse className="h-4 w-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight leading-none">
                {loading ? <Skeleton className="h-7 w-12" /> : metrics.aptoVencido}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-purple-700 font-medium mt-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                <span>Alerta sanitaria</span>
              </div>
            </div>
          </button>
        </div>

        {/* ── Barra de Control de Búsqueda y Filtros ── */}
        <div className="bg-white border border-gray-200/80 rounded-2xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Buscador Universal */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Buscar socio por nombre, apellido, email o teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 pr-9 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Selectores de Filtro */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro por Badge Inteligente */}
              <Select value={filtroBadge} onValueChange={setFiltroBadge}>
                <SelectTrigger className="w-[155px] sm:w-[185px] rounded-xl border-gray-200 text-xs font-semibold">
                  <Tags className="h-3.5 w-3.5 mr-1.5 text-gray-400 shrink-0" />
                  <SelectValue placeholder="Todos los badges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">
                    <span className="text-gray-600 font-medium">Todos los badges</span>
                  </SelectItem>
                  <SelectItem value="vip">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Mayor Aporte (VIP)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="frecuente">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span>Atleta Frecuente</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="en_riesgo">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span>En Riesgo (+14d)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="baja_frecuencia">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>Baja Asistencia</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="fiel">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span>Socio Fiel (+6m)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="nuevo">
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Nuevo Socio (&lt;30d)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Plan */}
              <Select value={filtroPlan} onValueChange={setFiltroPlan}>
                <SelectTrigger className="w-[135px] sm:w-[155px] rounded-xl border-gray-200 text-xs font-semibold">
                  <SelectValue placeholder="Todos los planes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los planes</SelectItem>
                  <SelectItem value="sin_plan">Sin plan asignado</SelectItem>
                  {planes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro Estado Socio */}
              <Select
                value={filtroEstadoUsuario}
                onValueChange={(val: "todos" | "activos" | "inactivos") => setFiltroEstadoUsuario(val)}
              >
                <SelectTrigger className="w-[110px] rounded-xl border-gray-200 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="inactivos">Inactivos</SelectItem>
                  <SelectItem value="todos">Todos</SelectItem>
                </SelectContent>
              </Select>

              {/* Toggle de Vista Cards vs Tabla */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/60">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-label="Vista Mosaico"
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "grid" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  aria-label="Vista Tabla"
                  className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                    viewMode === "table" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <TableIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Filtros Activos */}
          {(filtroRapido !== "todos" ||
            filtroPlan !== "todos" ||
            filtroEstadoUsuario !== "activos" ||
            filtroBadge !== "todos" ||
            busqueda) && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-gray-600">Filtros aplicados:</span>
                {filtroRapido !== "todos" && (
                  <Badge variant="secondary" className="gap-1 rounded-lg text-[11px]">
                    Filtro: {filtroRapido}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroRapido("todos")} />
                  </Badge>
                )}
                {filtroBadge !== "todos" && (
                  <Badge variant="secondary" className="gap-1 rounded-lg text-[11px]">
                    Badge: {BADGE_NOMBRES[filtroBadge] ?? filtroBadge}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroBadge("todos")} />
                  </Badge>
                )}
                {filtroPlan !== "todos" && (
                  <Badge variant="secondary" className="gap-1 rounded-lg text-[11px]">
                    Plan: {filtroPlan === "sin_plan" ? "Sin plan" : planes.find((p) => String(p.id) === filtroPlan)?.nombre}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroPlan("todos")} />
                  </Badge>
                )}
                {filtroEstadoUsuario !== "activos" && (
                  <Badge variant="secondary" className="gap-1 rounded-lg text-[11px]">
                    Estado: {filtroEstadoUsuario}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setFiltroEstadoUsuario("activos")} />
                  </Badge>
                )}
                {busqueda && (
                  <Badge variant="secondary" className="gap-1 rounded-lg text-[11px]">
                    Búsqueda: &ldquo;{busqueda}&rdquo;
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setBusqueda("")} />
                  </Badge>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-gray-500 hover:text-gray-900"
                onClick={() => {
                  setBusqueda("");
                  setFiltroRapido("todos");
                  setFiltroPlan("todos");
                  setFiltroBadge("todos");
                  setFiltroEstadoUsuario("activos");
                }}
              >
                Limpiar todo
              </Button>
            </div>
          )}
        </div>

        {/* ── Barra de Paginación Superior & Contador ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-gray-500 px-1">
          <div className="flex items-center gap-2">
            <span>
              Mostrando {clientesFiltrados.length === 0 ? 0 : indiceInicio + 1} - {indiceFin} de {clientesFiltrados.length} socios
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-gray-400">
              {viewMode === "grid" ? "Vista Mosaico" : "Vista Tabla"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">Por página:</span>
            <Select
              value={String(porPagina)}
              onValueChange={(val) => setPorPagina(Number(val))}
            >
              <SelectTrigger className="w-[75px] h-7 rounded-lg text-xs font-bold border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9">9</SelectItem>
                <SelectItem value="18">18</SelectItem>
                <SelectItem value="36">36</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Contenido Principal (Skeletons / Cards / Table) ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white border border-gray-200/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-100">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : clientesPaginados.length === 0 ? (
          <div className="bg-white border border-gray-200/80 rounded-2xl p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-gray-800">No se encontraron clientes</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              No hay socios que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl mt-2"
              onClick={() => {
                setBusqueda("");
                setFiltroRapido("todos");
                setFiltroPlan("todos");
                setFiltroBadge("todos");
                setFiltroEstadoUsuario("activos");
              }}
            >
              Restablecer filtros
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          /* ══════════════════════════════════════════════════════════
             VISTA MOSAICO / CARDS REDISEÑADAS CON BADGES
             ══════════════════════════════════════════════════════════ */
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {clientesPaginados.map((c, i) => {
              const d = getDiasRestantes(c.membresiaVence);
              const apto = getEstadoApto(c.aptoMedicoVence);
              const waUrl = getContextualWhatsAppUrl(c);
              const badges = badgesPorCliente.get(c.id) ?? [];

              return (
                <div
                  key={c.id}
                  className="bg-white border border-gray-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4 hover:border-gray-300 hover:shadow-sm hover:-translate-y-0.5 transition-all animate-fade-in-up group"
                  style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}
                >
                  {/* Fila Superior: Avatar + Nombre + Estado */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer"
                        onClick={() => openFicha(c)}
                      >
                        <PersonaAvatar seed={c.id} size={46} />
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors truncate">
                            {c.nombre} {c.apellido}
                          </h3>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Socio desde {new Date(c.fechaAlta).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={c.activo ? "success" : "danger"} className="shrink-0 text-[10px] font-bold">
                        {c.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    {/* Badges de Reconocimiento / Segmentación del Socio */}
                    {badges.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {badges.map((b) => {
                          const IconComp = b.icon;
                          return (
                            <Tooltip key={b.id}>
                              <TooltipTrigger asChild>
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border transition-colors cursor-default ${b.className}`}
                                >
                                  <IconComp className={`w-3 h-3 shrink-0 ${b.iconClassName}`} />
                                  <span>{b.label}</span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{b.tooltip}</TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    )}

                    {/* Contacto & Salud */}
                    <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50/50 rounded-xl p-2.5 border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate flex-1 font-medium">{c.telefono || "Sin teléfono"}</span>
                        {waUrl && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Enviar WhatsApp"
                                className="shrink-0 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 p-1 rounded-md transition-colors"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent>Recordatorio inteligente por WhatsApp</TooltipContent>
                          </Tooltip>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="truncate text-gray-500">{c.email}</span>
                      </div>

                      {/* Chip de Apto Médico */}
                      <div className="pt-1 flex items-center justify-between border-t border-gray-100/80 mt-1">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${apto.className}`}>
                          <HeartPulse className="w-3 h-3 shrink-0" />
                          <span>{apto.texto}</span>
                        </div>
                        {c.aptoMedicoVence && (
                          <span className="text-[10px] text-gray-400">
                            Vence: {new Date(c.aptoMedicoVence).toLocaleDateString("es-AR")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tarjeta de Membresía Actual */}
                    <div className="p-2.5 rounded-xl border border-gray-100 bg-white flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Plan Actual</p>
                        <p className="text-xs font-black text-gray-800 truncate">
                          {c.planNombre ?? "Sin plan asignado"}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        {d ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              d.diff < 0
                                ? "bg-rose-100 text-rose-700"
                                : d.diff <= 7
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {d.texto}
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-semibold">Inactivo</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Fast Desk Actions (Mostrador) ── */}
                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    {/* Botones de acción directa primaria */}
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs h-8.5"
                        onClick={() => openCobro(c)}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Cobrar cuota
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs h-8.5"
                        disabled={checkingInId === c.id}
                        onClick={() => handleCheckIn(c)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-primary" />
                        {checkingInId === c.id ? "Ingresando..." : "Asistencia"}
                      </Button>
                    </div>

                    {/* Botones secundarios en barra compacta */}
                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-[11px] font-bold text-gray-500 hover:text-gray-900 px-2"
                        onClick={() => openFicha(c)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ficha 360°
                      </Button>

                      <div className="flex items-center gap-0.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-600 hover:text-gray-900"
                              onClick={() => openEdit(c)}
                              aria-label="Editar"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar datos y salud</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => navigate(`/clientes/${c.id}/progreso`)}
                              aria-label="Ver progreso"
                            >
                              <TrendingUp className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Rutina y progreso</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-gray-500 hover:text-gray-800"
                              onClick={() => handleToggleActivo(c)}
                              disabled={togglingId === c.id}
                              aria-label={c.activo ? "Desactivar" : "Reactivar"}
                            >
                              {c.activo ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{c.activo ? "Desactivar socio" : "Reactivar socio"}</TooltipContent>
                        </Tooltip>

                        {c.planNombre && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                onClick={() => openBaja(c)}
                                aria-label="Dar de baja membresía"
                              >
                                <CalendarX className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Dar de baja membresía</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                              onClick={() => openDelete(c)}
                              aria-label="Eliminar permanente"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar permanente</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ══════════════════════════════════════════════════════════
             VISTA TABLA COMPACTA ADMINISTRATIVA (HIGH-VOLUME DESK)
             ══════════════════════════════════════════════════════════ */
          <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/75">
                  <TableRow>
                    <TableHead className="font-bold text-gray-700 text-xs py-3.5">Socio / Contacto</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Badges & Actividad</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Plan Actual</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Vencimiento</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Apto Médico</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs">Estado</TableHead>
                    <TableHead className="font-bold text-gray-700 text-xs text-right pr-4">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesPaginados.map((c) => {
                    const d = getDiasRestantes(c.membresiaVence);
                    const apto = getEstadoApto(c.aptoMedicoVence);
                    const waUrl = getContextualWhatsAppUrl(c);
                    const badges = badgesPorCliente.get(c.id) ?? [];

                    return (
                      <TableRow key={c.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Socio */}
                        <TableCell className="py-3">
                          <div
                            className="flex items-center gap-3 cursor-pointer group"
                            onClick={() => openFicha(c)}
                          >
                            <PersonaAvatar seed={c.id} size={38} />
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-gray-900 group-hover:text-primary transition-colors truncate">
                                {c.nombre} {c.apellido}
                              </p>
                              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                                <span>{c.telefono || "Sin tel"}</span>
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-600 hover:text-emerald-700"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Badges & Actividad */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 flex-wrap max-w-[220px]">
                            {badges.length > 0 ? (
                              badges.map((b) => {
                                const IconComp = b.icon;
                                return (
                                  <Tooltip key={b.id}>
                                    <TooltipTrigger asChild>
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-colors ${b.className}`}
                                      >
                                        <IconComp className={`w-2.5 h-2.5 shrink-0 ${b.iconClassName}`} />
                                        <span>{b.label}</span>
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>{b.tooltip}</TooltipContent>
                                  </Tooltip>
                                );
                              })
                            ) : (
                              <span className="text-[11px] text-gray-300 font-medium">Sin badges</span>
                            )}
                          </div>
                        </TableCell>

                        {/* Plan */}
                        <TableCell>
                          <span className="text-xs font-bold text-gray-800">
                            {c.planNombre ?? <span className="text-gray-400 font-normal">Sin plan</span>}
                          </span>
                        </TableCell>

                        {/* Vencimiento */}
                        <TableCell>
                          {d ? (
                            <div className="space-y-0.5">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                  d.diff < 0
                                    ? "bg-rose-100 text-rose-700"
                                    : d.diff <= 7
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-emerald-100 text-emerald-800"
                                }`}
                              >
                                {d.texto}
                              </span>
                              {c.membresiaVence && (
                                <p className="text-[10px] text-gray-400">
                                  {new Date(c.membresiaVence).toLocaleDateString("es-AR")}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </TableCell>

                        {/* Apto Médico */}
                        <TableCell>
                          <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${apto.className}`}>
                            <HeartPulse className="w-3 h-3 shrink-0" />
                            <span>{apto.texto}</span>
                          </div>
                        </TableCell>

                        {/* Estado */}
                        <TableCell>
                          <Badge variant={c.activo ? "success" : "danger"} className="text-[10px] font-bold">
                            {c.activo ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>

                        {/* Acciones */}
                        <TableCell className="text-right pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold px-2 rounded-lg"
                                  onClick={() => openCobro(c)}
                                >
                                  <CreditCard className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                  Cobrar
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Cobro Express</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 font-bold px-2 rounded-lg"
                                  disabled={checkingInId === c.id}
                                  onClick={() => handleCheckIn(c)}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                  Check-in
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Registrar asistencia de hoy</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-gray-500 hover:text-gray-900"
                                  onClick={() => openFicha(c)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver ficha 360°</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-gray-500 hover:text-gray-900"
                                  onClick={() => openEdit(c)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar cliente</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* ── Barra de Paginación Inferior ── */}
        {clientesFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium">
              Página <span className="font-bold text-gray-800">{paginaActual}</span> de{" "}
              <span className="font-bold text-gray-800">{totalPaginas}</span> ({clientesFiltrados.length} socios en total)
            </p>

            <div className="flex items-center gap-1.5">
              {/* Primera Página */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual(1)}
                aria-label="Primera página"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>

              {/* Anterior */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={paginaActual === 1}
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                aria-label="Página anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {/* Números de Página */}
              <div className="flex items-center gap-1 mx-1">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                  .filter((page) => {
                    return (
                      page === 1 ||
                      page === totalPaginas ||
                      Math.abs(page - paginaActual) <= 1
                    );
                  })
                  .map((page, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && page - prev > 1;

                    return (
                      <div key={page} className="flex items-center">
                        {showEllipsis && <span className="px-1.5 text-xs text-gray-400">...</span>}
                        <Button
                          variant={paginaActual === page ? "default" : "outline"}
                          size="sm"
                          className={`h-8 min-w-8 px-2.5 rounded-lg text-xs font-bold ${
                            paginaActual === page
                              ? "bg-primary text-white shadow-xs"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                          onClick={() => setPaginaActual(page)}
                        >
                          {page}
                        </Button>
                      </div>
                    );
                  })}
              </div>

              {/* Siguiente */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                aria-label="Página siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {/* Última Página */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                disabled={paginaActual === totalPaginas}
                onClick={() => setPaginaActual(totalPaginas)}
                aria-label="Última página"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
           MODAL 1: COBRO EXPRESS / REGISTRAR PAGO
           ══════════════════════════════════════════════════════════ */}
        <Dialog open={cobroOpen} onOpenChange={setCobroOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CreditCard className="h-5 w-5" />
                Cobro Express de Cuota
              </DialogTitle>
              <DialogDescription>
                Registrá el cobro del período y extendé automáticamente la vigencia del socio.
              </DialogDescription>
            </DialogHeader>

            {clienteCobro && (
              <div className="space-y-4 py-2">
                {/* Info del Cliente */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <PersonaAvatar seed={clienteCobro.id} size={42} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 truncate">
                      {clienteCobro.nombre} {clienteCobro.apellido}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      Plan actual: <strong className="text-gray-800">{clienteCobro.planNombre ?? "Sin plan"}</strong>
                    </p>
                  </div>
                </div>

                {/* Período a cobrar */}
                <div className="space-y-1.5">
                  <Label htmlFor="cobro-periodo" className="text-xs font-bold">Período a cobrar</Label>
                  <Select
                    value={`${cobroPeriodoMes}-${cobroPeriodoAnio}`}
                    onValueChange={(val) => {
                      const [m, a] = val.split("-").map(Number);
                      setCobroPeriodoMes(m);
                      setCobroPeriodoAnio(a);
                    }}
                  >
                    <SelectTrigger id="cobro-periodo" className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODOS.map((p) => (
                        <SelectItem key={`${p.mes}-${p.anio}`} value={`${p.mes}-${p.anio}`}>
                          {p.label.charAt(0).toUpperCase() + p.label.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Monto & Método de Pago */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cobro-monto" className="text-xs font-bold">Monto ($)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        id="cobro-monto"
                        type="number"
                        min="0"
                        step="100"
                        value={cobroMonto}
                        onChange={(e) => setCobroMonto(e.target.value)}
                        className="pl-8 rounded-xl font-bold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cobro-metodo" className="text-xs font-bold">Método</Label>
                    <Select value={cobroMetodo} onValueChange={setCobroMetodo}>
                      <SelectTrigger id="cobro-metodo" className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METODOS_PAGO.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Nota opcional */}
                <div className="space-y-1.5">
                  <Label htmlFor="cobro-nota" className="text-xs font-bold">
                    Nota u observación <span className="text-gray-400 font-normal">(opcional)</span>
                  </Label>
                  <Input
                    id="cobro-nota"
                    placeholder="Ej. Pagó en efectivo con billetes de 2000"
                    value={cobroNota}
                    onChange={(e) => setCobroNota(e.target.value)}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCobroOpen(false)} disabled={cobroLoading}>
                Cancelar
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                onClick={handleConfirmarCobro}
                loading={cobroLoading}
              >
                Confirmar Cobro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
           MODAL 2: FICHA 360° DEL CLIENTE (HEALTH & EMERGENCY)
           ══════════════════════════════════════════════════════════ */}
        <Dialog open={fichaOpen} onOpenChange={setFichaOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Ficha 360° del Socio
              </DialogTitle>
              <DialogDescription>
                Historial, contactos de emergencia para primeros auxilios y estado médico.
              </DialogDescription>
            </DialogHeader>

            {clienteFicha && (
              <div className="space-y-4 py-2">
                {/* Cabecera del socio */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <PersonaAvatar seed={clienteFicha.id} size={58} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-gray-900 truncate">
                        {clienteFicha.nombre} {clienteFicha.apellido}
                      </h3>
                      <Badge variant={clienteFicha.activo ? "success" : "danger"} className="text-[10px]">
                        {clienteFicha.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{clienteFicha.email}</p>
                    <p className="text-xs text-gray-600 font-semibold mt-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {clienteFicha.telefono || "Sin teléfono"}
                    </p>
                  </div>
                </div>

                {/* Métricas de Facturación y Asistencias */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/60">
                    <p className="text-[10px] uppercase font-bold text-amber-700">Total Aportado</p>
                    <p className="text-sm font-black text-amber-900 mt-0.5">
                      ${(clienteFicha.totalPagado ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-orange-50/50 border border-orange-200/60">
                    <p className="text-[10px] uppercase font-bold text-orange-700">Asistencias (30d)</p>
                    <p className="text-sm font-black text-orange-900 mt-0.5">
                      {clienteFicha.asistenciasUltimos30Dias ?? 0}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/60">
                    <p className="text-[10px] uppercase font-bold text-blue-700">Última Asistencia</p>
                    <p className="text-xs font-black text-blue-900 mt-1">
                      {clienteFicha.ultimaAsistencia ? new Date(clienteFicha.ultimaAsistencia).toLocaleDateString("es-AR") : "Nunca"}
                    </p>
                  </div>
                </div>

                {/* Sección Salud & Apto Médico */}
                <div className="p-3.5 rounded-2xl border border-gray-100 bg-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      Certificado & Apto Médico
                    </span>
                    {clienteFicha.aptoMedicoVence ? (
                      <span className="text-xs font-bold text-gray-600">
                        Vence: {new Date(clienteFicha.aptoMedicoVence).toLocaleDateString("es-AR")}
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50 font-bold">
                        Pendiente de entrega
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {clienteFicha.aptoMedicoVence
                      ? getEstadoApto(clienteFicha.aptoMedicoVence).texto
                      : "El socio aún no ha presentado el apto médico en secretaría."}
                  </p>
                </div>

                {/* Sección Contacto de Emergencia */}
                <div className="p-3.5 rounded-2xl border border-amber-200/80 bg-amber-50/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Contacto de Emergencia
                    </span>
                    <span className="text-[11px] text-amber-700 font-medium">Primeros auxilios</span>
                  </div>

                  {clienteFicha.contactoEmergenciaNombre ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-white/80 p-2.5 rounded-xl border border-amber-100">
                      <div>
                        <p className="text-gray-400 text-[10px] uppercase font-bold">Familiar / Contacto</p>
                        <p className="font-bold text-gray-800">{clienteFicha.contactoEmergenciaNombre}</p>
                        {clienteFicha.contactoEmergenciaRelacion && (
                          <p className="text-[11px] text-gray-500">({clienteFicha.contactoEmergenciaRelacion})</p>
                        )}
                      </div>
                      <div className="flex flex-col justify-center sm:items-end">
                        <p className="text-gray-400 text-[10px] uppercase font-bold">Teléfono directo</p>
                        <a
                          href={`tel:${clienteFicha.contactoEmergenciaTelefono}`}
                          className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          {clienteFicha.contactoEmergenciaTelefono}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 italic">
                      Sin contacto de emergencia registrado. Podés cargarlo editando la ficha del socio.
                    </p>
                  )}
                </div>

                {/* Accesos rápidos desde la ficha */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100"
                    onClick={() => {
                      setFichaOpen(false);
                      openCobro(clienteFicha);
                    }}
                  >
                    <CreditCard className="w-3.5 h-3.5 mr-1" />
                    Cobrar cuota
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold border-blue-200 text-blue-800 bg-blue-50 hover:bg-blue-100"
                    onClick={() => {
                      setFichaOpen(false);
                      navigate(`/clientes/${clienteFicha.id}/progreso`);
                    }}
                  >
                    <TrendingUp className="w-3.5 h-3.5 mr-1" />
                    Ver rutina
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs font-bold text-gray-700"
                    onClick={() => {
                      setFichaOpen(false);
                      openEdit(clienteFicha);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    Editar datos
                  </Button>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFichaOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
           MODAL 3: EDICIÓN COMPLETA (DATOS + SALUD + EMERGENCIA)
           ══════════════════════════════════════════════════════════ */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Editar cliente</DialogTitle>
              <DialogDescription>Actualizá los datos de contacto, plan asignado y ficha médica.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-nombre">Nombre</Label>
                  <Input
                    id="edit-nombre"
                    value={editForm.nombre}
                    onChange={(e) => setEditForm((p) => ({ ...p, nombre: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-apellido">Apellido</Label>
                  <Input
                    id="edit-apellido"
                    value={editForm.apellido}
                    onChange={(e) => setEditForm((p) => ({ ...p, apellido: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-telefono">Teléfono</Label>
                  <Input
                    id="edit-telefono"
                    value={editForm.telefono}
                    onChange={(e) => setEditForm((p) => ({ ...p, telefono: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-estado">Estado Socio</Label>
                  <Select
                    value={editForm.activo ? "activo" : "inactivo"}
                    onValueChange={(val) => setEditForm((p) => ({ ...p, activo: val === "activo" }))}
                    disabled={saving}
                  >
                    <SelectTrigger id="edit-estado"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="inactivo">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-apto">Vencimiento Apto Médico</Label>
                  <Input
                    id="edit-apto"
                    type="date"
                    value={editForm.aptoMedicoVence}
                    onChange={(e) => setEditForm((p) => ({ ...p, aptoMedicoVence: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Plan opcional */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-plan">
                  Plan{" "}
                  {editing?.planNombre && (
                    <span className="text-gray-400 font-normal text-xs">
                      (actual: {editing.planNombre})
                    </span>
                  )}
                </Label>
                <Select
                  value={editPlanId || "ninguno"}
                  onValueChange={(val) => setEditPlanId(val === "ninguno" ? "" : val)}
                  disabled={saving || planes.length === 0}
                >
                  <SelectTrigger id="edit-plan">
                    <SelectValue placeholder="Sin plan asignado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguno">Sin plan</SelectItem>
                    {planes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nombre} — ${p.precio}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {editPlanId && editPlanId !== String(editing?.planId) && (
                  <p className="text-xs text-amber-600">
                    Se creará una nueva membresía activa con este plan.
                  </p>
                )}
              </div>

              {/* Contacto de Emergencia */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Contacto de Emergencia</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-emg-nombre" className="text-xs">Nombre y Apellido</Label>
                    <Input
                      id="edit-emg-nombre"
                      placeholder="Ej. María Pérez"
                      value={editForm.contactoEmergenciaNombre}
                      onChange={(e) => setEditForm((p) => ({ ...p, contactoEmergenciaNombre: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-emg-relacion" className="text-xs">Parentesco / Relación</Label>
                    <Input
                      id="edit-emg-relacion"
                      placeholder="Ej. Madre, Pareja, etc."
                      value={editForm.contactoEmergenciaRelacion}
                      onChange={(e) => setEditForm((p) => ({ ...p, contactoEmergenciaRelacion: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-emg-tel" className="text-xs">Teléfono de Emergencia</Label>
                  <Input
                    id="edit-emg-tel"
                    placeholder="Ej. +54 9 11 1234-5678"
                    value={editForm.contactoEmergenciaTelefono}
                    onChange={(e) => setEditForm((p) => ({ ...p, contactoEmergenciaTelefono: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSaveEdit} loading={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
           MODAL 4: CONFIRMACIÓN ELIMINAR SOCIO
           ══════════════════════════════════════════════════════════ */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar cliente</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que querés eliminar a{" "}
                <span className="font-semibold text-gray-900">{deleting?.nombre} {deleting?.apellido}</span>?
                Esta acción es permanente y no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={handleConfirmDelete} loading={deleteLoading}>
                {deleteLoading ? "Eliminando..." : "Eliminar permanentemente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════════════════════════════════════════════════
           MODAL 5: DAR DE BAJA MEMBRESÍA
           ══════════════════════════════════════════════════════════ */}
        <Dialog open={bajaModalOpen} onOpenChange={setBajaModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <CalendarX className="h-5 w-5" />
                Dar de baja membresía
              </DialogTitle>
              <DialogDescription>
                {clienteBaja && (
                  <span>
                    Estás por cancelar la membresía activa de{" "}
                    <strong>{clienteBaja.nombre} {clienteBaja.apellido}</strong> (Plan actual:{" "}
                    <strong className="text-foreground">{clienteBaja.planNombre}</strong>).
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="motivo-baja">Motivo de la baja</Label>
                <Select value={motivoBaja} onValueChange={setMotivoBaja} disabled={procesandoBaja}>
                  <SelectTrigger id="motivo-baja"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Económico / Presupuesto">Económico / Presupuesto</SelectItem>
                    <SelectItem value="Falta de tiempo / Horarios">Falta de tiempo / Horarios</SelectItem>
                    <SelectItem value="Lesión o motivos de salud">Lesión o motivos de salud</SelectItem>
                    <SelectItem value="Mudanza o distancia al gimnasio">Mudanza o distancia al gimnasio</SelectItem>
                    <SelectItem value="Disconformidad con el servicio">Disconformidad con el servicio</SelectItem>
                    <SelectItem value="Otro motivo">Otro motivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="obs-baja">
                  Observaciones adicionales <span className="text-gray-400 font-normal text-xs">(opcional)</span>
                </Label>
                <Input
                  id="obs-baja"
                  placeholder="Detalles sobre la baja, comentarios del cliente..."
                  value={observacionBaja}
                  onChange={(e) => setObservacionBaja(e.target.value)}
                  disabled={procesandoBaja}
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                La membresía quedará cancelada y el cliente figurará sin plan activo. El historial de pagos anteriores se preserva intacto.
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setBajaModalOpen(false)} disabled={procesandoBaja}>
                Volver
              </Button>
              <Button type="button" variant="destructive" onClick={handleConfirmarBaja} loading={procesandoBaja}>
                {procesandoBaja ? "Procesando..." : "Confirmar baja"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
