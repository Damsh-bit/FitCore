import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Dumbbell, Camera, ImageOff, Scale } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { apiFetch } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/error-state";
import ChartTooltip from "@/components/charts/ChartTooltip";

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

const NOMBRES_DIA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function formatFecha(fechaStr: string) {
  const [y, m, d] = fechaStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export default function MiProgreso() {
  const [mediciones, setMediciones] = useState<Medicion[]>([]);
  const [rutina, setRutina] = useState<RutinaDia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const cargar = () => {
    setLoading(true);
    setError(false);
    Promise.all([
      apiFetch("/api/mediciones/mis-mediciones").then((r) => (r.ok ? r.json() : Promise.reject())),
      apiFetch("/api/rutinas/mi-rutina").then((r) => (r.ok ? r.json() : Promise.reject())),
    ])
      .then(([m, r]) => {
        setMediciones(m);
        setRutina(r);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const hoyDia = new Date().getDay();
  const rutinaHoy = rutina.find((r) => r.diaSemana === hoyDia);

  const ultima = mediciones[mediciones.length - 1];
  const anterior = mediciones[mediciones.length - 2];
  const primera = mediciones[0];
  const deltaTotal = ultima && primera ? ultima.pesoKg - primera.pesoKg : 0;
  const deltaUltima = ultima && anterior ? ultima.pesoKg - anterior.pesoKg : 0;

  const fotosPrimera = primera && (primera.fotoFrenteBase64 || primera.fotoPerfilBase64);
  const fotosUltima = ultima && (ultima.fotoFrenteBase64 || ultima.fotoPerfilBase64) && ultima.id !== primera?.id;

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl">
        <ErrorState message="No se pudo cargar tu progreso. Puede ser un problema de conexión." onRetry={cargar} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl animate-fade-in-up">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-orange-600 dark:text-orange-500" /> Mi Progreso
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Tu evolución de peso y las rutinas que te va cargando tu entrenador.
        </p>
      </div>

      {/* ── Rutina de hoy ── */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <Dumbbell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
              {NOMBRES_DIA[hoyDia]} — hoy te toca
            </p>
            <h2 className="text-lg font-black">
              {rutinaHoy ? rutinaHoy.descripcion : "Descanso / sin rutina asignada"}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
          {NOMBRES_DIA.map((nombre, idx) => {
            const dia = rutina.find((r) => r.diaSemana === idx);
            return (
              <div
                key={idx}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold ${
                  idx === hoyDia
                    ? "bg-orange-500 text-white"
                    : dia
                    ? "bg-white/10 text-zinc-200"
                    : "bg-white/5 text-zinc-500"
                }`}
                title={dia?.descripcion}
              >
                {nombre.slice(0, 3)}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Peso: stat + gráfico ── */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Evolución de peso</h2>
              <p className="text-xs text-muted-foreground">
                {mediciones.length} {mediciones.length === 1 ? "medición cargada" : "mediciones cargadas"}
              </p>
            </div>
          </div>
          {ultima && (
            <div className="text-right">
              <p className="text-3xl font-black text-foreground">{ultima.pesoKg} kg</p>
              <p className="text-xs text-muted-foreground">último registro — {formatFecha(ultima.fecha)}</p>
            </div>
          )}
        </div>

        {mediciones.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Todavía no tenés mediciones cargadas por tu entrenador.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-3">
                {deltaUltima === 0 ? (
                  <Minus className="w-5 h-5 text-muted-foreground" />
                ) : deltaUltima < 0 ? (
                  <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Desde la última medición</p>
                  <p className="text-sm font-black text-foreground">
                    {deltaUltima > 0 ? "+" : ""}
                    {deltaUltima.toFixed(1)} kg
                  </p>
                </div>
              </div>
              <div className="bg-muted/50 rounded-2xl p-4 flex items-center gap-3">
                {deltaTotal <= 0 ? (
                  <TrendingDown className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Desde el primer registro</p>
                  <p className="text-sm font-black text-foreground">
                    {deltaTotal > 0 ? "+" : ""}
                    {deltaTotal.toFixed(1)} kg
                  </p>
                </div>
              </div>
            </div>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mediciones} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient-peso" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.18} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="fecha"
                    tickFormatter={(v) => formatFecha(v)}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                    padding={{ left: 12, right: 12 }}
                  />
                  <YAxis
                    domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: 700, fill: "hsl(var(--muted-foreground))" }}
                    width={32}
                    tickCount={4}
                  />
                  <Tooltip
                    cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
                    content={(props) => (
                      <ChartTooltip
                        {...(props as object)}
                        variant="line"
                        formatter={(v) => `${v} kg`}
                        labelFormatter={(l) => formatFecha(String(l))}
                      />
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="pesoKg"
                    name="Peso"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#gradient-peso)"
                    dot={{ r: 4, fill: "#2563eb", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                    activeDot={{ r: 5, stroke: "hsl(var(--card))", strokeWidth: 2 }}
                    isAnimationActive
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* ── Antes / Después ── */}
      <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Camera className="w-5 h-5" />
          </div>
          <h2 className="text-base font-bold text-foreground">Antes y después</h2>
        </div>

        {!fotosPrimera && !fotosUltima ? (
          <div className="p-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <ImageOff className="w-8 h-8 text-muted-foreground/60" />
            Todavía no hay fotos de progreso cargadas.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Antes — {primera && formatFecha(primera.fecha)}
              </p>
              <div className="rounded-2xl overflow-hidden bg-muted aspect-[3/4] flex items-center justify-center">
                {primera?.fotoFrenteBase64 ? (
                  <img src={primera.fotoFrenteBase64} alt="Foto antes" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-8 h-8 text-muted-foreground/60" />
                )}
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                Ahora — {ultima && formatFecha(ultima.fecha)}
              </p>
              <div className="rounded-2xl overflow-hidden bg-muted aspect-[3/4] flex items-center justify-center">
                {ultima?.fotoFrenteBase64 ? (
                  <img src={ultima.fotoFrenteBase64} alt="Foto ahora" className="w-full h-full object-cover" />
                ) : (
                  <ImageOff className="w-8 h-8 text-muted-foreground/60" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
