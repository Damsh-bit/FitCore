import { useEffect, useState } from "react";
import {
  Wallet, TrendingUp, TrendingDown, PiggyBank, ShoppingCart, Plus, Trash2,
  ListChecks, CheckCircle2, XCircle, Clock,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import ChartTooltip from "@/components/charts/ChartTooltip";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/components/ui/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Movimiento {
  id: number;
  tipo: "Ingreso" | "Egreso" | "Inversion" | "Compra";
  categoria: string;
  descripcion: string;
  monto: number;
  fecha: string;
  proveedor: string | null;
  nota: string | null;
}

interface SerieMensual {
  mes: string;
  ingresos: number;
  egresos: number;
}

interface Resumen {
  totalIngresosVarios: number;
  totalEgresos: number;
  totalInversiones: number;
  totalCompras: number;
  totalCuotas: number;
  totalIngresos: number;
  balance: number;
  serieMensual: SerieMensual[];
}

interface CompraFutura {
  id: number;
  descripcion: string;
  montoEstimado: number;
  prioridad: "Baja" | "Media" | "Alta";
  estado: "Pendiente" | "Comprada" | "Cancelada";
  fechaEstimada: string | null;
  nota: string | null;
}

const TIPO_COLOR: Record<string, string> = {
  Ingreso: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
  Egreso: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60",
  Inversion: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60",
  Compra: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60",
};

const PRIORIDAD_COLOR: Record<string, string> = {
  Alta: "bg-rose-500 text-white",
  Media: "bg-amber-500 text-white",
  Baja: "bg-gray-300 text-gray-700",
};

function money(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

export default function Contabilidad() {
  const { toast } = useToast();

  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [comprasFuturas, setComprasFuturas] = useState<CompraFutura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  // Form nuevo movimiento
  const [tipo, setTipo] = useState("Egreso");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [proveedor, setProveedor] = useState("");
  const [nota, setNota] = useState("");
  const [guardandoMov, setGuardandoMov] = useState(false);

  // Form nueva compra futura
  const [cfDescripcion, setCfDescripcion] = useState("");
  const [cfMonto, setCfMonto] = useState("");
  const [cfPrioridad, setCfPrioridad] = useState("Media");
  const [cfFecha, setCfFecha] = useState("");
  const [guardandoCf, setGuardandoCf] = useState(false);

  const cargarTodo = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      apiFetch("/api/movimientos/resumen").then((r) => (r.ok ? r.json() : Promise.reject())),
      apiFetch(`/api/movimientos${filtroTipo !== "todos" ? `?tipo=${filtroTipo}` : ""}`).then((r) => (r.ok ? r.json() : Promise.reject())),
      apiFetch("/api/compras-futuras").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([res, movs, compras]) => {
        setResumen(res);
        setMovimientos(movs);
        setComprasFuturas(compras);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarTodo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroTipo]);

  const handleAgregarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoNum = parseFloat(monto);
    if (!montoNum || montoNum <= 0) {
      toast({ variant: "destructive", title: "Monto inválido" });
      return;
    }
    if (!descripcion.trim()) {
      toast({ variant: "destructive", title: "Falta la descripción" });
      return;
    }

    setGuardandoMov(true);
    try {
      const res = await apiFetch("/api/movimientos", {
        method: "POST",
        body: JSON.stringify({
          tipo,
          categoria: categoria.trim() || "General",
          descripcion: descripcion.trim(),
          monto: montoNum,
          fecha,
          proveedor: proveedor.trim() || null,
          nota: nota.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje ?? "No se pudo guardar el movimiento.");
      }
      toast({ variant: "success", title: "Movimiento registrado" });
      setCategoria("");
      setDescripcion("");
      setMonto("");
      setProveedor("");
      setNota("");
      setFecha(hoyISO());
      cargarTodo();
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Intentá de nuevo." });
    } finally {
      setGuardandoMov(false);
    }
  };

  const handleEliminarMovimiento = async (id: number) => {
    const prev = movimientos;
    setMovimientos((m) => m.filter((x) => x.id !== id));
    const res = await apiFetch(`/api/movimientos/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMovimientos(prev);
      toast({ variant: "destructive", title: "No se pudo eliminar" });
    } else {
      cargarTodo();
    }
  };

  const handleAgregarCompraFutura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfDescripcion.trim()) {
      toast({ variant: "destructive", title: "Falta la descripción" });
      return;
    }
    setGuardandoCf(true);
    try {
      const res = await apiFetch("/api/compras-futuras", {
        method: "POST",
        body: JSON.stringify({
          descripcion: cfDescripcion.trim(),
          montoEstimado: parseFloat(cfMonto) || 0,
          prioridad: cfPrioridad,
          fechaEstimada: cfFecha || null,
          nota: null,
        }),
      });
      if (!res.ok) throw new Error();
      const nueva: CompraFutura = await res.json();
      setComprasFuturas((prev) => [nueva, ...prev]);
      setCfDescripcion("");
      setCfMonto("");
      setCfFecha("");
      toast({ variant: "success", title: "Compra futura agregada" });
    } catch {
      toast({ variant: "destructive", title: "No se pudo agregar" });
    } finally {
      setGuardandoCf(false);
    }
  };

  const handleCambiarEstadoCompra = async (compra: CompraFutura, estado: string) => {
    const res = await apiFetch(`/api/compras-futuras/${compra.id}`, {
      method: "PUT",
      body: JSON.stringify({ estado }),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "No se pudo actualizar" });
      return;
    }
    const actualizado: CompraFutura = await res.json();
    setComprasFuturas((prev) => prev.map((c) => (c.id === compra.id ? actualizado : c)));
    if (estado === "Comprada") {
      toast({ variant: "success", title: "Marcada como comprada", description: "Se registró el gasto en Movimientos." });
      cargarTodo();
    }
  };

  const handleEliminarCompra = async (id: number) => {
    const prev = comprasFuturas;
    setComprasFuturas((c) => c.filter((x) => x.id !== id));
    const res = await apiFetch(`/api/compras-futuras/${id}`, { method: "DELETE" });
    if (!res.ok) setComprasFuturas(prev);
  };

  const comprasPendientes = comprasFuturas.filter((c) => c.estado === "Pendiente");
  const comprasResueltas = comprasFuturas.filter((c) => c.estado !== "Pendiente");

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <Wallet className="w-7 h-7 text-orange-600 dark:text-orange-500" /> Gestión Contable
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Ingresos, egresos, inversiones y compras del gimnasio — todo en un solo lugar.
        </p>
      </div>

      {error && !loading && (
        <ErrorState compact message="No se pudieron cargar los datos contables. Puede ser un problema de conexión." onRetry={cargarTodo} />
      )}

      {/* ── Resumen del mes ── */}
      {loading && !resumen ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 animate-fade-in-up">
          <div className={`rounded-2xl p-4 border ${resumen && resumen.balance >= 0 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-rose-500/10 border-rose-500/20"}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Balance del Mes</p>
            <p className={`text-xl font-black mt-0.5 ${resumen && resumen.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {money(resumen?.balance ?? 0)}
            </p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Ingresos</p>
            <p className="text-xl font-black text-foreground mt-0.5">{money(resumen?.totalIngresos ?? 0)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><TrendingDown className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Egresos</p>
            <p className="text-xl font-black text-foreground mt-0.5">{money(resumen?.totalEgresos ?? 0)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><PiggyBank className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Inversiones</p>
            <p className="text-xl font-black text-foreground mt-0.5">{money(resumen?.totalInversiones ?? 0)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1"><ShoppingCart className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Compras</p>
            <p className="text-xl font-black text-foreground mt-0.5">{money(resumen?.totalCompras ?? 0)}</p>
          </div>
        </div>
      )}

      {/* ── Gráfico ingresos vs egresos ── */}
      {loading && !resumen ? (
        <Skeleton className="h-52 w-full rounded-2xl" />
      ) : resumen && (
        <div className="bg-card border border-border rounded-2xl p-5 animate-fade-in-up">
          <h2 className="text-sm font-bold text-foreground mb-4">Ingresos vs. Egresos — últimos 6 meses</h2>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resumen.serieMensual} margin={{ top: 8, right: 4, left: -16, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="mes"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }} width={32} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                  content={(props) => <ChartTooltip {...(props as object)} formatter={money} />}
                />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="square"
                  iconSize={9}
                  formatter={(value) => <span className="text-[11px] font-semibold text-muted-foreground">{value}</span>}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={22} />
                <Bar dataKey="egresos" name="Egresos" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Nuevo movimiento ── */}
        <form onSubmit={handleAgregarMovimiento} className="bg-card border border-border rounded-2xl p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <Plus className="w-4 h-4 text-orange-600 dark:text-orange-500" />
            <h2 className="text-sm font-bold text-foreground">Nuevo Movimiento</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ingreso">Ingreso</SelectItem>
                  <SelectItem value="Egreso">Egreso</SelectItem>
                  <SelectItem value="Inversion">Inversión</SelectItem>
                  <SelectItem value="Compra">Compra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Categoría</Label>
              <Input placeholder="Ej: Alquiler, Limpieza" value={categoria} onChange={(e) => setCategoria(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">Descripción</Label>
            <Input placeholder="Ej: Alquiler del local - septiembre" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required className="rounded-xl" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Monto</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={monto} onChange={(e) => setMonto(e.target.value)} required className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="rounded-xl" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Proveedor (opcional)</Label>
              <Input placeholder="Ej: Inmobiliaria XYZ" value={proveedor} onChange={(e) => setProveedor(e.target.value)} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Nota (opcional)</Label>
              <Input placeholder="Detalle adicional" value={nota} onChange={(e) => setNota(e.target.value)} className="rounded-xl" />
            </div>
          </div>

          <Button type="submit" loading={guardandoMov} className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs h-10">
            {guardandoMov ? "Guardando..." : "Registrar Movimiento"}
          </Button>
        </form>

        {/* ── Compras futuras ── */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border">
            <ListChecks className="w-4 h-4 text-orange-600 dark:text-orange-500" />
            <h2 className="text-sm font-bold text-foreground">Compras Futuras</h2>
          </div>

          <form onSubmit={handleAgregarCompraFutura} className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Ej: Máquina de cardio nueva"
                value={cfDescripcion}
                onChange={(e) => setCfDescripcion(e.target.value)}
                className="rounded-xl col-span-3 sm:col-span-1"
              />
              <Input
                type="number" step="0.01" placeholder="Monto est."
                value={cfMonto} onChange={(e) => setCfMonto(e.target.value)}
                className="rounded-xl"
              />
              <Select value={cfPrioridad} onValueChange={setCfPrioridad}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Media">Media</SelectItem>
                  <SelectItem value="Baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Input type="date" value={cfFecha} onChange={(e) => setCfFecha(e.target.value)} className="rounded-xl" />
              <Button type="submit" loading={guardandoCf} className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shrink-0 px-4">
                Agregar
              </Button>
            </div>
          </form>

          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {comprasPendientes.length === 0 && comprasResueltas.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No hay compras futuras planificadas.</p>
            ) : (
              [...comprasPendientes, ...comprasResueltas].map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-border hover:bg-muted/50 animate-fade-in-up"
                  style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`text-xs font-bold text-foreground truncate ${c.estado !== "Pendiente" ? "line-through text-muted-foreground" : ""}`}>
                        {c.descripcion}
                      </p>
                      <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md shrink-0 ${PRIORIDAD_COLOR[c.prioridad]}`}>
                        {c.prioridad}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {money(c.montoEstimado)} {c.fechaEstimada && `· ${c.fechaEstimada}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {c.estado === "Pendiente" ? (
                      <>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10" onClick={() => handleCambiarEstadoCompra(c, "Comprada")} aria-label="Marcar comprada">
                          <CheckCircle2 className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:bg-muted" onClick={() => handleCambiarEstadoCompra(c, "Cancelada")} aria-label="Cancelar">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-[9px] gap-1">
                        {c.estado === "Comprada" ? <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Clock className="w-3 h-3 text-muted-foreground" />}
                        {c.estado}
                      </Badge>
                    )}
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10" onClick={() => handleEliminarCompra(c.id)} aria-label="Eliminar">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Historial de movimientos ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-5 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-bold text-foreground">Historial de Movimientos</h2>
          <Select value={filtroTipo} onValueChange={setFiltroTipo}>
            <SelectTrigger className="rounded-xl w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              <SelectItem value="Ingreso">Ingresos</SelectItem>
              <SelectItem value="Egreso">Egresos</SelectItem>
              <SelectItem value="Inversion">Inversiones</SelectItem>
              <SelectItem value="Compra">Compras</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="p-5 space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}</div>
        ) : movimientos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No hay movimientos registrados todavía.</p>
        ) : (
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {movimientos.map((m, i) => (
              <div
                key={m.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/50 animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg border shrink-0 ${TIPO_COLOR[m.tipo]}`}>
                    {m.tipo}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{m.descripcion}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {m.fecha} · {m.categoria} {m.proveedor && `· ${m.proveedor}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-black text-foreground">{money(m.monto)}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-rose-500 hover:bg-rose-500/10" onClick={() => handleEliminarMovimiento(m.id)} aria-label="Eliminar">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
