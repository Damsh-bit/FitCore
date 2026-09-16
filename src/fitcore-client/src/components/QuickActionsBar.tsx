import type { LucideIcon } from "lucide-react";
import { UserPlus, CreditCard, MessageCircleWarning, Wallet, FileSpreadsheet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AccionRapida {
  label: string;
  icon: LucideIcon;
  path: string;
  iconClass: string;
}

const ACCIONES: AccionRapida[] = [
  { label: "Nuevo Cliente", icon: UserPlus, path: "/clientes/nuevo", iconClass: "bg-indigo-500" },
  { label: "Registrar Pago", icon: CreditCard, path: "/pagos", iconClass: "bg-emerald-500" },
  { label: "Ver Deudores", icon: MessageCircleWarning, path: "/estado-cuenta?estado=ConDeuda", iconClass: "bg-rose-500" },
  { label: "Nuevo Movimiento", icon: Wallet, path: "/contabilidad", iconClass: "bg-orange-500" },
  { label: "Exportar Reportes", icon: FileSpreadsheet, path: "/reportes", iconClass: "bg-blue-500" },
];

/**
 * Barra de accesos directos a las tareas que un dueño de gimnasio hace todo
 * el día — pensada para no tener que salir del dashboard a buscarlas en el
 * menú lateral. El color del ícono es sólo para escanear más rápido, no
 * indica jerarquía entre acciones.
 */
export default function QuickActionsBar() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 px-1 -mx-1">
      {ACCIONES.map((accion) => {
        const Icon = accion.icon;
        return (
          <button
            key={accion.path}
            type="button"
            onClick={() => navigate(accion.path)}
            className="flex items-center gap-2 shrink-0 pl-1.5 pr-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer bg-card border border-border text-foreground hover:bg-muted hover:shadow-sm shadow-xs"
          >
            <span className={cn("flex items-center justify-center w-6 h-6 rounded-lg text-white shrink-0", accion.iconClass)}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            {accion.label}
          </button>
        );
      })}
    </div>
  );
}
