import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Copy,
  TrendingUp,
  Percent,
  Search,
  LayoutGrid,
  Table as TableIcon,
  Users,
  Calendar,
  DollarSign,
  Sparkles,
  ArrowRight,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
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

export type Plan = {
  id: number;
  nombre: string;
  precio: number;
  duracionEnDias: number;
  activo: boolean;
  sociosActivos?: number;
};

const emptyForm = { nombre: "", precio: "", duracionEnDias: "30" };

export default function PlanesAdmin() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Vista: 'cards' | 'table'
  const [vista, setVista] = useState<"cards" | "table">("cards");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "activos" | "inactivos">("activos");

  // Modal crear / editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Modal eliminar / desactivar
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Modal Ajuste Masivo de Precios (Herramienta Anti-Inflación)
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false);
  const [porcentajeAjuste, setPorcentajeAjuste] = useState("15");
  const [redondearACien, setRedondearACien] = useState(true);
  const [ajustando, setAjustando] = useState(false);

  const { toast } = useToast();

  const cargarPlanes = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/planes");
      const data = await res.json();
      setPlanes(Array.isArray(data) ? data : []);
    } catch {
      toast({
        variant: "destructive",
        title: "Error al cargar",
        description: "No se pudieron obtener los planes del gimnasio.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarPlanes();
  }, []);

  // ── Métricas de Negocio de Planes ────────────────────────
  const metricas = useMemo(() => {
    const planesActivos = planes.filter((p) => p.activo);
    const totalSociosConPlan = planes.reduce((acc, p) => acc + (p.sociosActivos ?? 0), 0);
    const mrrEstimado = planesActivos.reduce(
      (acc, p) => acc + (p.sociosActivos ?? 0) * p.precio,
      0
    );

    // Plan más popular
    const planMasPopular = [...planes].sort(
      (a, b) => (b.sociosActivos ?? 0) - (a.sociosActivos ?? 0)
    )[0];

    return {
      totalPlanesActivos: planesActivos.length,
      totalSociosConPlan,
      mrrEstimado,
      planMasPopular: planMasPopular && (planMasPopular.sociosActivos ?? 0) > 0 ? planMasPopular : null,
    };
  }, [planes]);

  // ── Filtrado ─────────────────────────────────────────────
  const planesFiltrados = useMemo(() => {
    return planes.filter((p) => {
      const matchEstado =
        filtroEstado === "todos" ||
        (filtroEstado === "activos" ? p.activo : !p.activo);
      const q = busqueda.trim().toLowerCase();
      const matchBusqueda = !q || p.nombre.toLowerCase().includes(q);
      return matchEstado && matchBusqueda;
    });
  }, [planes, filtroEstado, busqueda]);

  // ── Modales de Crear, Editar, Clonar ──────────────────────
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      precio: String(p.precio),
      duracionEnDias: String(p.duracionEnDias),
    });
    setModalOpen(true);
  };

  const openDuplicate = (p: Plan) => {
    setEditing(null);
    setForm({
      nombre: `${p.nombre} (Copia)`,
      precio: String(p.precio),
      duracionEnDias: String(p.duracionEnDias),
    });
    setModalOpen(true);
    toast({
      title: "Plan duplicado",
      description: "Modificá el nombre o precio y guardá para crear la variante.",
    });
  };

  const handleSave = async () => {
    if (!form.nombre.trim()) {
      toast({ variant: "destructive", title: "El nombre es obligatorio" });
      return;
    }
    const precioNum = parseFloat(form.precio);
    if (isNaN(precioNum) || precioNum < 0) {
      toast({ variant: "destructive", title: "El precio debe ser un número válido" });
      return;
    }
    const duracionNum = parseInt(form.duracionEnDias);
    if (isNaN(duracionNum) || duracionNum <= 0) {
      toast({ variant: "destructive", title: "La duración debe ser mayor a 0 días" });
      return;
    }

    setSaving(true);
    const body = {
      nombre: form.nombre.trim(),
      precio: precioNum,
      duracionEnDias: duracionNum,
      activo: true,
    };

    try {
      if (editing) {
        const res = await apiFetch(`/api/planes/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...body, id: editing.id, activo: editing.activo }),
        });
        if (!res.ok) throw new Error();
        toast({ variant: "success", title: "Plan actualizado correctamente" });
      } else {
        const res = await apiFetch("/api/planes", {
          method: "POST",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast({ variant: "success", title: "Plan creado con éxito" });
      }
      setModalOpen(false);
      cargarPlanes();
    } catch {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: "Revisá los datos e intentá nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  // ── Desactivar / Reactivar Plan ──────────────────────────
  const handleDeleteOrToggle = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      if (deleting.activo) {
        // Desactivar
        const res = await apiFetch(`/api/planes/${deleting.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast({ variant: "success", title: "Plan desactivado" });
      } else {
        // Reactivar
        const res = await apiFetch(`/api/planes/${deleting.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...deleting, activo: true }),
        });
        if (!res.ok) throw new Error();
        toast({ variant: "success", title: "Plan reactivado" });
      }
      setDeleteOpen(false);
      setDeleting(null);
      cargarPlanes();
    } catch {
      toast({ variant: "destructive", title: "No se pudo actualizar el estado del plan" });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Ajuste Masivo de Precios (Anti-Inflación) ────────────
  const handleAjusteMasivo = async () => {
    const pct = parseFloat(porcentajeAjuste);
    if (isNaN(pct) || pct === 0) {
      toast({ variant: "destructive", title: "Ingresá un porcentaje válido distinto de 0" });
      return;
    }

    setAjustando(true);
    try {
      const res = await apiFetch("/api/planes/ajuste-masivo", {
        method: "POST",
        body: JSON.stringify({
          porcentaje: pct,
          redondearACien,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Error al aplicar ajuste");
      }

      toast({
        variant: "success",
        title: "¡Precios actualizados!",
        description: `Se aplicó un ${pct}% de aumento a los planes activos.`,
      });
      setAjusteModalOpen(false);
      cargarPlanes();
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Error en el ajuste masivo",
        description: e instanceof Error ? e.message : "Intentá nuevamente.",
      });
    } finally {
      setAjustando(false);
    }
  };

  // Previsualización de aumento en vivo para el modal
  const simulacionAjuste = useMemo(() => {
    const pct = parseFloat(porcentajeAjuste) || 0;
    const activos = planes.filter((p) => p.activo);
    return activos.map((p) => {
      let nuevo = p.precio * (1 + pct / 100);
      if (redondearACien) {
        nuevo = Math.round(nuevo / 100) * 100;
      } else {
        nuevo = Math.round(nuevo * 100) / 100;
      }
      return {
        ...p,
        nuevoPrecio: Math.max(0, nuevo),
        diferencia: Math.max(0, nuevo) - p.precio,
      };
    });
  }, [planes, porcentajeAjuste, redondearACien]);

  return (
    <div className="space-y-8 pb-12">
      {/* ── Encabezado Principal ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Planes y Tarifas</h1>
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5 rounded-full border-border bg-muted text-muted-foreground">
              Catálogo Comercial
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Gestión de membresías, precios, ajuste masivo por inflación y control de suscriptores activos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Ajuste Masivo */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAjusteModalOpen(true)}
            className="rounded-xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs"
          >
            <Percent className="w-3.5 h-3.5 mr-1.5 text-amber-600 dark:text-amber-400" />
            Ajuste Masivo de Precios
          </Button>

          {/* Botón Nuevo Plan */}
          <Button
            size="sm"
            onClick={openCreate}
            className="rounded-xl text-xs font-bold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nuevo Plan
          </Button>
        </div>
      </div>

      {/* ── Métricas del Catálogo (Cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Planes Activos */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-muted text-muted-foreground border border-border flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Planes Activos</span>
          </div>
          <div className="my-1">
            {loading ? (
              <Skeleton className="h-8 w-20 rounded mx-auto" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                {metricas.totalPlanesActivos}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
            <span>Opciones para venta</span>
          </div>
        </div>

        {/* Socios Inscriptos */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Socios con Plan</span>
          </div>
          <div className="my-1">
            {loading ? (
              <Skeleton className="h-8 w-24 rounded mx-auto" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                {metricas.totalSociosConPlan}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Membresías vigentes</span>
          </div>
        </div>

        {/* MRR Estimado */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">MRR Proyectado</span>
          </div>
          <div className="my-1">
            {loading ? (
              <Skeleton className="h-8 w-28 rounded mx-auto" />
            ) : (
              <p className="text-2xl sm:text-[28px] font-black text-foreground tracking-tight leading-none">
                ${metricas.mrrEstimado.toLocaleString("es-AR")}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate w-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Facturación recurrente mensual</span>
          </div>
        </div>

        {/* Plan Más Popular */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 min-h-[132px] flex flex-col justify-between items-center text-center relative overflow-hidden group">
          <div className="flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Más Elegido</span>
          </div>
          <div className="my-1 max-w-full px-1">
            {loading ? (
              <Skeleton className="h-8 w-32 rounded mx-auto" />
            ) : metricas.planMasPopular && (metricas.planMasPopular.sociosActivos ?? 0) > 0 ? (
              <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight truncate text-center" title={metricas.planMasPopular.nombre}>
                {metricas.planMasPopular.nombre}
              </p>
            ) : (
              <p className="text-xl sm:text-2xl font-black text-muted-foreground/50 tracking-tight leading-tight truncate text-center">
                {planes.length > 0 ? planes[0]?.nombre : "—"}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-medium truncate w-full">
            {metricas.planMasPopular && (metricas.planMasPopular.sociosActivos ?? 0) > 0 ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-amber-600 dark:text-amber-400">{metricas.planMasPopular.sociosActivos ?? 0} socios inscriptos</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />
                <span className="text-muted-foreground">Aún sin inscripciones</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Barra de Control: Búsqueda, Filtros y Vista Dual ── */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {/* Buscador */}
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar plan por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-8 rounded-xl h-9 text-xs"
            />
          </div>

          {/* Filtro Estado */}
          <Select
            value={filtroEstado}
            onValueChange={(val: "todos" | "activos" | "inactivos") => setFiltroEstado(val)}
          >
            <SelectTrigger className="w-[145px] rounded-xl h-9 text-xs font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activos" className="text-xs">Solo Activos</SelectItem>
              <SelectItem value="inactivos" className="text-xs">Solo Inactivos</SelectItem>
              <SelectItem value="todos" className="text-xs">Todos los planes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Selector de Modo de Vista (Cards vs Table) */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setVista("cards")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vista === "cards"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Tarjetas</span>
          </button>
          <button
            type="button"
            onClick={() => setVista("table")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              vista === "table"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Tabla</span>
          </button>
        </div>
      </div>

      {/* ── Contenido: Vista Tarjetas o Vista Tabla ── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : planesFiltrados.length === 0 ? (
        <div className="py-16 text-center text-xs text-muted-foreground bg-card rounded-2xl border border-border">
          No se encontraron planes con los filtros actuales.
        </div>
      ) : vista === "cards" ? (
        /* ── VISTA TARJETAS (Pricing Cards) ── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {planesFiltrados.map((p) => {
            const esMasPopular = metricas.planMasPopular?.id === p.id;
            return (
              <div
                key={p.id}
                className={`bg-card rounded-2xl border transition-all duration-200 shadow-xs flex flex-col justify-between overflow-hidden relative group hover:shadow-md ${
                  !p.activo ? "opacity-60 bg-muted/40 border-border" : esMasPopular ? "border-amber-500/80 ring-2 ring-amber-500/20" : "border-border hover:border-muted-foreground/30"
                }`}
              >
                {/* Badge flotante si es el más popular */}
                {esMasPopular && p.activo && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Más Elegido
                    </span>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <div>
                    <Badge
                      variant={p.activo ? "success" : "secondary"}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full mb-2"
                    >
                      {p.activo ? "Activo para venta" : "Desactivado"}
                    </Badge>
                    <h3 className="text-lg font-black text-foreground group-hover:text-primary transition-colors">
                      {p.nombre}
                    </h3>
                  </div>

                  {/* Precio y Duración */}
                  <div className="pt-2 border-t border-border">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-foreground tracking-tight">
                        ${p.precio.toLocaleString("es-AR")}
                      </span>
                      <span className="text-xs text-muted-foreground font-medium">
                        / {p.duracionEnDias} días
                      </span>
                    </div>
                  </div>

                  {/* Estadísticas de socios inscriptos */}
                  <div className="bg-muted/40 rounded-xl p-3 border border-border space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        Socios activos:
                      </span>
                      <span className="font-bold text-foreground">
                        {p.sociosActivos ?? 0} socios
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        Vigencia:
                      </span>
                      <span className="font-semibold text-foreground">
                        {p.duracionEnDias === 30 ? "1 Mes" : p.duracionEnDias === 90 ? "Trimestral" : `${p.duracionEnDias} días`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones de la Tarjeta */}
                <div className="px-6 py-3 bg-muted/30 border-t border-border flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(p)}
                    className="flex-1 rounded-xl text-xs font-semibold h-8 border-border hover:bg-muted"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                    Editar
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDuplicate(p)}
                    className="rounded-xl text-xs font-medium h-8 text-muted-foreground hover:text-foreground"
                    title="Duplicar como nuevo plan"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDeleting(p);
                      setDeleteOpen(true);
                    }}
                    className={`rounded-xl text-xs font-medium h-8 ${
                      p.activo
                        ? "text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10"
                        : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10"
                    }`}
                    title={p.activo ? "Desactivar" : "Reactivar"}
                  >
                    {p.activo ? <Trash2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VISTA TABLA ADMINISTRATIVA ── */
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-xs">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                <TableHead className="py-3 px-4">Nombre del Plan</TableHead>
                <TableHead className="py-3 px-4">Precio Actual</TableHead>
                <TableHead className="py-3 px-4">Duración</TableHead>
                <TableHead className="py-3 px-4">Socios Activos</TableHead>
                <TableHead className="py-3 px-4">Estado</TableHead>
                <TableHead className="text-right py-3 px-4">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planesFiltrados.map((p) => (
                <TableRow key={p.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="py-3.5 px-4 font-bold text-foreground text-xs">
                    {p.nombre}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 font-black text-foreground text-xs">
                    ${p.precio.toLocaleString("es-AR")}
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-muted-foreground text-xs font-medium">
                    {p.duracionEnDias} días
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full text-[11px]">
                      <Users className="w-3 h-3" />
                      {p.sociosActivos ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="py-3.5 px-4">
                    <Badge variant={p.activo ? "success" : "secondary"} className="text-[10px] font-bold">
                      {p.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(p)}
                        title="Editar plan"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        onClick={() => openDuplicate(p)}
                        title="Duplicar plan"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 rounded-lg ${
                          p.activo
                            ? "text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-500/10"
                            : "text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-500/10"
                        }`}
                        onClick={() => {
                          setDeleting(p);
                          setDeleteOpen(true);
                        }}
                        title={p.activo ? "Desactivar" : "Reactivar"}
                      >
                        {p.activo ? <Trash2 className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Modal Crear / Editar Plan ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {editing ? "Editar Plan" : "Nuevo Plan de Membresía"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editing ? "Actualizá la tarifa o vigencia del plan." : "Creá una nueva opción de membresía para ofrecer en recepción."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre" className="text-xs font-semibold text-foreground">Nombre del Plan</Label>
              <Input
                id="nombre"
                placeholder="Ej: Pase Libre Musculación, Pase 3 Días..."
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                disabled={saving}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="precio" className="text-xs font-semibold text-foreground">Precio ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">$</span>
                  <Input
                    id="precio"
                    type="number"
                    min="0"
                    placeholder="25000"
                    className="pl-7 rounded-xl text-xs font-bold"
                    value={form.precio}
                    onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="duracion" className="text-xs font-semibold text-foreground">Duración (Días)</Label>
                <Input
                  id="duracion"
                  type="number"
                  min="1"
                  placeholder="30"
                  className="rounded-xl text-xs"
                  value={form.duracionEnDias}
                  onChange={(e) => setForm((p) => ({ ...p, duracionEnDias: e.target.value }))}
                  disabled={saving}
                />
              </div>
            </div>

            {/* Accesos rápidos de duración */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[11px] text-muted-foreground">Atajos:</span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, duracionEnDias: "30" }))}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                1 Mes (30d)
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, duracionEnDias: "90" }))}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Trimestre (90d)
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, duracionEnDias: "365" }))}
                className="px-2 py-0.5 text-[10px] font-bold rounded bg-muted hover:bg-muted/80 text-foreground transition-colors"
              >
                Anual (365d)
              </button>
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={saving} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} loading={saving} className="rounded-xl text-xs font-bold">
              {saving ? "Guardando..." : "Guardar Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Ajuste Masivo de Precios ── */}
      <Dialog open={ajusteModalOpen} onOpenChange={setAjusteModalOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-500" />
              Ajuste Masivo de Tarifas
            </DialogTitle>
            <DialogDescription className="text-xs">
              Incrementá los precios de todos los planes activos con un porcentaje general y redondeo cómodo para mostrador.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">% de Aumento</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.5"
                    min="-50"
                    max="100"
                    placeholder="15"
                    className="pr-7 rounded-xl text-sm font-bold"
                    value={porcentajeAjuste}
                    onChange={(e) => setPorcentajeAjuste(e.target.value)}
                    disabled={ajustando}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">%</span>
                </div>
              </div>

              <div className="space-y-1.5 flex flex-col justify-end">
                <label className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border cursor-pointer select-none text-xs font-semibold text-foreground">
                  <input
                    type="checkbox"
                    checked={redondearACien}
                    onChange={(e) => setRedondearACien(e.target.checked)}
                    disabled={ajustando}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                  />
                  <span>Redondear a centenas ($100)</span>
                </label>
              </div>
            </div>

            {/* Simulación en vivo */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wide">
                Simulación de Precios Nuevos ({simulacionAjuste.length} planes activos)
              </span>
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border text-xs">
                {simulacionAjuste.map((p) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between bg-card hover:bg-muted/50">
                    <span className="font-semibold text-foreground">{p.nombre}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground line-through">${p.precio.toLocaleString("es-AR")}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="font-black text-emerald-600 dark:text-emerald-400">${p.nuevoPrecio.toLocaleString("es-AR")}</span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                        (+${p.diferencia.toLocaleString("es-AR")})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setAjusteModalOpen(false)} disabled={ajustando} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button type="button" onClick={handleAjusteMasivo} loading={ajustando} className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white">
              {ajustando ? "Actualizando..." : "Confirmar Aumento Masivo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Modal Confirmar Desactivar / Reactivar ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {deleting?.activo ? "Desactivar Plan" : "Reactivar Plan"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {deleting?.activo ? (
                <>
                  ¿Estás seguro de que querés desactivar{" "}
                  <span className="font-bold text-foreground">{deleting?.nombre}</span>? Ya no estará disponible para nuevos socios en recepción.
                </>
              ) : (
                <>
                  ¿Querés volver a activar{" "}
                  <span className="font-bold text-foreground">{deleting?.nombre}</span> para que vuelva a figurar en venta?
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading} className="rounded-xl text-xs">
              Cancelar
            </Button>
            <Button
              type="button"
              variant={deleting?.activo ? "destructive" : "default"}
              onClick={handleDeleteOrToggle}
              loading={deleteLoading}
              className="rounded-xl text-xs font-bold"
            >
              {deleteLoading ? "Procesando..." : deleting?.activo ? "Desactivar" : "Reactivar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
