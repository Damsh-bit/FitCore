import { useEffect, useState } from "react";
import {
  FileSpreadsheet, DollarSign, AlertTriangle, Users, Wallet, Download, Calendar,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type TipoReporte = "ingresos" | "morosidad" | "ocupacion" | "contable";

const REPORTES: { key: TipoReporte; label: string; icon: typeof DollarSign }[] = [
  { key: "ingresos", label: "Ingresos", icon: DollarSign },
  { key: "morosidad", label: "Morosidad", icon: AlertTriangle },
  { key: "ocupacion", label: "Ocupación por Hora", icon: Users },
  { key: "contable", label: "Contable Completo", icon: Wallet },
];

function money(n: number) {
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

function hoyISO() {
  return new Date().toISOString().split("T")[0];
}

function haceDiasISO(dias: number) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().split("T")[0];
}

async function descargarArchivo(path: string, filenameFallback: string) {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error("No se pudo generar el archivo.");
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition");
  let filename = filenameFallback;
  if (disposition) {
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;\r\n]+)/i);
    if (utf8Match?.[1]) {
      filename = decodeURIComponent(utf8Match[1]);
    } else {
      const standardMatch = disposition.match(/filename="?([^";\r\n]+)"?/i);
      if (standardMatch?.[1]) {
        filename = standardMatch[1].trim();
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function Reportes() {
  const { toast } = useToast();

  const [tipo, setTipo] = useState<TipoReporte>("ingresos");
  const [desde, setDesde] = useState(haceDiasISO(30));
  const [hasta, setHasta] = useState(hoyISO());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [exportando, setExportando] = useState(false);
  // Los datos van etiquetados con el tipo que los pidió: al cambiar de pestaña,
  // React puede renderizar un frame con el "tipo" ya nuevo pero los datos del
  // reporte anterior (con otra forma) todavía en el estado — esto evita que
  // ese frame intermedio intente leer campos que no existen en esa forma.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [datos, setDatos] = useState<{ tipo: TipoReporte; payload: any } | null>(null);

  const usaRango = tipo !== "morosidad";
  const datosActuales = datos && datos.tipo === tipo ? datos.payload : null;

  const cargar = () => {
    setLoading(true);
    setError(false);
    const tipoAlPedir = tipo;
    const query = usaRango ? `?desde=${desde}&hasta=${hasta}` : "";
    apiFetch(`/api/reportes/${tipo}${query}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((payload) => setDatos({ tipo: tipoAlPedir, payload }))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipo]);

  const aplicarRango = (dias: number) => {
    setDesde(haceDiasISO(dias));
    setHasta(hoyISO());
  };

  const handleExportar = async () => {
    setExportando(true);
    try {
      const query = usaRango ? `?desde=${desde}&hasta=${hasta}` : "";
      await descargarArchivo(`/api/reportes/${tipo}/export${query}`, `reporte_${tipo}.xlsx`);
      toast({ variant: "success", title: "Reporte exportado", description: "Se descargó el archivo listo para abrir en Excel (.xlsx)." });
    } catch {
      toast({ variant: "destructive", title: "No se pudo exportar el reporte" });
    } finally {
      setExportando(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <FileSpreadsheet className="w-7 h-7 text-orange-600 dark:text-orange-500" /> Reportes
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Generá informes del gimnasio y exportalos a Excel en un clic.
        </p>
      </div>

      {/* ── Selector de reporte ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REPORTES.map((r) => {
          const Icon = r.icon;
          const activo = tipo === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setTipo(r.key)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer",
                activo
                  ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/20"
                  : "border-border bg-card hover:border-muted-foreground/30"
              )}
            >
              <Icon className={cn("w-5 h-5", activo ? "text-orange-600 dark:text-orange-400" : "text-muted-foreground")} />
              <span className={cn("text-xs font-bold text-center", activo ? "text-orange-600 dark:text-orange-400" : "text-foreground/80")}>{r.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Rango de fechas + exportar ── */}
      <div className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        {usaRango ? (
          <>
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => aplicarRango(0)}>Hoy</Button>
              <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => aplicarRango(7)}>7 días</Button>
              <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => aplicarRango(30)}>30 días</Button>
              <Button type="button" variant="outline" size="sm" className="rounded-lg text-xs" onClick={() => aplicarRango(90)}>90 días</Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Desde</Label>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="rounded-xl h-9 w-36 sm:w-40" />
              <Label className="text-xs font-bold text-muted-foreground">Hasta</Label>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="rounded-xl h-9 w-36 sm:w-40" />
              <Button type="button" size="sm" className="rounded-lg text-xs" onClick={cargar}>Aplicar</Button>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted-foreground font-medium">Estado actual de morosidad — no requiere rango de fechas.</p>
        )}

        <Button
          type="button"
          onClick={handleExportar}
          loading={exportando}
          className="sm:ml-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4"
        >
          {!exportando && <Download className="w-3.5 h-3.5 mr-1.5" />}
          {exportando ? "Generando..." : "Exportar a Excel"}
        </Button>
      </div>

      {/* ── Resultados ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-5 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}</div>
        ) : error ? (
          <ErrorState message="No se pudo cargar el reporte. Puede ser un problema de conexión." onRetry={cargar} />
        ) : !datosActuales ? (
          <p className="text-sm text-muted-foreground text-center py-10">No se pudo cargar el reporte.</p>
        ) : (
          <div key={tipo} className="animate-fade-in-up">
            {tipo === "ingresos" ? (
              <ReporteIngresos datos={datosActuales} />
            ) : tipo === "morosidad" ? (
              <ReporteMorosidad datos={datosActuales} />
            ) : tipo === "ocupacion" ? (
              <ReporteOcupacion datos={datosActuales} />
            ) : (
              <ReporteContable datos={datosActuales} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReporteIngresos({ datos }: { datos: any }) {
  return (
    <div>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">{datos.cantidad} pagos registrados</span>
        <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{money(datos.total)}</span>
      </div>
      {datos.items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Sin ingresos en el rango seleccionado.</p>
      ) : (
        <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {datos.items.map((i: any, idx: number) => (
            <div key={idx} className="p-3 flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{i.cliente}</p>
                <p className="text-[11px] text-muted-foreground">{i.fecha} · {i.metodo}</p>
              </div>
              <span className="font-black text-foreground shrink-0 ml-3">{money(i.monto)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReporteMorosidad({ datos }: { datos: any }) {
  return (
    <div>
      <div className="p-4 border-b border-border flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">{datos.cantidad} clientes con deuda</span>
        <span className="text-lg font-black text-rose-600 dark:text-rose-400">{money(datos.totalEstimado)}</span>
      </div>
      {datos.items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Ningún cliente con deuda. 🎉</p>
      ) : (
        <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {datos.items.map((i: any, idx: number) => (
            <div key={idx} className="p-3 flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{i.cliente}</p>
                <p className="text-[11px] text-muted-foreground">{i.plan ?? "Sin plan"} · vence {i.vence ? new Date(i.vence).toLocaleDateString("es-AR") : "-"}</p>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-black text-rose-600 dark:text-rose-400">{money(i.montoEstimado)}</p>
                <Badge variant="outline" className="text-[10px] mt-0.5">{i.mesesAdeudados} {i.mesesAdeudados === 1 ? "mes" : "meses"}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReporteOcupacion({ datos }: { datos: any }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const max = Math.max(...datos.porHora.map((p: any) => p.cantidad), 1);
  return (
    <div className="p-5">
      <p className="text-xs font-bold text-muted-foreground mb-4">{datos.totalAsistencias} asistencias totales en el rango</p>
      <div className="flex items-end gap-1.5 h-40">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {datos.porHora.map((p: any) => (
          <div key={p.hora} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-orange-500 rounded-t-sm hover:bg-orange-600 transition-colors"
              style={{ height: `${Math.max((p.cantidad / max) * 100, p.cantidad > 0 ? 4 : 0)}%` }}
              title={`${p.hora}:00 — ${p.cantidad} asistencias`}
            />
            <span className="text-[8px] font-bold text-muted-foreground">{p.hora}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ReporteContable({ datos }: { datos: any }) {
  return (
    <div>
      <div className="p-4 border-b border-border grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Ingresos</p>
          <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{money(datos.totalIngresos)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Egresos</p>
          <p className="text-sm font-black text-rose-600 dark:text-rose-400">{money(datos.totalEgresos)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Inversiones</p>
          <p className="text-sm font-black text-blue-600 dark:text-blue-400">{money(datos.totalInversiones)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Compras</p>
          <p className="text-sm font-black text-amber-600 dark:text-amber-400">{money(datos.totalCompras)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Balance</p>
          <p className={cn("text-sm font-black", datos.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{money(datos.balance)}</p>
        </div>
      </div>
      {datos.items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">Sin movimientos en el rango seleccionado.</p>
      ) : (
        <div className="divide-y divide-border max-h-[380px] overflow-y-auto">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {datos.items.map((i: any, idx: number) => (
            <div key={idx} className="p-3 flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-bold text-foreground truncate">{i.descripcion}</p>
                <p className="text-[11px] text-muted-foreground">{i.fecha} · {i.tipo} · {i.categoria}</p>
              </div>
              <span className="font-black text-foreground shrink-0 ml-3">{money(i.monto)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
