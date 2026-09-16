import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useGymSettings } from "@/context/GymSettingsContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Dumbbell,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import logoFull from "@/assets/brand/fitcore-logo-full.png";

export default function Register() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tardando, setTardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { login, isAuthenticated, isCliente } = useAuth();
  const { settings } = useGymSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  if (isAuthenticated) {
    return <Navigate to={isCliente ? "/dashboard-cliente" : "/dashboard-admin"} replace />;
  }

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => setForm((p) => ({ ...p, [field]: e.target.value }));

  // Validación simple de fortaleza de contraseña
  const passwordStrength = (() => {
    const p = form.password;
    if (p.length === 0) return null;
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 2) return { level: "débil", color: "bg-red-400", width: "w-1/4", text: "text-red-500" };
    if (score <= 3) return { level: "media", color: "bg-amber-400", width: "w-2/4", text: "text-amber-600" };
    if (score <= 4) return { level: "buena", color: "bg-emerald-400", width: "w-3/4", text: "text-emerald-600" };
    return { level: "fuerte", color: "bg-emerald-500", width: "w-full", text: "text-emerald-600" };
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    setTardando(false);

    const avisoTardanza = setTimeout(() => setTardando(true), 4000);

    try {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          email: form.email.trim(),
          password: form.password,
          categoria: 2, // Categoria.Cliente
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const mensaje = data?.mensaje ?? data?.errores?.join(". ") ?? "No se pudo registrar el usuario.";
        throw new Error(mensaje);
      }

      const data = await res.json();
      login(data.token, {
        id: data.id,
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        categoria: data.categoria,
      });

      toast({
        variant: "success",
        title: "¡Cuenta creada exitosamente!",
        description: `Bienvenido/a ${data.nombre}, ya estás dentro.`,
      });

      const esCliente = data.categoria === 2 || data.categoria === "Cliente";
      navigate(esCliente ? "/dashboard-cliente" : "/dashboard-admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con el servidor.";
      setErrorMsg(msg);
      toast({
        variant: "destructive",
        title: "Error al registrarse",
        description: msg,
      });
    } finally {
      clearTimeout(avisoTardanza);
      setLoading(false);
      setTardando(false);
    }
  };

  const gymName = settings.nombreGimnasio?.trim() || "FitCore";
  const gymLogo = settings.logoBase64 || logoFull;

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden font-sans">
      {/* ========================================================
          PANEL IZQUIERDO: HERO FITNESS & BRANDING DEL GIMNASIO
      ======================================================== */}
      <div className="relative hidden lg:flex lg:col-span-6 xl:col-span-7 flex-col justify-between p-10 xl:p-16 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-900 text-white border-r border-slate-800/80 select-none">
        {/* Glow de fondo dinámico */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Encabezado Izquierdo con Logo */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-6">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium tracking-wide text-slate-300">
              Registro de Nuevos Socios
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-white/90 rounded-xl p-2.5 shadow-sm">
              <img
                src={gymLogo}
                alt={gymName}
                className="h-12 max-w-[180px] object-contain"
              />
            </div>
            <div className="border-l border-slate-700/70 pl-4">
              <h1 className="text-xl font-bold tracking-tight text-white">{gymName}</h1>
              <p className="text-xs text-slate-400 font-medium">Plataforma Cloud FitCore</p>
            </div>
          </div>
        </div>

        {/* Contenido Central: Mensaje de Bienvenida */}
        <div className="relative z-10 my-auto py-10 max-w-xl">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Unite a la comunidad <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">
              de {gymName}.
            </span>
          </h2>

          <p className="mt-4 text-sm xl:text-base text-slate-300 leading-relaxed">
            {settings.mensajeBienvenida ||
              "Creá tu cuenta como socio y accedé a tu historial de asistencias, estado de cuenta, progreso deportivo y mucho más."}
          </p>

          {/* Beneficios para el nuevo socio */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                <Dumbbell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-200">Registrá tus asistencias</h3>
                <p className="text-[11px] text-slate-400">Accedé al historial completo de todas tus visitas al gym.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-200">Tu cuenta siempre al día</h3>
                <p className="text-[11px] text-slate-400">Consultá pagos, vencimientos y estado de tu cuota desde tu celular.</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-200">Seguí tu evolución</h3>
                <p className="text-[11px] text-slate-400">Controlá tu progreso físico y mediciones con gráficos claros.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie Izquierdo */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tus datos están protegidos con cifrado de seguridad</span>
          </div>
          <span className="text-slate-500">FitCore v2.4</span>
        </div>
      </div>

      {/* ========================================================
          PANEL DERECHO: FORMULARIO DE REGISTRO
      ======================================================== */}
      <div className="flex-1 lg:col-span-6 xl:col-span-5 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12 bg-slate-900/60 lg:bg-slate-950 relative min-h-screen">
        {/* Glow sutil en mobile */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-orange-500/10 rounded-full blur-3xl pointer-events-none lg:hidden" />

        <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-7 sm:p-9 shadow-2xl shadow-black/40 backdrop-blur-sm animate-scale-in">
          {/* Header del Formulario */}
          <div className="text-center mb-6">
            <div className="inline-flex lg:hidden mb-4 justify-center">
              <img
                src={gymLogo}
                alt={gymName}
                className="h-14 w-auto object-contain"
              />
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nuevo Socio</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Crear tu cuenta
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Completá tus datos para registrarte en {gymName}
            </p>
          </div>

          {/* Banner de Error Inline */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-3 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">No pudimos crear la cuenta</p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Formulario de Registro */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="nombre" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nombre
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="nombre"
                    type="text"
                    placeholder="Juan"
                    value={form.nombre}
                    onChange={handleChange("nombre")}
                    disabled={loading}
                    required
                    autoComplete="given-name"
                    autoFocus
                    className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-orange-500 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="apellido" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Apellido
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <Input
                    id="apellido"
                    type="text"
                    placeholder="Pérez"
                    value={form.apellido}
                    onChange={handleChange("apellido")}
                    disabled={loading}
                    required
                    autoComplete="family-name"
                    className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-orange-500 rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Correo Electrónico */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Correo electrónico
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={form.email}
                  onChange={handleChange("email")}
                  disabled={loading}
                  required
                  autoComplete="email"
                  className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-orange-500 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Contraseña con Toggle y Indicador de Fortaleza */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Contraseña
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={handleChange("password")}
                  disabled={loading}
                  required
                  autoComplete="new-password"
                  className="pl-10 pr-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-orange-500 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Indicador de fortaleza de contraseña */}
              {passwordStrength && (
                <div className="pt-1.5 space-y-1 animate-fade-in-up">
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`}
                    />
                  </div>
                  <p className={`text-[11px] font-medium ${passwordStrength.text}`}>
                    Seguridad: {passwordStrength.level}
                  </p>
                </div>
              )}
            </div>

            {/* Botón de Registro */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition-all duration-200 mt-2"
              loading={loading}
            >
              {loading ? "Creando tu cuenta..." : "Registrarme en " + gymName}
            </Button>

            {/* Feedback de servidor en reposo */}
            {tardando && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5 animate-fade-in-up">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
                <span>
                  El servidor estaba inactivo y está arrancando. Puede demorar unos segundos…
                </span>
              </div>
            )}
          </form>

          {/* Nota de confianza */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Tu cuenta se crea como socio. El gym activará tu plan.</span>
          </div>

          {/* Enlace a Login */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ¿Ya tenés cuenta?{" "}
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-orange-600 dark:text-orange-400 font-semibold hover:underline ml-1"
              >
                Iniciá sesión
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          <p>FitCore Gym Management System • Registro de socios</p>
        </div>
      </div>
    </div>
  );
}
