import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, CreditCard, Calendar, User, LogOut,
  ClipboardList, ShieldCheck, TrendingUp, Menu, X,
  PanelLeftClose, PanelLeftOpen, Wallet, FileSpreadsheet, Settings,
  Sun, Moon,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useGymSettings } from "@/context/GymSettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import PersonaAvatar from "@/components/ui/persona-avatar";
import logoIcon from "@/assets/brand/fitcore-icon.png";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

// Orden pensado según la frecuencia de uso real en el día a día del gimnasio:
// primero lo que se usa todo el día (check-in, socios, cobros), después lo
// administrativo que se revisa cada tanto (contabilidad, reportes) y al final
// lo que casi no se toca (configuración).
const adminNavItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard-admin" },
  { label: "Asistencias", icon: Calendar, path: "/asistencias" },
  { label: "Clientes", icon: Users, path: "/clientes" },
  { label: "Pagos", icon: CreditCard, path: "/pagos" },
  { label: "Estado de cuenta", icon: ShieldCheck, path: "/estado-cuenta" },
  { label: "Planes", icon: ClipboardList, path: "/planes-admin" },
  { label: "Contabilidad", icon: Wallet, path: "/contabilidad" },
  { label: "Reportes", icon: FileSpreadsheet, path: "/reportes" },
  { label: "Configuración", icon: Settings, path: "/configuracion" },
];

const clienteNavItems: NavItem[] = [
  { label: "Inicio", icon: LayoutDashboard, path: "/dashboard-cliente" },
  { label: "Mi Membresía", icon: CreditCard, path: "/mi-membresia" },
  { label: "Mis Asistencias", icon: Calendar, path: "/mis-asistencias" },
  { label: "Mi Progreso", icon: TrendingUp, path: "/mi-progreso" },
  { label: "Mi Perfil", icon: User, path: "/mi-perfil" },
];

const COLLAPSE_KEY = "fitcore_sidebar_collapsed";

/**
 * Envuelve texto que solo se muestra cuando el sidebar está expandido.
 * En vez de montar/desmontar el nodo (lo que lo hace aparecer de golpe),
 * anima su columna de grid entre 0fr y 1fr junto con la opacidad, para que
 * el texto se desvanezca y "empuje" en sincro con el ancho del sidebar.
 */
function CollapsibleText({
  collapsed,
  className,
  children,
}: {
  collapsed: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid transition-[grid-template-columns,opacity] duration-200 ease-in-out",
        collapsed ? "grid-cols-[0fr] opacity-0" : "grid-cols-[1fr] opacity-100"
      )}
    >
      <span className={cn("overflow-hidden min-w-0", className)}>{children}</span>
    </span>
  );
}

function useReloj() {
  const [ahora, setAhora] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return ahora;
}

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { settings } = useGymSettings();
  const { isDark, toggleTheme } = useTheme();
  const ahora = useReloj();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = isAdmin ? adminNavItems : clienteNavItems;

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, String(next));
      } catch {
        // localStorage no disponible (modo privado, etc.) — no es crítico
      }
      return next;
    });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const hora = ahora.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const fecha = ahora.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <TooltipProvider delayDuration={200}>
      {/* Botón hamburguesa — solo mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 h-10 w-10 rounded-xl bg-card border border-border shadow-sm flex items-center justify-center"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5 text-foreground" />
      </button>

      {/* Backdrop — solo mobile. Se mantiene montado y anima su opacidad
          para que no aparezca/desaparezca de golpe junto al drawer. */}
      <div
        className={cn(
          "md:hidden fixed inset-0 bg-black/30 z-40 transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      <aside
        className={cn(
          "h-screen bg-card border-r border-border flex flex-col shrink-0 z-50 transition-[width,transform] duration-200 ease-in-out",
          "fixed top-0 left-0 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[76px]" : "w-[220px]"
        )}
      >
        {/* Logo + cerrar (mobile) */}
        <div className={cn("border-b border-border flex items-center transition-[padding] duration-200", collapsed ? "justify-center p-4" : "justify-between p-5")}>
          <div className="flex items-center gap-2 min-w-0">
            <img src={settings.logoBase64 ?? logoIcon} alt={settings.nombreGimnasio ?? "FitCore"} className="h-8 w-8 object-contain shrink-0" />
            <CollapsibleText collapsed={collapsed}>
              <h1 className="text-lg font-bold text-foreground truncate whitespace-nowrap">{settings.nombreGimnasio ?? "FitCore"}</h1>
            </CollapsibleText>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted-foreground" aria-label="Cerrar menú">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Reloj */}
        <div className={cn("border-b border-border px-4 py-3 transition-[padding] duration-200", collapsed && "px-2 text-center")}>
          {collapsed ? (
            <p key="compacto" className="text-xs font-bold text-foreground animate-in fade-in-0 duration-200">{hora}</p>
          ) : (
            <div key="detallado" className="animate-in fade-in-0 duration-200">
              <p className="text-lg font-black text-foreground tabular-nums leading-none">{hora}</p>
              <p className="text-[10px] text-muted-foreground font-semibold capitalize mt-1">{fecha}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const button = (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  collapsed && "justify-center px-0",
                  isActive
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground font-normal"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <CollapsibleText collapsed={collapsed}>
                  <span className="truncate whitespace-nowrap block">{item.label}</span>
                </CollapsibleText>
              </button>
            );

            if (!collapsed) return button;

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* Acciones: Tema + Colapsar — solo desktop */}
        <div className={cn("hidden md:flex flex-col gap-1 mx-3 mb-1")}>
          {/* Toggle de Tema */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-center px-0 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
                >
                  {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{isDark ? "Modo claro" : "Modo oscuro"}</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-semibold"
              aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              <span className="whitespace-nowrap">{isDark ? "Modo claro" : "Modo oscuro"}</span>
            </button>
          )}

          {/* Colapsar */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleCollapsed}
                  className="flex items-center justify-center px-0 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Expandir menú"
                >
                  <PanelLeftOpen className="h-4 w-4 shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expandir</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={toggleCollapsed}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-xs font-semibold"
              aria-label="Colapsar menú"
            >
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">Colapsar</span>
            </button>
          )}
        </div>

        {/* Profile + Logout */}
        <div className={cn("p-3 border-t border-border space-y-1", collapsed && "px-2")}>
          <div className={cn("flex items-center gap-3 px-3 py-2", collapsed && "justify-center px-0")}>
            {user ? (
              <PersonaAvatar seed={user.id} size={32} />
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <CollapsibleText collapsed={collapsed} className="flex-1">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate whitespace-nowrap">
                  {user ? `${user.nombre} ${user.apellido}` : "Usuario"}
                </p>
                <p className="text-xs text-muted-foreground truncate whitespace-nowrap">{user?.categoria ?? ""}</p>
              </div>
            </CollapsibleText>
          </div>

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center px-0 py-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  aria-label="Cerrar sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Cerrar sesión</TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar sesión</span>
            </button>
          )}

          {settings.logoBase64 && (
            <CollapsibleText collapsed={collapsed}>
              <p className="text-[10px] text-muted-foreground/50 text-center pt-1 whitespace-nowrap">Powered by FitCore</p>
            </CollapsibleText>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
