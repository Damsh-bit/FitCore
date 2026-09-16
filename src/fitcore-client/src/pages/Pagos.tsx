import { useEffect, useMemo, useState, useRef } from "react";
import {
  Loader2,
  Search,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  Download,
  Printer,
  MessageCircle,
  CheckCircle2,
  User as UserIcon,
  Sparkles,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight,
  Clock,
  Eye,
  Percent,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import ClienteCombobox from "@/components/ui/client-combobox";
import PersonaAvatar from "@/components/ui/persona-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useGymSettings } from "@/context/GymSettingsContext";
import { buildWhatsAppUrl } from "@/lib/utils";

const METODOS = ["Efectivo", "Transferencia", "Débito", "Crédito"] as const;

const CONCEPTOS = [
  "Cuota mensual",
  "Inscripción / Matrícula",
  "Pase Diario",
  "Clase Suelta / Especial",
  "Bebida / Suplemento",
  "Otro concepto",
];

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

interface ClienteUsuario {
  id: string;
  nombre: string;
  apellido: string;
  telefono?: string;
  email?: string;
  planId?: number | null;
  planNombre?: string | null;
  membresiaVence?: string | null;
  activo?: boolean;
}

interface PlanItem {
  id: number;
  nombre: string;
  precio: number;
}

interface PagoResponse {
  id: number;
  userId?: string;
  clienteNombre: string;
  clienteTelefono?: string;
  planNombre?: string;
  monto: number;
  metodo: string;
  fecha: string;
  nota?: string;
  periodoMes: number;
  periodoAnio: number;
}

interface FormState {
  userId: string;
  concepto: string;
  monto: string;
  metodo: string;
  nota: string;
  periodoMes: number;
  periodoAnio: number;
  fechaPersonalizada: string;
}

export default function Pagos() {
  const { settings } = useGymSettings();
  const { toast } = useToast();

  const [users, setUsers] = useState<ClienteUsuario[]>([]);
  const [planes, setPlanes] = useState<PlanItem[]>([]);
  const [pagos, setPagos] = useState<PagoResponse[]>([]);
  const [pagosLoading, setPagosLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario
  const hoyStr = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<FormState>({
    userId: "",
    concepto: "Cuota mensual",
    monto: "",
    metodo: "Efectivo",
    nota: "",
    periodoMes: PERIODOS[0].mes,
    periodoAnio: PERIODOS[0].anio,
    fechaPersonalizada: hoyStr,
  });

  // Descuento en formulario
  const [aplicaDescuento, setAplicaDescuento] = useState(false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState("");
  const [montoFinal, setMontoFinal] = useState("");

  // Modal comprobante / recibo
  const [reciboModalOpen, setReciboModalOpen] = useState(false);
  const [reciboActual, setReciboActual] = useState<PagoResponse | null>(null);
  const printableRef = useRef<HTMLDivElement>(null);

  // Historial: filtros y paginación
  const [busquedaHistorial, setBusquedaHistorial] = useState("");
  const [filtroMetodo, setFiltroMetodo] = useState<string>("todos");
  const [filtroRango, setFiltroRango] = useState<string>("mes"); // 'hoy' | 'semana' | 'mes' | 'todos'
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    setPagosLoading(true);
    try {
      const [resUsers, resPagos, resPlanes] = await Promise.all([
        apiFetch("/api/usuarios?categoria=Cliente").then((r) => r.json()).catch(() => []),
        apiFetch("/api/pagos").then((r) => r.json()).catch(() => []),
        apiFetch("/api/planes").then((r) => r.json()).catch(() => []),
      ]);
      setUsers(Array.isArray(resUsers) ? resUsers : []);
      setPagos(Array.isArray(resPagos) ? resPagos : []);
      setPlanes(Array.isArray(resPlanes) ? resPlanes : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error de carga",
        description: "No se pudieron obtener todos los datos de caja.",
      });
    } finally {
      setPagosLoading(false);
    }
  }

  // Cliente seleccionado en el formulario
  const clienteSeleccionado = useMemo(() => {
    return users.find((u) => u.id === form.userId) ?? null;
  }, [users, form.userId]);

  // Plan sugerido y precio del cliente
  const planDelCliente = useMemo(() => {
    if (!clienteSeleccionado) return null;
    if (clienteSeleccionado.planId) {
      const found = planes.find((p) => p.id === clienteSeleccionado.planId);
      if (found) return found;
    }
    if (clienteSeleccionado.planNombre) {
      const found = planes.find((p) => p.nombre.toLowerCase() === clienteSeleccionado.planNombre?.toLowerCase());
      if (found) return found;
    }
    return null;
  }, [clienteSeleccionado, planes]);

  // Al seleccionar cliente, si tiene plan, sugerir precio si el campo está vacío
  const handleSelectCliente = (userId: string) => {
    setForm((f) => ({ ...f, userId }));
    const cliente = users.find((u) => u.id === userId);
    if (cliente) {
      const p = planes.find(
        (pl) => pl.id === cliente.planId || pl.nombre.toLowerCase() === cliente.planNombre?.toLowerCase()
      );
      if (p && !form.monto) {
        setForm((f) => ({ ...f, monto: String(p.precio) }));
        setMontoFinal(String(p.precio));
      }
    }
  };

  // Manejo de importes y descuentos
  const handleMontoChange = (val: string) => {
    const sanitized = val.replace(/[^0-9.]/g, "");
    setForm((f) => ({ ...f, monto: sanitized }));
    recalcularDescuento(sanitized, aplicaDescuento ? porcentajeDescuento : "");
  };

  const recalcularDescuento = (baseStr: string, pctStr: string) => {
    const base = parseFloat(baseStr);
    if (isNaN(base) || base <= 0) {
      setMontoFinal("");
      return;
    }
    const pct = parseFloat(pctStr);
    if (!isNaN(pct) && pct > 0) {
      const fin = Math.max(0, Math.round(base * (1 - pct / 100)));
      setMontoFinal(String(fin));
    } else {
      setMontoFinal(baseStr);
    }
  };

  const handleToggleDescuento = (checked: boolean) => {
    setAplicaDescuento(checked);
    if (checked) {
      recalcularDescuento(form.monto, porcentajeDescuento);
    } else {
      setPorcentajeDescuento("");
      setMontoFinal(form.monto);
    }
  };

  const handlePctChange = (val: string) => {
    const num = Math.min(100, Math.max(0, parseFloat(val) || 0));
    setPorcentajeDescuento(val ? String(num) : "");
    recalcularDescuento(form.monto, val ? String(num) : "");
  };

  async function handleSubmit() {
    setError(null);

    if (!form.userId) return setError("Seleccioná un cliente.");
    if (!form.metodo) return setError("Seleccioná un método de pago.");
    if (!form.monto || parseFloat(form.monto) <= 0) return setError("Ingresá un monto válido.");

    const importeEfectivo = aplicaDescuento && montoFinal ? parseFloat(montoFinal) : parseFloat(form.monto);
    if (isNaN(importeEfectivo) || importeEfectivo <= 0) return setError("El importe a cobrar no es válido.");

    setLoading(true);
    try {
      // Componer nota enriquecida
      const partesNota: string[] = [];
      if (form.concepto !== "Cuota mensual") {
        partesNota.push(`Concepto: ${form.concepto}`);
      }
      if (form.nota.trim()) {
        partesNota.push(form.nota.trim());
      }
      if (aplicaDescuento && porcentajeDescuento) {
        partesNota.push(`Desc. ${porcentajeDescuento}% (Base: $${parseFloat(form.monto).toLocaleString("es-AR")})`);
      }
      const notaFinal = partesNota.length > 0 ? partesNota.join(" | ") : null;

      const res = await apiFetch("/api/pagos", {
        method: "POST",
        body: JSON.stringify({
          userId: form.userId,
          monto: importeEfectivo,
          metodo: form.metodo,
          nota: notaFinal,
          concepto: form.concepto,
          periodoMes: form.periodoMes,
          periodoAnio: form.periodoAnio,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al registrar el pago");
      }

      const nuevoPago: PagoResponse = await res.json();

      toast({
        variant: "success",
        title: "¡Cobro registrado con éxito!",
        description: `$${importeEfectivo.toLocaleString("es-AR")} recibidos de ${clienteSeleccionado?.nombre ?? "Cliente"} por ${form.metodo}.`,
      });

      // Abrir modal de comprobante digital
      setReciboActual({
        ...nuevoPago,
        clienteTelefono: clienteSeleccionado?.telefono,
        planNombre: clienteSeleccionado?.planNombre ?? planDelCliente?.nombre,
      });
      setReciboModalOpen(true);

      // Resetear form
      setForm({
        userId: "",
        concepto: "Cuota mensual",
        monto: "",
        metodo: "Efectivo",
        nota: "",
        periodoMes: PERIODOS[0].mes,
        periodoAnio: PERIODOS[0].anio,
        fechaPersonalizada: hoyStr,
      });
      setAplicaDescuento(false);
      setPorcentajeDescuento("");
      setMontoFinal("");

      // Recargar pagos
      const resPagos = await apiFetch("/api/pagos").then((r) => r.json());
      setPagos(Array.isArray(resPagos) ? resPagos : []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }

  // ── Métricas de Caja Diaria (Arqueo) ──────────────────────
  const metricasHoy = useMemo(() => {
    const hoy = new Date();
    const hoyFechaStr = hoy.toDateString();

    const pagosHoy = pagos.filter((p) => new Date(p.fecha).toDateString() === hoyFechaStr);

    const efectivo = pagosHoy
      .filter((p) => p.metodo.toLowerCase() === "efectivo")
      .reduce((acc, p) => acc + p.monto, 0);

    const transferencia = pagosHoy
      .filter((p) => p.metodo.toLowerCase().includes("transferencia"))
      .reduce((acc, p) => acc + p.monto, 0);

    const tarjetas = pagosHoy
      .filter((p) => p.metodo.toLowerCase().includes("débito") || p.metodo.toLowerCase().includes("debito") || p.metodo.toLowerCase().includes("crédito") || p.metodo.toLowerCase().includes("credito") || p.metodo.toLowerCase().includes("tarjeta"))
      .reduce((acc, p) => acc + p.monto, 0);

    const totalHoy = pagosHoy.reduce((acc, p) => acc + p.monto, 0);

    const totalMes = pagos
      .filter((p) => {
        const d = new Date(p.fecha);
        return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
      })
      .reduce((acc, p) => acc + p.monto, 0);

    return {
      efectivo,
      transferencia,
      tarjetas,
      totalHoy,
      cantidadHoy: pagosHoy.length,
      totalMes,
    };
  }, [pagos]);

  // ── Filtrado y Paginación del Historial ───────────────────
  const pagosFiltrados = useMemo(() => {
    const q = busquedaHistorial.trim().toLowerCase();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return pagos.filter((p) => {
      // Búsqueda por cliente o nota
      const matchBusqueda =
        !q ||
        p.clienteNombre.toLowerCase().includes(q) ||
        (p.nota && p.nota.toLowerCase().includes(q));

      // Filtro por método
      const matchMetodo =
        filtroMetodo === "todos" ||
        p.metodo.toLowerCase() === filtroMetodo.toLowerCase();

      // Filtro por rango de fecha
      let matchRango = true;
      const fechaPago = new Date(p.fecha);
      if (filtroRango === "hoy") {
        matchRango = fechaPago.toDateString() === new Date().toDateString();
      } else if (filtroRango === "semana") {
        const hace7Dias = new Date();
        hace7Dias.setDate(hace7Dias.getDate() - 7);
        matchRango = fechaPago >= hace7Dias;
      } else if (filtroRango === "mes") {
        matchRango =
          fechaPago.getMonth() === new Date().getMonth() &&
          fechaPago.getFullYear() === new Date().getFullYear();
      }

      return matchBusqueda && matchMetodo && matchRango;
    });
  }, [pagos, busquedaHistorial, filtroMetodo, filtroRango]);

  const totalPaginas = Math.ceil(pagosFiltrados.length / itemsPorPagina) || 1;
  const paginaAjustada = Math.min(paginaActual, totalPaginas);

  const pagosPaginados = useMemo(() => {
    const inicio = (paginaAjustada - 1) * itemsPorPagina;
    return pagosFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [pagosFiltrados, paginaAjustada, itemsPorPagina]);

  const exportarCSV = () => {
    if (pagosFiltrados.length === 0) {
      toast({ title: "Sin datos", description: "No hay pagos para exportar." });
      return;
    }

    const headers = ["ID", "Cliente", "Monto", "Metodo", "Fecha", "Periodo", "Nota"];
    const rows = pagosFiltrados.map((p) => [
      p.id,
      `"${p.clienteNombre}"`,
      p.monto,
      `"${p.metodo}"`,
      `"${new Date(p.fecha).toLocaleString("es-AR")}"`,
      `"${nombrePeriodo(p.periodoMes, p.periodoAnio)}"`,
      `"${p.nota || ""}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FitCore_Pagos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV exportado", description: `Se descargaron ${pagosFiltrados.length} registros.` });
  };

  function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatMonto(n: number) {
    return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
  }

  function nombrePeriodo(mes: number, anio: number) {
    return new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
    });
  }

  const metodoColor: Record<string, string> = {
    Efectivo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Transferencia: "bg-blue-50 text-blue-700 border-blue-200",
    Débito: "bg-purple-50 text-purple-700 border-purple-200",
    Crédito: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };

  // Generador de WhatsApp para Comprobante
  const generarWhatsAppComprobante = (pago: PagoResponse) => {
    const telefono = pago.clienteTelefono || users.find((u) => u.nombre + " " + u.apellido === pago.clienteNombre)?.telefono;
    const gymNombre = settings.nombreGimnasio || "FitCore";
    const fechaFormat = formatFecha(pago.fecha);
    const montoFormat = formatMonto(pago.monto);
    const periodoFormat = nombrePeriodo(pago.periodoMes, pago.periodoAnio);

    const mensaje = `*COMPROBANTE DE PAGO - ${gymNombre.toUpperCase()}* 🧾\n\nHola ${pago.clienteNombre.split(" ")[0]}! Registramos tu pago con éxito:\n\n• *Recibo N°:* #${pago.id.toString().padStart(5, "0")}\n• *Concepto / Período:* Cuota ${periodoFormat}${pago.planNombre ? ` (${pago.planNombre})` : ""}\n• *Importe:* ${montoFormat}\n• *Método de pago:* ${pago.metodo}\n• *Fecha y hora:* ${fechaFormat}\n\n¡Muchas gracias por entrenar con nosotros! 💪`;

    return buildWhatsAppUrl(telefono, mensaje);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Encabezado Principal ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Caja y Cobranzas</h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full border-gray-200 bg-gray-50 text-gray-700">
              Operativo Recepción
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Cobro en mostrador, arqueo de turno en vivo y emisión de recibos digitales por WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportarCSV}
            className="rounded-xl border-gray-200 shadow-xs hover:bg-gray-50 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* ── Arqueo de Caja del Día (KPI Cards) ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-primary" />
            Arqueo de Turno / Caja Hoy
          </h2>
          <span className="text-xs font-medium text-gray-400">
            {metricasHoy.cantidadHoy} {metricasHoy.cantidadHoy === 1 ? "cobro registrado" : "cobros registrados"} hoy
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Hoy */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-foreground text-background flex items-center justify-center shadow-xs">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recaudado Hoy</span>
            </div>
            <div className="my-1">
              {pagosLoading ? (
                <Skeleton className="h-8 w-32 rounded mx-auto" />
              ) : (
                <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                  {formatMonto(metricasHoy.totalHoy)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
              <span>Mes: {formatMonto(metricasHoy.totalMes)}</span>
            </div>
          </div>

          {/* Efectivo en Cajón */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Banknote className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Efectivo en Cajón</span>
            </div>
            <div className="my-1">
              {pagosLoading ? (
                <Skeleton className="h-8 w-28 rounded mx-auto" />
              ) : (
                <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                  {formatMonto(metricasHoy.efectivo)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Físico a rendir en mostrador</span>
            </div>
          </div>

          {/* Transferencias / Mercado Pago */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Transferencias / MP</span>
            </div>
            <div className="my-1">
              {pagosLoading ? (
                <Skeleton className="h-8 w-28 rounded mx-auto" />
              ) : (
                <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                  {formatMonto(metricasHoy.transferencia)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
              <span>Bancos y billeteras virtuales</span>
            </div>
          </div>

          {/* Tarjetas Débito / Crédito */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
            <div className="flex items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tarjetas (POS)</span>
            </div>
            <div className="my-1">
              {pagosLoading ? (
                <Skeleton className="h-8 w-28 rounded mx-auto" />
              ) : (
                <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                  {formatMonto(metricasHoy.tarjetas)}
                </p>
              )}
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-purple-600 dark:text-purple-400 font-medium truncate w-full">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span>Débito y crédito en terminal</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Formulario de Cobro en Mostrador ── */}
      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Registrar Cobro en Mostrador
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Autocompleta valores del plan, aplica descuentos e imprime o envía comprobante al instante.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Columna 1: Selección de Socio y Ficha Rápida */}
          <div className="space-y-3 lg:border-r lg:border-gray-100 lg:pr-5">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                1. Seleccionar Socio
              </Label>
              <ClienteCombobox
                clientes={users}
                value={form.userId}
                onChange={handleSelectCliente}
                placeholder="Escribí nombre o apellido..."
              />
            </div>

            {/* Ficha rápida del socio seleccionado */}
            {clienteSeleccionado ? (
              <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-2.5 animate-fade-in-up">
                <div className="flex items-center gap-3">
                  <PersonaAvatar seed={clienteSeleccionado.id} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{clienteSeleccionado.email || "Sin email"}</p>
                  </div>
                  <Badge variant={clienteSeleccionado.activo ? "success" : "danger"} className="text-[10px]">
                    {clienteSeleccionado.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>

                <div className="pt-2 border-t border-gray-200/60 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Plan actual:</span>
                    <span className="font-semibold text-gray-800">
                      {clienteSeleccionado.planNombre || "Sin plan asignado"}
                    </span>
                  </div>
                  {planDelCliente && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Precio de cuota:</span>
                      <span className="font-bold text-emerald-700">
                        ${planDelCliente.precio.toLocaleString("es-AR")}
                      </span>
                    </div>
                  )}
                  {clienteSeleccionado.membresiaVence && (
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-gray-400">Vencimiento pase:</span>
                      <span className="font-medium text-gray-600">
                        {new Date(clienteSeleccionado.membresiaVence).toLocaleDateString("es-AR")}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botón de Autocompletar con el plan */}
                {planDelCliente && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, monto: String(planDelCliente.precio) }));
                      recalcularDescuento(String(planDelCliente.precio), aplicaDescuento ? porcentajeDescuento : "");
                    }}
                    className="w-full mt-1 inline-flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Cargar cuota ${planDelCliente.precio.toLocaleString("es-AR")}
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400 flex flex-col items-center justify-center min-h-[120px]">
                <UserIcon className="w-6 h-6 text-gray-300 mb-1.5" />
                <span>Buscá un socio para ver su plan y cuota sugerida automáticamente.</span>
              </div>
            )}
          </div>

          {/* Columna 2: Concepto, Período y Método */}
          <div className="space-y-3 lg:border-r lg:border-gray-100 lg:pr-5">
            <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              2. Detalles del Cobro
            </Label>

            {/* Concepto */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Concepto</label>
              <Select
                value={form.concepto}
                onValueChange={(val) => setForm((f) => ({ ...f, concepto: val }))}
              >
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONCEPTOS.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Período */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Período de Cuota</label>
              <Select
                value={`${form.periodoMes}-${form.periodoAnio}`}
                onValueChange={(val) => {
                  const [mes, anio] = val.split("-").map(Number);
                  setForm((f) => ({ ...f, periodoMes: mes, periodoAnio: anio }));
                }}
              >
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODOS.map((p) => (
                    <SelectItem key={`${p.mes}-${p.anio}`} value={`${p.mes}-${p.anio}`} className="text-xs capitalize">
                      {p.label} {p === PERIODOS[0] ? "(Actual)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Método de pago */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Método de Pago</label>
              <div className="grid grid-cols-2 gap-1.5">
                {METODOS.map((m) => {
                  const isSelected = form.metodo === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, metodo: m }))}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border bg-card hover:bg-muted text-foreground"
                      }`}
                    >
                      <span>{m}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Columna 3: Monto, Descuentos y Confirmación */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-foreground uppercase tracking-wider">
              3. Importe y Confirmación
            </Label>

            {/* Monto base */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Monto Base a Cobrar</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={form.monto}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  className="w-full border border-border rounded-xl pl-8 pr-3 py-2 text-base font-black text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Toggle de Descuento */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aplicaDescuento}
                  onChange={(e) => handleToggleDescuento(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-600" />
                  Aplicar Descuento / Promo
                </span>
              </label>

              {aplicaDescuento && (
                <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in-up">
                  <div>
                    <label className="text-[11px] text-muted-foreground">% Descuento</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="10"
                        value={porcentajeDescuento}
                        onChange={(e) => handlePctChange(e.target.value)}
                        className="w-full border border-border rounded-lg pr-6 pl-2.5 py-1 text-xs font-bold text-foreground bg-background"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Monto Final</label>
                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 py-1 px-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      ${montoFinal ? parseFloat(montoFinal).toLocaleString("es-AR") : "0"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nota opcional */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Nota / Observación</label>
              <input
                type="text"
                placeholder="Ej: Abonó en recepción, comprobante bancario..."
                value={form.nota}
                onChange={(e) => setForm((f) => ({ ...f, nota: e.target.value }))}
                className="w-full border border-border rounded-xl px-3 py-1.5 text-xs text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400">
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-xl py-2.5 font-bold shadow-xs text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registrando cobro...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 mr-1.5" />
                  Registrar Cobro {form.monto ? `$${(aplicaDescuento && montoFinal ? parseFloat(montoFinal) : parseFloat(form.monto || "0")).toLocaleString("es-AR")}` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabla de Historial Operativo ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Historial de Cobros</h2>
            <p className="text-xs text-muted-foreground">
              Mostrando {pagosFiltrados.length} cobros registrados.
            </p>
          </div>

          {/* Filtros de Historial */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar por cliente o nota..."
                value={busquedaHistorial}
                onChange={(e) => {
                  setBusquedaHistorial(e.target.value);
                  setPaginaActual(1);
                }}
                className="pl-8 rounded-xl h-8.5 text-xs"
              />
            </div>

            <Select
              value={filtroMetodo}
              onValueChange={(val) => {
                setFiltroMetodo(val);
                setPaginaActual(1);
              }}
            >
              <SelectTrigger className="w-[125px] rounded-xl h-8.5 text-xs font-medium">
                <SelectValue placeholder="Método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos los métodos</SelectItem>
                <SelectItem value="Efectivo" className="text-xs">Efectivo</SelectItem>
                <SelectItem value="Transferencia" className="text-xs">Transferencia</SelectItem>
                <SelectItem value="Débito" className="text-xs">Débito</SelectItem>
                <SelectItem value="Crédito" className="text-xs">Crédito</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filtroRango}
              onValueChange={(val) => {
                setFiltroRango(val);
                setPaginaActual(1);
              }}
            >
              <SelectTrigger className="w-[115px] rounded-xl h-8.5 text-xs font-medium">
                <SelectValue placeholder="Rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hoy" className="text-xs">Solo hoy</SelectItem>
                <SelectItem value="semana" className="text-xs">Últimos 7 días</SelectItem>
                <SelectItem value="mes" className="text-xs">Este mes</SelectItem>
                <SelectItem value="todos" className="text-xs">Todo el historial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla */}
        {pagosLoading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : pagosFiltrados.length === 0 ? (
          <div className="py-12 text-center text-xs text-gray-400">
            No se encontraron cobros registrados con los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 uppercase tracking-wider text-[10px] font-bold">
                  <th className="text-left py-3 px-3">Recibo / Socio</th>
                  <th className="text-left py-3 px-3">Período / Plan</th>
                  <th className="text-left py-3 px-3">Método</th>
                  <th className="text-left py-3 px-3 hidden sm:table-cell">Nota</th>
                  <th className="text-right py-3 px-3">Monto</th>
                  <th className="text-right py-3 px-3">Fecha</th>
                  <th className="text-right py-3 px-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagosPaginados.map((p) => {
                  const waUrl = generarWhatsAppComprobante(p);
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            #{p.id.toString().padStart(4, "0")}
                          </span>
                          <span className="font-bold text-gray-900 text-xs">{p.clienteNombre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 capitalize text-gray-600">
                        {nombrePeriodo(p.periodoMes, p.periodoAnio)}
                        {p.planNombre && (
                          <span className="block text-[10px] text-gray-400 font-normal">{p.planNombre}</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${metodoColor[p.metodo] ?? "bg-gray-100 text-gray-700"}`}>
                          {p.metodo}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 max-w-[180px] truncate hidden sm:table-cell">
                        {p.nota || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-gray-900 text-xs">
                        {formatMonto(p.monto)}
                      </td>
                      <td className="py-3 px-3 text-right text-gray-500 text-[11px]">
                        {formatFecha(p.fecha)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Ver recibo */}
                          <button
                            type="button"
                            onClick={() => {
                              setReciboActual(p);
                              setReciboModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                            title="Ver e Imprimir Comprobante"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Enviar WhatsApp */}
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Reenviar comprobante por WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Controles de Paginación ── */}
        {!pagosLoading && pagosFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <Select
                value={String(itemsPorPagina)}
                onValueChange={(val) => {
                  setItemsPorPagina(Number(val));
                  setPaginaActual(1);
                }}
              >
                <SelectTrigger className="w-[70px] h-7 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span>por página</span>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPaginaActual(1)}
                disabled={paginaAjustada === 1}
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaAjustada === 1}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="px-2 text-xs font-semibold text-gray-700">
                Página {paginaAjustada} de {totalPaginas}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAjustada === totalPaginas}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaAjustada === totalPaginas}
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal de Comprobante / Recibo Digital ── */}
      <Dialog open={reciboModalOpen} onOpenChange={setReciboModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Comprobante de Pago Oficial
            </DialogTitle>
            <DialogDescription className="text-xs">
              Recibo digital emitido para el socio y control de caja.
            </DialogDescription>
          </DialogHeader>

          {reciboActual && (
            <div className="space-y-4 mt-2">
              {/* Recibo imprimible */}
              <div
                ref={printableRef}
                className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-gray-800 space-y-3.5 font-sans"
              >
                <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                      {settings.nombreGimnasio || "FITCORE FITNESS"}
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      {settings.email || settings.telefono || "Gestión y Entrenamiento Deportivo"}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Recibo N°</span>
                    <p className="font-mono text-sm font-black text-gray-900">
                      #{reciboActual.id.toString().padStart(5, "0")}
                    </p>
                  </div>
                </div>

                <div className="text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Socio:</span>
                    <span className="font-bold text-gray-900">{reciboActual.clienteNombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Período / Cuota:</span>
                    <span className="font-semibold text-gray-800 capitalize">
                      {nombrePeriodo(reciboActual.periodoMes, reciboActual.periodoAnio)}
                    </span>
                  </div>
                  {reciboActual.planNombre && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Plan:</span>
                      <span className="font-semibold text-gray-800">{reciboActual.planNombre}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Método de pago:</span>
                    <span className="font-semibold text-gray-800">{reciboActual.metodo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fecha y hora:</span>
                    <span className="text-gray-700">{formatFecha(reciboActual.fecha)}</span>
                  </div>
                  {reciboActual.nota && (
                    <div className="flex justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                      <span className="text-gray-500">Detalle:</span>
                      <span className="text-gray-700 font-medium italic">{reciboActual.nota}</span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t-2 border-dashed border-gray-300 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-gray-600">Total Abonado:</span>
                  <span className="text-xl font-black text-emerald-700">
                    {formatMonto(reciboActual.monto)}
                  </span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {generarWhatsAppComprobante(reciboActual) && (
                  <Button
                    asChild
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    <a
                      href={generarWhatsAppComprobante(reciboActual)!}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                      Enviar por WhatsApp
                    </a>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="w-full rounded-xl text-xs font-bold border-gray-200"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5 text-gray-600" />
                  Imprimir Recibo
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setReciboModalOpen(false)}
              className="text-xs"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}