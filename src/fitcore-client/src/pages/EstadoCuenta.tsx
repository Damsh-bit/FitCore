import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus,
  Check,
  MessageCircle,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  Percent,
  Phone,
} from "lucide-react";
import { buildWhatsAppUrl } from "@/lib/utils";
import { useGymSettings } from "@/context/GymSettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import PersonaAvatar from "@/components/ui/persona-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";

type PeriodoEstado = {
  mes: number;
  anio: number;
  nombreMes: string;
  pagado: boolean;
  monto: number | null;
  metodo: string | null;
  fechaPago: string | null;
};

type Plan = {
  id: number;
  nombre: string;
  precio: number;
};

type EstadoCuenta = {
  userId: string;
  nombre: string;
  email: string;
  telefono?: string | null;
  membresiaId?: number | null;
  planNombre: string | null;
  planPrecio?: number | null;
  membresiaVence: string | null;
  estadoGeneral: "AlDia" | "ConDeuda" | "PendienteMesActual";
  periodos: PeriodoEstado[];
};

const METODOS = ["Efectivo", "Transferencia", "Débito", "Crédito"];

const ESTADO_CONFIG = {
  AlDia: {
    label: "Al día",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    badgeVariant: "success" as const,
  },
  PendienteMesActual: {
    label: "Pendiente este mes",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
    badgeVariant: "outline" as const,
  },
  ConDeuda: {
    label: "Con deuda vencida",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
    badgeVariant: "danger" as const,
  },
};

function TableRowSkeleton({ cols }: { cols: number }) {
  return (
    <TableRow>
      {Array.from({ length: cols }).map((_, i) => (
        <TableCell key={i}>
          <Skeleton className="h-5 w-24 rounded-lg" />
        </TableCell>
      ))}
    </TableRow>
  );
}

export default function EstadoCuenta() {
  const [searchParams] = useSearchParams();
  const { settings } = useGymSettings();
  const { toast } = useToast();

  const [clientes, setClientes] = useState<EstadoCuenta[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState(() => {
    const estadoInicial = searchParams.get("estado");
    return estadoInicial && estadoInicial in ESTADO_CONFIG ? estadoInicial : "Todos";
  });
  const [filtroPlan, setFiltroPlan] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina, setItemsPorPagina] = useState(10);

  // Modal pago
  const [modalOpen, setModalOpen] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<EstadoCuenta | null>(null);
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState<PeriodoEstado | null>(null);
  const [saving, setSaving] = useState(false);
  const [pagoForm, setPagoForm] = useState({
    monto: "",
    metodo: "Efectivo",
    nota: "",
  });

  // Descuento en modal pago
  const [aplicaDescuento, setAplicaDescuento] = useState(false);
  const [porcentajeDescuento, setPorcentajeDescuento] = useState("");
  const [importeFinal, setImporteFinal] = useState("");

  // Modal selector de WhatsApp
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [clienteWa, setClienteWa] = useState<EstadoCuenta | null>(null);
  const [telefonoModal, setTelefonoModal] = useState("");
  const [guardandoTel, setGuardandoTel] = useState(false);
  const [centroRecordatoriosOpen, setCentroRecordatoriosOpen] = useState(false);

  const cargar = async () => {
    setLoading(true);
    try {
      const [data, planesData, usuariosData] = await Promise.all([
        apiFetch("/api/pagos/estado-cuenta").then((r) => r.json()),
        apiFetch("/api/planes").then((r) => r.json()).catch(() => []),
        apiFetch("/api/usuarios?categoria=Cliente").then((r) => r.json()).catch(() => []),
      ]);

      const telMap = new Map<string, string>();
      if (Array.isArray(usuariosData)) {
        usuariosData.forEach((u: { id: string; telefono?: string }) => {
          if (u.telefono && u.telefono.trim()) {
            telMap.set(u.id, u.telefono.trim());
          }
        });
      }

      const merged = (Array.isArray(data) ? data : []).map((item: EstadoCuenta) => ({
        ...item,
        telefono: (item.telefono && item.telefono.trim()) ? item.telefono.trim() : (telMap.get(item.userId) || null),
      }));

      setClientes(merged);
      if (Array.isArray(planesData)) {
        setPlanes(planesData);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No se pudo cargar el estado de cuentas.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  // ── Cálculos Financieros y KPIs para el Dueño ─────────────
  const metricas = useMemo(() => {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    let deudaTotalDinero = 0;
    let porCobrarMesDinero = 0;
    let cobradoMesDinero = 0;
    let clientesConDeudaCount = 0;
    let clientesPendientesCount = 0;
    let clientesAlDiaCount = 0;

    clientes.forEach((c) => {
      const precioEstimado =
        c.planPrecio ?? planes.find((pl) => pl.nombre === c.planNombre)?.precio ?? 0;

      // Meses anteriores adeudados
      const mesesAnterioresImpagos = c.periodos.filter(
        (p) => !(p.mes === mesActual && p.anio === anioActual) && !p.pagado
      );

      // Mes actual impago
      const mesActualImpago = c.periodos.find(
        (p) => p.mes === mesActual && p.anio === anioActual && !p.pagado
      );

      // Mes actual cobrado
      const mesActualPagado = c.periodos.find(
        (p) => p.mes === mesActual && p.anio === anioActual && p.pagado
      );

      if (mesesAnterioresImpagos.length > 0) {
        clientesConDeudaCount++;
        deudaTotalDinero += mesesAnterioresImpagos.length * precioEstimado;
      }

      if (mesActualImpago) {
        clientesPendientesCount++;
        porCobrarMesDinero += precioEstimado;
      }

      if (mesActualPagado) {
        cobradoMesDinero += precioEstimado;
      }

      if (c.estadoGeneral === "AlDia") {
        clientesAlDiaCount++;
      }
    });

    const totalActivos = clientes.length || 1;
    const tasaEfectividad = Math.round((clientesAlDiaCount / totalActivos) * 100);

    return {
      deudaTotalDinero,
      porCobrarMesDinero,
      cobradoMesDinero,
      clientesConDeudaCount,
      clientesPendientesCount,
      clientesAlDiaCount,
      tasaEfectividad,
    };
  }, [clientes, planes]);

  // ── Filtrado y Paginación ────────────────────────────────
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((c) => {
      const matchEstado = filtroEstado === "Todos" || c.estadoGeneral === filtroEstado;
      const matchPlan =
        filtroPlan === "todos" ||
        (filtroPlan === "sin_plan" ? !c.planNombre : c.planNombre?.toLowerCase() === filtroPlan.toLowerCase());
      const q = busqueda.trim().toLowerCase();
      const matchBusqueda =
        !q ||
        c.nombre.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.telefono && c.telefono.includes(q));

      return matchEstado && matchPlan && matchBusqueda;
    });
  }, [clientes, filtroEstado, filtroPlan, busqueda]);

  const totalPaginas = Math.ceil(clientesFiltrados.length / itemsPorPagina) || 1;
  const paginaAjustada = Math.min(paginaActual, totalPaginas);

  const clientesPaginados = useMemo(() => {
    const inicio = (paginaAjustada - 1) * itemsPorPagina;
    return clientesFiltrados.slice(inicio, inicio + itemsPorPagina);
  }, [clientesFiltrados, paginaAjustada, itemsPorPagina]);

  // Headers de períodos
  const periodoHeaders = clientes[0]?.periodos.map((p) => p.nombreMes) ?? [];

  // Exportar morosos a CSV
  const exportarMorososCSV = () => {
    const morosos = clientes.filter((c) => c.estadoGeneral === "ConDeuda");
    if (morosos.length === 0) {
      toast({ title: "Sin morosos", description: "No hay socios con deuda vencida para exportar." });
      return;
    }

    const headers = ["Cliente", "Email", "Telefono", "Plan", "Precio Plan", "Meses Impagos"];
    const rows = morosos.map((c) => {
      const impagos = c.periodos.filter((p) => !p.pagado).map((p) => p.nombreMes).join(" - ");
      return [
        `"${c.nombre}"`,
        `"${c.email}"`,
        `"${c.telefono || "Sin tel"}"`,
        `"${c.planNombre || "Sin plan"}"`,
        c.planPrecio ?? 0,
        `"${impagos}"`,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `FitCore_Morosos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "CSV exportado", description: `Se descargó el listado de ${morosos.length} socios con deuda.` });
  };

  // ── Manejo del Modal de Pago ─────────────────────────────
  const abrirPago = (cliente: EstadoCuenta, periodo: PeriodoEstado) => {
    setClienteSeleccionado(cliente);
    setPeriodoSeleccionado(periodo);

    const precio = cliente.planPrecio ?? planes.find((pl) => pl.nombre === cliente.planNombre)?.precio;
    const montoInicial = precio !== undefined && precio !== null ? String(precio) : "";

    setPagoForm({
      monto: montoInicial,
      metodo: "Efectivo",
      nota: "",
    });
    setAplicaDescuento(false);
    setPorcentajeDescuento("");
    setImporteFinal(montoInicial);
    setModalOpen(true);
  };

  const handleMontoChange = (val: string) => {
    const sanitized = val.replace(/[^0-9.]/g, "");
    setPagoForm((p) => ({ ...p, monto: sanitized }));

    const base = parseFloat(sanitized);
    if (isNaN(base) || base <= 0) {
      setImporteFinal("");
      return;
    }

    if (aplicaDescuento && porcentajeDescuento !== "") {
      const pct = parseFloat(porcentajeDescuento) || 0;
      const final = Math.max(0, Math.round(base * (1 - pct / 100)));
      setImporteFinal(String(final));
    } else {
      setImporteFinal(sanitized);
    }
  };

  const handleToggleDescuento = (checked: boolean) => {
    setAplicaDescuento(checked);
    if (checked) {
      const base = parseFloat(pagoForm.monto) || 0;
      if (porcentajeDescuento !== "") {
        const pct = parseFloat(porcentajeDescuento) || 0;
        const final = Math.max(0, Math.round(base * (1 - pct / 100)));
        setImporteFinal(String(final));
      } else {
        setImporteFinal(pagoForm.monto);
      }
    } else {
      setPorcentajeDescuento("");
      setImporteFinal(pagoForm.monto);
    }
  };

  const handlePorcentajeChange = (val: string) => {
    const sanitized = val.replace(/[^0-9.]/g, "");
    if (sanitized === "") {
      setPorcentajeDescuento("");
      setImporteFinal(pagoForm.monto);
      return;
    }

    let num = parseFloat(sanitized);
    if (isNaN(num)) return;
    if (num > 100) num = 100;
    if (num < 0) num = 0;

    setPorcentajeDescuento(String(num));
    const base = parseFloat(pagoForm.monto) || 0;
    const final = Math.max(0, Math.round(base * (1 - num / 100)));
    setImporteFinal(String(final));
  };

  const handleRegistrarPago = async () => {
    if (!clienteSeleccionado || !periodoSeleccionado) return;

    const baseMonto = parseFloat(pagoForm.monto);
    if (isNaN(baseMonto) || baseMonto <= 0) {
      toast({
        variant: "destructive",
        title: "Monto inválido",
        description: "El monto base debe ser un número mayor a cero.",
      });
      return;
    }

    let montoCobro = baseMonto;
    if (aplicaDescuento) {
      const final = parseFloat(importeFinal);
      if (isNaN(final) || final <= 0) {
        toast({
          variant: "destructive",
          title: "Importe final inválido",
          description: "El importe con descuento debe ser mayor a cero.",
        });
        return;
      }
      montoCobro = final;
    }

    setSaving(true);
    try {
      const baseNota = `Cuota ${periodoSeleccionado.nombreMes}${clienteSeleccionado.planNombre ? ` - Plan ${clienteSeleccionado.planNombre}` : ""}`;
      const partesNota: string[] = [baseNota];
      if (pagoForm.nota.trim()) {
        partesNota.push(pagoForm.nota.trim());
      }
      if (aplicaDescuento && porcentajeDescuento) {
        partesNota.push(`Desc. ${porcentajeDescuento}% (Base: $${baseMonto.toLocaleString("es-AR")} → Final: $${montoCobro.toLocaleString("es-AR")})`);
      }
      const notaEnvio = partesNota.join(" | ");

      const res = await apiFetch("/api/pagos", {
        method: "POST",
        body: JSON.stringify({
          userId: clienteSeleccionado.userId,
          membresiaId: clienteSeleccionado.membresiaId ?? null,
          monto: montoCobro,
          metodo: pagoForm.metodo,
          nota: notaEnvio,
          concepto: "Cuota mensual",
          periodoMes: periodoSeleccionado.mes,
          periodoAnio: periodoSeleccionado.anio,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Error al registrar el pago");
      }

      toast({
        variant: "success",
        title: "Pago registrado con éxito",
        description: `Se cobraron $${montoCobro.toLocaleString("es-AR")} a ${clienteSeleccionado.nombre} (${periodoSeleccionado.nombreMes}).`,
      });
      setModalOpen(false);
      cargar();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "Intentá nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Generador de Mensajes Inteligentes de WhatsApp ────────
  const obtenerMensajesWhatsApp = (c: EstadoCuenta, telefonoPersonalizado?: string) => {
    const gym = settings.nombreGimnasio || "el gimnasio";
    const primerNombre = c.nombre.split(" ")[0];
    const impagos = c.periodos.filter((p) => !p.pagado).map((p) => p.nombreMes);
    const tel = telefonoPersonalizado !== undefined ? telefonoPersonalizado : c.telefono;

    const msjRecordatorioMes = `Hola ${primerNombre}! 👋 Te escribimos desde *${gym}* para recordarte que tenés disponible la cuota de este mes para abonar. ¡Te esperamos para seguir entrenando! 💪`;

    const msjRegularizacionDeuda = `Hola ${primerNombre}! 👋 Nos comunicamos desde *${gym}* para informarte que tenés cuotas pendientes de pago (${impagos.join(", ")}). Te pedimos que pases por recepción para regularizar tu cuenta y mantener tu acceso habilitado. Si ya abonaste, por favor envianos tu comprobante. ¡Muchas gracias! 🙏`;

    return {
      recordatorio: buildWhatsAppUrl(tel, msjRecordatorioMes),
      regularizacion: buildWhatsAppUrl(tel, msjRegularizacionDeuda),
    };
  };

  const abrirModalWa = async (c: EstadoCuenta) => {
    setClienteWa(c);
    const tel = (c.telefono && c.telefono.trim()) ? c.telefono.trim() : "";
    setTelefonoModal(tel);
    setWaModalOpen(true);

    if (!tel) {
      try {
        const res = await apiFetch(`/api/usuarios/${c.userId}`);
        if (res.ok) {
          const u = await res.json();
          if (u.telefono && u.telefono.trim()) {
            setTelefonoModal(u.telefono.trim());
            setClientes((prev) =>
              prev.map((it) =>
                it.userId === c.userId ? { ...it, telefono: u.telefono.trim() } : it
              )
            );
          }
        }
      } catch {
        // Silencioso
      }
    }
  };

  const handleGuardarTelefono = async (userId: string, nuevoTelefono: string) => {
    if (!nuevoTelefono.trim()) return;
    setGuardandoTel(true);
    try {
      const uRes = await apiFetch(`/api/usuarios/${userId}`);
      if (uRes.ok) {
        const u = await uRes.json();
        const putRes = await apiFetch(`/api/usuarios/${userId}`, {
          method: "PUT",
          body: JSON.stringify({
            nombre: u.nombre,
            apellido: u.apellido,
            telefono: nuevoTelefono.trim(),
            email: u.email,
            activo: u.activo,
            categoria: u.categoria,
            aptoMedicoVence: u.aptoMedicoVence,
            contactoEmergenciaNombre: u.contactoEmergenciaNombre,
            contactoEmergenciaTelefono: u.contactoEmergenciaTelefono,
            contactoEmergenciaRelacion: u.contactoEmergenciaRelacion,
          }),
        });
        if (putRes.ok) {
          setClientes((prev) =>
            prev.map((item) =>
              item.userId === userId ? { ...item, telefono: nuevoTelefono.trim() } : item
            )
          );
          if (clienteWa && clienteWa.userId === userId) {
            setClienteWa({ ...clienteWa, telefono: nuevoTelefono.trim() });
          }
          toast({
            variant: "success",
            title: "Teléfono guardado",
            description: "Se actualizó el teléfono en la ficha del socio.",
          });
        }
      }
    } catch {
      toast({
        variant: "destructive",
        title: "No se pudo guardar el teléfono",
        description: "Intentá de nuevo más tarde.",
      });
    } finally {
      setGuardandoTel(false);
    }
  };

  const clientesConDeudaOPendiente = useMemo(() => {
    return clientes.filter(
      (c) => c.estadoGeneral === "ConDeuda" || c.estadoGeneral === "PendienteMesActual"
    );
  }, [clientes]);

  return (
    <div className="space-y-8 pb-12">
      {/* ── Encabezado Principal ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Estado de Cuenta</h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full border-border bg-muted text-muted-foreground">
              Control de Deudas
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Matriz de cobranza por período, gestión de morosos y recordatorios automáticos por WhatsApp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setCentroRecordatoriosOpen(true)}
            className="rounded-xl shadow-xs text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Centro de Recordatorios WhatsApp ({clientesConDeudaOPendiente.length})
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportarMorososCSV}
            className="rounded-xl border-border shadow-xs hover:bg-muted text-xs font-medium text-rose-600 dark:text-rose-400"
          >
            <Download className="w-3.5 h-3.5 mr-1.5 text-rose-600 dark:text-rose-400" />
            Descargar Morosos (CSV)
          </Button>
        </div>
      </div>

      {/* ── KPIs Financieros de Deuda (Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Deuda Vencida Acumulada */}
        <button
          type="button"
          onClick={() => {
            setFiltroEstado(filtroEstado === "ConDeuda" ? "Todos" : "ConDeuda");
            setPaginaActual(1);
          }}
          className={`bg-card border rounded-2xl p-4 sm:p-5 shadow-xs text-center cursor-pointer transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center relative overflow-hidden group hover:shadow-md ${
            filtroEstado === "ConDeuda"
              ? "border-rose-500 ring-2 ring-rose-500/15 bg-rose-500/10 shadow-sm"
              : "border-border hover:border-rose-300 dark:hover:border-rose-800/60 hover:bg-rose-500/5"
          }`}
        >
          {filtroEstado === "ConDeuda" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />
          )}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              filtroEstado === "ConDeuda"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
            }`}>
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              filtroEstado === "ConDeuda" ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
            }`}>
              Deuda Vencida
            </span>
          </div>
          <div className="my-1">
            {loading ? (
              <Skeleton className="h-8 w-32 rounded mx-auto" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                ${metricas.deudaTotalDinero.toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>{metricas.clientesConDeudaCount} socios con mora</span>
          </div>
        </button>

        {/* 2. Pendiente Este Mes */}
        <button
          type="button"
          onClick={() => {
            setFiltroEstado(filtroEstado === "PendienteMesActual" ? "Todos" : "PendienteMesActual");
            setPaginaActual(1);
          }}
          className={`bg-card border rounded-2xl p-4 sm:p-5 shadow-xs text-center cursor-pointer transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center relative overflow-hidden group hover:shadow-md ${
            filtroEstado === "PendienteMesActual"
              ? "border-amber-500 ring-2 ring-amber-500/15 bg-amber-500/10 shadow-sm"
              : "border-border hover:border-amber-300 dark:hover:border-amber-800/60 hover:bg-amber-500/5"
          }`}
        >
          {filtroEstado === "PendienteMesActual" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          )}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              filtroEstado === "PendienteMesActual"
                ? "bg-amber-500 text-white shadow-xs"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              filtroEstado === "PendienteMesActual" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            }`}>
              Por Cobrar Mes
            </span>
          </div>
          <div className="my-1">
            {loading ? (
              <Skeleton className="h-8 w-32 rounded mx-auto" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                ${metricas.porCobrarMesDinero.toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>{metricas.clientesPendientesCount} socios por liquidar</span>
          </div>
        </button>

        {/* 3. Cobrado Este Mes */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Cobrado Este Mes
            </span>
          </div>
          <div className="my-1">
            {loading ? (
              <Skeleton className="h-8 w-28 rounded mx-auto" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                ${metricas.cobradoMesDinero.toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Ingreso neto liquidado</span>
          </div>
        </div>

        {/* 4. Efectividad de Cobranza */}
        <button
          type="button"
          onClick={() => {
            setFiltroEstado(filtroEstado === "AlDia" ? "Todos" : "AlDia");
            setPaginaActual(1);
          }}
          className={`bg-card border rounded-2xl p-4 sm:p-5 shadow-xs text-center cursor-pointer transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center relative overflow-hidden group hover:shadow-md ${
            filtroEstado === "AlDia"
              ? "border-indigo-500 ring-2 ring-indigo-500/15 bg-indigo-500/10 shadow-sm"
              : "border-border hover:border-indigo-300 dark:hover:border-indigo-800/60 hover:bg-indigo-500/5"
          }`}
        >
          {filtroEstado === "AlDia" && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />
          )}
          <div className="flex items-center justify-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              filtroEstado === "AlDia"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              filtroEstado === "AlDia" ? "text-indigo-600 dark:text-indigo-400" : "text-muted-foreground"
            }`}>
              Efectividad Cobro
            </span>
          </div>
          <div className="my-1">
            {loading ? (
              <Skeleton className="h-8 w-28 rounded mx-auto" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                {metricas.tasaEfectividad}%
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1 truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
            <span>{metricas.clientesAlDiaCount} socios 100% al día</span>
          </div>
        </button>
      </div>

      {/* ── Barra de Filtros y Búsqueda ── */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar socio, email o teléfono..."
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setPaginaActual(1);
              }}
              className="pl-8 rounded-xl h-9 text-xs"
            />
          </div>

          {/* Filtro Plan */}
          <Select
            value={filtroPlan}
            onValueChange={(val) => {
              setFiltroPlan(val);
              setPaginaActual(1);
            }}
          >
            <SelectTrigger className="w-[145px] rounded-xl h-9 text-xs font-medium">
              <SelectValue placeholder="Todos los planes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos los planes</SelectItem>
              <SelectItem value="sin_plan" className="text-xs">Sin plan</SelectItem>
              {planes.map((p) => (
                <SelectItem key={p.id} value={p.nombre} className="text-xs">
                  {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Estado */}
          <Select
            value={filtroEstado}
            onValueChange={(val) => {
              setFiltroEstado(val);
              setPaginaActual(1);
            }}
          >
            <SelectTrigger className="w-[160px] rounded-xl h-9 text-xs font-medium">
              <SelectValue placeholder="Estado de cuenta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos" className="text-xs">Todos los estados</SelectItem>
              <SelectItem value="AlDia" className="text-xs">Al día</SelectItem>
              <SelectItem value="PendienteMesActual" className="text-xs">Pendiente este mes</SelectItem>
              <SelectItem value="ConDeuda" className="text-xs">Con deuda vencida</SelectItem>
            </SelectContent>
          </Select>

          {(filtroEstado !== "Todos" || filtroPlan !== "todos" || busqueda) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFiltroEstado("Todos");
                setFiltroPlan("todos");
                setBusqueda("");
                setPaginaActual(1);
              }}
              className="text-xs text-muted-foreground hover:text-foreground h-9"
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        <span className="text-xs text-muted-foreground font-medium">
          {clientesFiltrados.length} socios listados
        </span>
      </div>

      {/* ── Matriz de Estados de Cuenta ── */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
              <TableHead className="py-3 px-4">Socio</TableHead>
              <TableHead className="py-3 px-4">Plan & Tarifa</TableHead>
              <TableHead className="py-3 px-4">Estado General</TableHead>
              {periodoHeaders.map((h) => (
                <TableHead key={h} className="text-center py-3 px-4">
                  {h}
                </TableHead>
              ))}
              <TableHead className="text-right py-3 px-4">Acción Rápida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={4 + periodoHeaders.length} />
              ))
            ) : clientesFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4 + periodoHeaders.length} className="text-center text-muted-foreground py-12 text-xs">
                  No se encontraron socios con los filtros actuales.
                </TableCell>
              </TableRow>
            ) : (
              clientesPaginados.map((c) => {
                const cfg = ESTADO_CONFIG[c.estadoGeneral];
                const debeRecordar = c.estadoGeneral === "ConDeuda" || c.estadoGeneral === "PendienteMesActual";
                return (
                  <TableRow
                    key={c.userId}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {/* Socio */}
                    <TableCell className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <PersonaAvatar seed={c.userId} size={36} />
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-foreground truncate">{c.nombre}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{c.email || c.telefono || "Sin contacto"}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Plan */}
                    <TableCell className="py-3.5 px-4">
                      <div>
                        <span className="text-xs font-bold text-foreground">
                          {c.planNombre ?? <span className="text-muted-foreground font-normal">Sin plan</span>}
                        </span>
                        {c.planPrecio ? (
                          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            ${c.planPrecio.toLocaleString("es-AR")} / mes
                          </p>
                        ) : null}
                      </div>
                    </TableCell>

                    {/* Estado */}
                    <TableCell className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${cfg.className}`}>
                        {c.estadoGeneral === "ConDeuda" && <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" />}
                        {c.estadoGeneral === "PendienteMesActual" && <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                        {c.estadoGeneral === "AlDia" && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                        <span>{cfg.label}</span>
                      </span>
                    </TableCell>

                    {/* Períodos */}
                    {c.periodos.map((p) => (
                      <TableCell key={`${p.mes}-${p.anio}`} className="text-center py-3.5 px-3">
                        {p.pagado ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-[10px] text-muted-foreground font-bold mt-0.5">
                              ${p.monto?.toLocaleString("es-AR")}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => abrirPago(c, p)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10.5px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition-colors shadow-2xs"
                            title={`Cobrar ${p.nombreMes}`}
                          >
                            <Plus className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            Cobrar
                          </button>
                        )}
                      </TableCell>
                    ))}

                    {/* Acción Rápida: WhatsApp inteligente */}
                    <TableCell className="py-3.5 px-4 text-right">
                      {debeRecordar ? (
                        <button
                          type="button"
                          onClick={() => abrirModalWa(c)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer ${
                            c.telefono
                              ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20"
                              : "text-amber-800 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20"
                          }`}
                          title={c.telefono ? "Enviar recordatorio por WhatsApp" : "Enviar recordatorio (ingresar teléfono)"}
                        >
                          <MessageCircle className={`w-3.5 h-3.5 ${c.telefono ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`} />
                          <span>{c.telefono ? "Recordar WhatsApp" : "Recordar"}</span>
                        </button>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* ── Controles de Paginación ── */}
        {!loading && clientesFiltrados.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border text-xs text-muted-foreground">
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
              <span className="px-2 text-xs font-semibold text-foreground">
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

      {/* ── Modal Cobrar Cuota ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Registrar Pago de Cuota
            </DialogTitle>
            <DialogDescription className="text-xs">
              <span className="font-bold text-foreground">{clienteSeleccionado?.nombre}</span>
              {" — "}
              <span className="capitalize font-semibold text-primary">{periodoSeleccionado?.nombreMes}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            {clienteSeleccionado?.planNombre && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border text-xs">
                <span className="text-muted-foreground">Plan contratado:</span>
                <span className="font-bold text-foreground">
                  {clienteSeleccionado.planNombre}
                  {clienteSeleccionado.planPrecio && (
                    <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">
                      (${clienteSeleccionado.planPrecio.toLocaleString("es-AR")})
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="montoBase" className="text-xs font-semibold text-foreground">Monto Original</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                  <Input
                    id="montoBase"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    className="pl-7 rounded-xl font-bold text-sm"
                    value={pagoForm.monto}
                    onChange={(e) => handleMontoChange(e.target.value)}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold text-foreground">Método de Pago</Label>
                <Select
                  value={pagoForm.metodo}
                  onValueChange={(v) => setPagoForm((p) => ({ ...p, metodo: v }))}
                >
                  <SelectTrigger className="rounded-xl text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {METODOS.map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkbox Descuento */}
            <div className="pt-2 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={aplicaDescuento}
                  onChange={(e) => handleToggleDescuento(e.target.checked)}
                  disabled={saving}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-500" />
                  Aplicar Descuento / Bonificación
                </span>
              </label>

              {aplicaDescuento && (
                <div className="mt-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 animate-fade-in-up">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] font-semibold text-amber-700 dark:text-amber-300">% Descuento</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="10"
                        className="bg-card rounded-lg h-8 text-xs font-bold"
                        value={porcentajeDescuento}
                        onChange={(e) => handlePorcentajeChange(e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Importe Final</Label>
                      <div className="h-8 flex items-center px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-black text-emerald-600 dark:text-emerald-400">
                        ${importeFinal ? parseFloat(importeFinal).toLocaleString("es-AR") : "0"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nota */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">Nota personalizada (opcional)</Label>
              <Input
                placeholder="Ej: Pago en recepción, se le descontó $500..."
                value={pagoForm.nota}
                onChange={(e) => setPagoForm((p) => ({ ...p, nota: e.target.value }))}
                disabled={saving}
                className="rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button type="button" onClick={handleRegistrarPago} loading={saving} className="rounded-xl text-xs font-bold">
              {saving ? "Registrando..." : "Confirmar Cobro"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Plantillas WhatsApp ── */}
      <Dialog open={waModalOpen} onOpenChange={setWaModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Notificación por WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Elegí el tipo de mensaje para enviar a <span className="font-bold text-foreground">{clienteWa?.nombre}</span>.
            </DialogDescription>
          </DialogHeader>

          {clienteWa && (
            <div className="space-y-4 mt-2">
              {/* Campo de Teléfono */}
              <div className="space-y-1.5 bg-muted/40 p-3 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <Label htmlFor="wa-phone" className="text-xs font-semibold text-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    Teléfono del Destinatario
                  </Label>
                  <button
                    type="button"
                    onClick={() => setTelefonoModal("+54 9 11 6002-1513")}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Usar mi N° de prueba
                  </button>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="wa-phone"
                    value={telefonoModal}
                    onChange={(e) => setTelefonoModal(e.target.value)}
                    placeholder="Ej: +54 9 11 6002-1513 o 1160021513"
                    className="text-xs h-9 bg-card"
                  />
                  {telefonoModal.trim() && telefonoModal !== clienteWa.telefono && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleGuardarTelefono(clienteWa.userId, telefonoModal)}
                      disabled={guardandoTel}
                      className="text-[11px] h-9 whitespace-nowrap rounded-lg border-border hover:bg-muted"
                    >
                      {guardandoTel ? "Guardando..." : "Guardar en ficha"}
                    </Button>
                  )}
                </div>
                {!clienteWa.telefono && !telefonoModal.trim() && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    ⚠️ Este socio no tiene teléfono cargado. Ingresá uno o hacé clic en "Usar mi N° de prueba" para habilitar el envío.
                  </p>
                )}
              </div>

              {/* Opción 1: Recordatorio Amigable */}
              <div className="p-3.5 rounded-xl border border-border hover:border-emerald-500 bg-card hover:bg-emerald-500/5 transition-all space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    1. Recordatorio Cordial (Cuota del Mes)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                  "Hola {clienteWa.nombre.split(" ")[0]}! Te escribimos desde {settings.nombreGimnasio || "el gimnasio"} para recordarte que tenés disponible la cuota de este mes..."
                </p>
                <div className="pt-1">
                  {obtenerMensajesWhatsApp(clienteWa, telefonoModal).recordatorio ? (
                    <Button asChild size="sm" className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                      <a
                        href={obtenerMensajesWhatsApp(clienteWa, telefonoModal).recordatorio!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Enviar Recordatorio Cordial
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled className="w-full rounded-lg text-xs font-bold opacity-60">
                      Ingresá un teléfono arriba
                    </Button>
                  )}
                </div>
              </div>

              {/* Opción 2: Aviso de Regularización */}
              <div className="p-3.5 rounded-xl border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 transition-all space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    2. Aviso de Regularización (Deuda Vencida)
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                  "Hola {clienteWa.nombre.split(" ")[0]}! Nos comunicamos desde {settings.nombreGimnasio || "el gimnasio"} para informarte que tenés cuotas pendientes de pago..."
                </p>
                <div className="pt-1">
                  {obtenerMensajesWhatsApp(clienteWa, telefonoModal).regularizacion ? (
                    <Button asChild size="sm" variant="destructive" className="w-full rounded-lg text-xs font-bold">
                      <a
                        href={obtenerMensajesWhatsApp(clienteWa, telefonoModal).regularizacion!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Enviar Aviso de Regularización
                      </a>
                    </Button>
                  ) : (
                    <Button size="sm" disabled variant="destructive" className="w-full rounded-lg text-xs font-bold opacity-60">
                      Ingresá un teléfono arriba
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setWaModalOpen(false)} className="text-xs">
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Centro de Recordatorios de WhatsApp ── */}
      <Dialog open={centroRecordatoriosOpen} onOpenChange={setCentroRecordatoriosOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              Centro de Recordatorios por WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs">
              Listado de todos los socios con cuota pendiente o deuda vencida ({clientesConDeudaOPendiente.length} socios).
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1 max-h-[55vh]">
            {clientesConDeudaOPendiente.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs">
                ¡Excelente! No hay socios con cuotas pendientes ni deudas en este momento.
              </div>
            ) : (
              clientesConDeudaOPendiente.map((c) => {
                const esDeuda = c.estadoGeneral === "ConDeuda";
                return (
                  <div
                    key={c.userId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-border bg-card hover:border-muted-foreground/30 transition-all shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PersonaAvatar seed={c.userId} size={36} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-xs text-foreground truncate">{c.nombre}</p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              esDeuda
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {esDeuda ? "Deuda Vencida" : "Pendiente este mes"}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {c.planNombre || "Sin plan"} · {c.telefono || "⚠️ Sin teléfono guardado"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => {
                          setCentroRecordatoriosOpen(false);
                          abrirModalWa(c);
                        }}
                        className="rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 h-8"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Enviar Recordatorio
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCentroRecordatoriosOpen(false)}
              className="text-xs rounded-xl"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}