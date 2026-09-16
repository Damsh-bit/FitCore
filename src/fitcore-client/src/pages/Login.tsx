import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useGymSettings } from "@/context/GymSettingsContext";
import { apiFetch } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  HelpCircle,
  MessageCircle,
  Dumbbell,
  ShieldCheck,
  CreditCard,
  TrendingUp,
  Clock,
  Sparkles,
  Phone,
} from "lucide-react";
import logoFull from "@/assets/brand/fitcore-logo-full.png";

const REMEMBER_EMAIL_KEY = "fitcore_saved_email";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tardando, setTardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const { login, isAuthenticated, isCliente } = useAuth();
  const { settings } = useGymSettings();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Cargar email recordado al montar
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  if (isAuthenticated) {
    return <Navigate to={isCliente ? "/dashboard-cliente" : "/dashboard-admin"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    setTardando(false);

    // Manejo de persistencia del email
    if (rememberEmail) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }

    // Aviso si el backend en nube gratuita está "despertando"
    const avisoTardanza = setTimeout(() => setTardando(true), 4000);

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const mensaje = data?.mensaje ?? "Credenciales inválidas. Verificá tu correo y contraseña.";
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

      const esCliente = data.categoria === 2 || data.categoria === "Cliente";
      navigate(esCliente ? "/dashboard-cliente" : "/dashboard-admin");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al conectar con el servidor.";
      setErrorMsg(msg);
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
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
  const whatsappClean = settings.whatsapp ? settings.whatsapp.replace(/\D/g, "") : null;
  const whatsappUrl = whatsappClean
    ? `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
        `Hola ${gymName}, necesito ayuda para restablecer mi acceso a la plataforma.`
      )}`
    : null;

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col lg:grid lg:grid-cols-12 overflow-x-hidden font-sans">
      {/* ========================================================
          PANEL IZQUIERDO: HERO FITNESS & BRANDING DEL GIMNASIO
          (Visible en pantallas grandes, inspirador y profesional)
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
              Sistema de Gestión y Control Integral
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

        {/* Contenido Central: Mensaje y Pilares Operativos */}
        <div className="relative z-10 my-auto py-10 max-w-xl">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Control total de tu gimnasio, <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400">
              en cada turno y en cada socio.
            </span>
          </h2>

          <p className="mt-4 text-sm xl:text-base text-slate-300 leading-relaxed">
            {settings.mensajeBienvenida ||
              "Gestioná asistencias en recepción, estados de cuenta, planes y el progreso de los socios desde un único lugar ágil y seguro."}
          </p>

          {/* 3 Pilares visuales del gimnasio */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center mb-2.5">
                <Dumbbell className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-slate-200">Asistencias en Vivo</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Control de ingresos en mostrador sin demoras.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-2.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-slate-200">Cuotas al Día</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Seguimiento automático de pagos y vencimientos.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-xs font-semibold text-slate-200">Fidelización</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Historial físico y evolución deportiva de cada cliente.</p>
            </div>
          </div>
        </div>

        {/* Pie Izquierdo: Garantía de seguridad y estado */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Acceso seguro con cifrado JWT & Identity</span>
          </div>
          <span className="text-slate-500">FitCore v2.4</span>
        </div>
      </div>

      {/* ========================================================
          PANEL DERECHO: FORMULARIO OPERATIVO DE ACCESO
          (Limpio, enfocado, con ergonomía diaria para recepción)
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Portal de Acceso</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Iniciar sesión
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Ingresá tus credenciales para acceder al sistema
            </p>
          </div>

          {/* Banner de Error Inline (claro, visible sin depender solo de toast) */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs sm:text-sm flex items-start gap-3 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">No pudimos iniciar sesión</p>
                <p className="mt-0.5 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Formulario de Login */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Correo Electrónico */}
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
                  placeholder="admin@tu-gimnasio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="username"
                  autoFocus={!email}
                  className="pl-10 h-11 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:ring-orange-500 rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Campo Contraseña con Toggle de Visibilidad */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Contraseña
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 hover:underline"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  autoComplete="current-password"
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
            </div>

            {/* Opción Recordar Email */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberEmail}
                  onChange={(e) => setRememberEmail(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 dark:bg-slate-800 dark:border-slate-700"
                />
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Recordar mi correo en este equipo
                </span>
              </label>
            </div>

            {/* Botón Principal de Envío */}
            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold rounded-xl bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition-all duration-200 mt-2"
              loading={loading}
            >
              {loading ? "Iniciando sesión..." : "Ingresar a FitCore"}
            </Button>

            {/* Feedback de conexión a servidor en reposo */}
            {tardando && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5 animate-fade-in-up">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 animate-spin" />
                <span>
                  El servidor estaba inactivo y está arrancando. Puede demorar unos segundos…
                </span>
              </div>
            )}
          </form>

          {/* Enlace para nuevos socios */}
          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ¿Sos un nuevo socio?{" "}
              <button
                type="button"
                onClick={() => navigate("/register")}
                className="text-orange-600 dark:text-orange-400 font-semibold hover:underline ml-1"
              >
                Crear tu cuenta
              </button>
            </p>
          </div>

          {/* Ayuda directa para mostrador / WhatsApp */}
          {whatsappUrl && (
            <div className="mt-4 flex justify-center">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-500 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Contacto con recepción por WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer simple para soporte */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          <p>FitCore Gym Management System • Soporte para administradores y socios</p>
        </div>
      </div>

      {/* ========================================================
          MODAL: AYUDA Y RESTABLECIMIENTO DE CONTRASEÑA
      ======================================================== */}
      <Dialog open={showForgotModal} onOpenChange={setShowForgotModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-2">
              <HelpCircle className="w-5 h-5" />
            </div>
            <DialogTitle className="text-lg font-bold">
              ¿Olvidaste tu contraseña?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 pt-1">
              En {gymName}, la seguridad y el control de accesos son administrados directamente por el equipo del gimnasio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-3 text-xs text-slate-600 dark:text-slate-300">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                🏋️‍♂️ Si sos socio del gimnasio:
              </p>
              <p>
                Acercate a la recepción o mostrador. El encargado puede restablecer tu contraseña o generarte un acceso temporal en el acto.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                💼 Si sos administrador o profesor:
              </p>
              <p>
                Contactá al administrador titular del sistema para actualizar los permisos o el acceso de tu cuenta.
              </p>
            </div>

            {/* Opciones de contacto directo si están configuradas */}
            {(settings.telefono || settings.whatsapp) && (
              <div className="pt-2 flex flex-col gap-2">
                {settings.whatsapp && whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors text-xs shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Escribir al WhatsApp de Recepción ({settings.whatsapp})</span>
                  </a>
                )}

                {settings.telefono && (
                  <div className="inline-flex items-center justify-center gap-2 text-xs text-slate-500 pt-1">
                    <Phone className="w-3.5 h-3.5" />
                    <span>Teléfono del gimnasio: {settings.telefono}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowForgotModal(false)}
              className="w-full sm:w-auto text-xs"
            >
              Entendido, volver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
