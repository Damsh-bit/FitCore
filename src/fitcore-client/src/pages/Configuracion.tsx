import { useEffect, useState } from "react";
import { Palette, Image as ImageIcon, MessageCircle, Save, Users, BarChart2, Lock, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { fileToBase64 } from "@/lib/fileToBase64";
import { useGymSettings } from "@/context/GymSettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { AVATAR_STYLES, DEFAULT_AVATAR_STYLE, getPersonaAvatarUri, type AvatarStyleId } from "@/lib/avatar";

const AVATAR_PREVIEW_SEEDS = ["Juan Perez", "Maria Gomez", "Ramiro Diaz"];

const MAX_BRANDING_BYTES = 700 * 1024;

const FUENTES = [
  { value: "inter", label: "Inter (moderna, por defecto)" },
  { value: "geist", label: "Geist (geométrica)" },
  { value: "system", label: "Sistema (nativa del dispositivo)" },
];

const RADIOS = [
  { value: "none", label: "Sin redondeo" },
  { value: "sm", label: "Sutil" },
  { value: "md", label: "Medio" },
  { value: "lg", label: "Redondeado (por defecto)" },
];

type FormState = {
  nombreGimnasio: string;
  logoBase64: string | null;
  faviconBase64: string | null;
  colorPrimario: string;
  colorSecundario: string;
  colorAcento: string;
  borderRadius: string;
  fontFamily: string;
  avatarStyle: AvatarStyleId;
  mensajeBienvenida: string;
  telefono: string;
  whatsapp: string;
  email: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  reporteOcupacionHabilitado: boolean;
  reporteContableHabilitado: boolean;
};

const DEFAULT_COLORS = {
  colorPrimario: "#4f46e5",
  colorSecundario: "#f3d5b5",
  colorAcento: "#f97316",
};

const emptyForm: FormState = {
  nombreGimnasio: "",
  logoBase64: null,
  faviconBase64: null,
  ...DEFAULT_COLORS,
  borderRadius: "lg",
  fontFamily: "inter",
  avatarStyle: DEFAULT_AVATAR_STYLE,
  mensajeBienvenida: "",
  telefono: "",
  whatsapp: "",
  email: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  reporteOcupacionHabilitado: true,
  reporteContableHabilitado: true,
};

type Seccion = "marca" | "colores" | "avatares" | "comunicacion" | "reportes";

const SECCIONES: { id: Seccion; label: string; icon: typeof Palette }[] = [
  { id: "marca", label: "Identidad de marca", icon: ImageIcon },
  { id: "colores", label: "Colores y estética", icon: Palette },
  { id: "avatares", label: "Avatares", icon: Users },
  { id: "comunicacion", label: "Comunicación al cliente", icon: MessageCircle },
  { id: "reportes", label: "Reportes", icon: BarChart2 },
];

export default function Configuracion() {
  const { refetch } = useGymSettings();
  const { toast } = useToast();

  const [seccion, setSeccion] = useState<Seccion>("marca");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch("/api/gymsettings")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          nombreGimnasio: data.nombreGimnasio ?? "",
          logoBase64: data.logoBase64,
          faviconBase64: data.faviconBase64,
          colorPrimario: data.colorPrimario ?? DEFAULT_COLORS.colorPrimario,
          colorSecundario: data.colorSecundario ?? DEFAULT_COLORS.colorSecundario,
          colorAcento: data.colorAcento ?? DEFAULT_COLORS.colorAcento,
          borderRadius: data.borderRadius ?? "lg",
          fontFamily: data.fontFamily ?? "inter",
          avatarStyle: (data.avatarStyle as AvatarStyleId) ?? DEFAULT_AVATAR_STYLE,
          mensajeBienvenida: data.mensajeBienvenida ?? "",
          telefono: data.telefono ?? "",
          whatsapp: data.whatsapp ?? "",
          email: data.email ?? "",
          instagramUrl: data.instagramUrl ?? "",
          facebookUrl: data.facebookUrl ?? "",
          tiktokUrl: data.tiktokUrl ?? "",
          reporteOcupacionHabilitado: data.reporteOcupacionHabilitado ?? true,
          reporteContableHabilitado: data.reporteContableHabilitado ?? true,
        });
      })
      .catch(() => {
        toast({ variant: "destructive", title: "No se pudo cargar la configuración actual" });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImagen = async (
    e: React.ChangeEvent<HTMLInputElement>,
    campo: "logoBase64" | "faviconBase64"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_BRANDING_BYTES) {
      toast({ variant: "destructive", title: "Imagen muy pesada", description: "El máximo es 700KB." });
      e.target.value = "";
      return;
    }
    const base64 = await fileToBase64(file);
    setForm((prev) => ({ ...prev, [campo]: base64 }));
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/gymsettings", {
        method: "PUT",
        body: JSON.stringify({
          nombreGimnasio: form.nombreGimnasio.trim() || null,
          logoBase64: form.logoBase64,
          faviconBase64: form.faviconBase64,
          colorPrimario: form.colorPrimario,
          colorSecundario: form.colorSecundario,
          colorAcento: form.colorAcento,
          borderRadius: form.borderRadius,
          fontFamily: form.fontFamily,
          avatarStyle: form.avatarStyle,
          mensajeBienvenida: form.mensajeBienvenida.trim() || null,
          telefono: form.telefono || null,
          whatsapp: form.whatsapp || null,
          email: form.email || null,
          instagramUrl: form.instagramUrl || null,
          facebookUrl: form.facebookUrl || null,
          tiktokUrl: form.tiktokUrl || null,
          reporteOcupacionHabilitado: form.reporteOcupacionHabilitado,
          reporteContableHabilitado: form.reporteContableHabilitado,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje ?? "No se pudo guardar la configuración.");
      }
      refetch();
      toast({ variant: "success", title: "Configuración guardada", description: "Los cambios ya se ven en el sistema." });
    } catch (err: unknown) {
      toast({ variant: "destructive", title: "Error", description: err instanceof Error ? err.message : "Intentá de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-3xl text-sm text-muted-foreground">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-black text-foreground tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalizá la marca, los colores y la comunicación que ven tus socios en la app.
        </p>
      </div>

      {/* Navegación por secciones */}
      <div className="flex gap-2 border-b border-border overflow-x-auto">
        {SECCIONES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSeccion(id)}
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-semibold border-b-2 -mb-px transition-colors cursor-pointer",
              seccion === id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {seccion === "marca" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="nombreGimnasio">Nombre comercial del gimnasio</Label>
            <Input
              id="nombreGimnasio"
              placeholder="Ej: Gimnasio Central"
              value={form.nombreGimnasio}
              onChange={(e) => setForm((p) => ({ ...p, nombreGimnasio: e.target.value }))}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Reemplaza a "FitCore" en el sidebar y en el login.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Logo (máx. 700KB)</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleImagen(e, "logoBase64")} disabled={saving} />
              {form.logoBase64 && (
                <img src={form.logoBase64} alt="preview logo" className="h-16 object-contain mt-1 border border-border rounded-lg p-1 bg-card" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Favicon (máx. 700KB)</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleImagen(e, "faviconBase64")} disabled={saving} />
              {form.faviconBase64 && (
                <img src={form.faviconBase64} alt="preview favicon" className="h-16 w-16 object-contain mt-1 border border-border rounded-lg p-1 bg-card" />
              )}
            </div>
          </div>

          <p className="text-xs text-muted-foreground border-t border-border pt-4">
            FitCore sigue apareciendo como marca "Powered by FitCore" en el sidebar cuando cargás un logo propio.
          </p>
        </div>
      )}

      {seccion === "colores" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Color primario</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colorPrimario}
                  onChange={(e) => setForm((p) => ({ ...p, colorPrimario: e.target.value }))}
                  disabled={saving}
                  className="h-10 w-14 rounded-lg border border-border bg-card cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{form.colorPrimario}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color secundario</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colorSecundario}
                  onChange={(e) => setForm((p) => ({ ...p, colorSecundario: e.target.value }))}
                  disabled={saving}
                  className="h-10 w-14 rounded-lg border border-border bg-card cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{form.colorSecundario}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Color de acento</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.colorAcento}
                  onChange={(e) => setForm((p) => ({ ...p, colorAcento: e.target.value }))}
                  disabled={saving}
                  className="h-10 w-14 rounded-lg border border-border bg-card cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-mono">{form.colorAcento}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Radio de bordes</Label>
              <Select value={form.borderRadius} onValueChange={(v) => setForm((p) => ({ ...p, borderRadius: v }))} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RADIOS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipografía</Label>
              <Select value={form.fontFamily} onValueChange={(v) => setForm((p) => ({ ...p, fontFamily: v }))} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FUENTES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {seccion === "avatares" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Estilo de avatar</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Se usa para clientes y usuarios que no tienen una foto propia — se ve así en Clientes, Asistencias y el dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {AVATAR_STYLES.map((style) => {
              const seleccionado = form.avatarStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  disabled={saving}
                  onClick={() => setForm((p) => ({ ...p, avatarStyle: style.id }))}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                    seleccionado
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                  )}
                >
                  <div className="flex -space-x-2 shrink-0">
                    {AVATAR_PREVIEW_SEEDS.map((seed) => (
                      <img
                        key={seed}
                        src={getPersonaAvatarUri(seed, style.id)}
                        alt=""
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full ring-2 ring-card bg-muted"
                      />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className={cn("text-sm font-bold truncate", seleccionado ? "text-foreground" : "text-foreground/80")}>
                      {style.label}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{style.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {seccion === "comunicacion" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="mensajeBienvenida">Mensaje de bienvenida</Label>
            <Textarea
              id="mensajeBienvenida"
              placeholder="Ej: ¡Bienvenido a Gimnasio Central! Entrená con nosotros y alcanzá tus objetivos."
              value={form.mensajeBienvenida}
              onChange={(e) => setForm((p) => ({ ...p, mensajeBienvenida: e.target.value }))}
              disabled={saving}
            />
            <p className="text-xs text-muted-foreground">Se muestra en el login y en el inicio de los socios.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" placeholder="Ej: 11 5555-5555" value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input id="whatsapp" placeholder="Ej: 5491155555555" value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="email">Email de contacto</Label>
              <Input id="email" type="email" placeholder="Ej: contacto@gimnasio.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" placeholder="https://instagram.com/tugym" value={form.instagramUrl} onChange={(e) => setForm((p) => ({ ...p, instagramUrl: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input id="facebook" placeholder="https://facebook.com/tugym" value={form.facebookUrl} onChange={(e) => setForm((p) => ({ ...p, facebookUrl: e.target.value }))} disabled={saving} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input id="tiktok" placeholder="https://tiktok.com/@tugym" value={form.tiktokUrl} onChange={(e) => setForm((p) => ({ ...p, tiktokUrl: e.target.value }))} disabled={saving} />
            </div>
          </div>
        </div>
      )}

      {seccion === "reportes" && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div>
            <p className="text-sm font-semibold text-foreground">Visibilidad de reportes</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Activá solo los reportes que uses. Los obligatorios siempre están disponibles.
            </p>
          </div>

          <div className="space-y-3">
            {/* --- Reportes siempre activos --- */}
            {[
              { label: "Ingresos", desc: "Pagos cobrados y total del período. Esencial para saber si el negocio es rentable." },
              { label: "Morosidad", desc: "Clientes con cuotas vencidas. Crítico para el flujo de caja de cualquier gimnasio." },
            ].map((r) => (
              <div
                key={r.label}
                className="flex items-start gap-4 p-4 rounded-xl border border-border bg-muted/30"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{r.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-border rounded-full px-2.5 py-1 shrink-0">
                  <Lock className="w-3 h-3" /> Siempre activo
                </span>
              </div>
            ))}

            {/* --- Reportes opcionales --- */}
            {[
              {
                key: "reporteOcupacionHabilitado" as const,
                label: "Ocupación por Hora",
                desc: "Histograma de asistencias por franja horaria. Útil para gyms con clases o turnos; prescindible si atendés de forma libre.",
              },
              {
                key: "reporteContableHabilitado" as const,
                label: "Contable Completo",
                desc: "Ingresos, egresos, inversiones y balance. Ideal si usás FitCore como herramienta contable; innecesario si llevás las cuentas con un contador aparte.",
              },
            ].map((r) => {
              const activo = form[r.key];
              return (
                <div
                  key={r.key}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-xl border transition-colors",
                    activo ? "border-border bg-card" : "border-border bg-muted/20"
                  )}
                >
                  <button
                    type="button"
                    role="switch"
                    aria-checked={activo}
                    disabled={saving}
                    onClick={() => setForm((p) => ({ ...p, [r.key]: !p[r.key] }))}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
                      "transition-colors duration-200 ease-in-out focus-visible:outline-none",
                      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 mt-0.5",
                      activo ? "bg-emerald-500" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg",
                        "ring-0 transition-transform duration-200 ease-in-out",
                        activo ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold", activo ? "text-foreground" : "text-muted-foreground")}>
                      {r.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest rounded-full px-2.5 py-1 shrink-0 mt-0.5",
                    activo
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleGuardar} loading={saving} className="rounded-xl font-bold">
          {!saving && <Save className="w-4 h-4 mr-2" />}
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
