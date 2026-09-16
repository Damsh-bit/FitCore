import { useMemo, useState } from "react";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClienteCombobox from "@/components/ui/client-combobox";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import BentoCard from "./BentoCard";
import { cn } from "@/lib/utils";

type Cliente = {
  id: string | number;
  nombre: string;
  apellido?: string;
  activo: boolean;
};

interface QuickRegisterBentoCardProps {
  clientes: Cliente[];
  fechaSeleccionada?: Date | null;
  className?: string;
  delay?: number;
  onSuccess?: () => void;
}

export default function QuickRegisterBentoCard({
  clientes,
  fechaSeleccionada,
  className,
  delay,
  onSuccess
}: QuickRegisterBentoCardProps) {
  const [formClienteId, setFormClienteId] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const clientesActivos = useMemo(() => clientes.filter((c) => c.activo), [clientes]);

  const handleRegistrar = async () => {
    if (!formClienteId) return;
    setSaving(true);
    try {
      const fecha = fechaSeleccionada
        ? `${fechaSeleccionada.getFullYear()}-${String(fechaSeleccionada.getMonth() + 1).padStart(2, '0')}-${String(fechaSeleccionada.getDate()).padStart(2, '0')}`
        : new Date().toISOString().slice(0, 10);
      const res = await apiFetch("/api/asistencias", {
        method: "POST",
        body: JSON.stringify({
          userId: String(formClienteId),
          fecha: fecha,
          horaIngreso: new Date().toLocaleTimeString("en-GB", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al registrar asistencia");
      }

      const clienteReg = clientes.find(c => String(c.id) === formClienteId);
      toast({
        variant: "success",
        title: "Asistencia registrada",
        description: clienteReg ? `Ingreso de ${clienteReg.nombre} ${clienteReg.apellido || ''} registrado.` : "Ingreso registrado."
      });
      setFormClienteId("");
      onSuccess?.();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error",
        description: err instanceof Error ? err.message : "No se pudo registrar la asistencia."
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BentoCard className={cn("flex flex-col justify-center !p-3", className)} delay={delay}>
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1.5 bg-foreground rounded-lg shadow-sm shrink-0">
          <UserPlus className="h-3 w-3 text-background" />
        </div>
        <h3 className="text-xs font-black text-foreground tracking-tight">Registro Rápido</h3>
        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">
          ·{" "}
          {fechaSeleccionada
            ? fechaSeleccionada.toLocaleDateString("es-AR", { day: "numeric", month: "long" })
            : "Hoy"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ClienteCombobox
          clientes={clientesActivos}
          value={formClienteId}
          onChange={setFormClienteId}
          disabled={saving}
          placeholder="Buscar cliente..."
          emptyLabel="No hay clientes activos"
          className="flex-1 [&_input]:h-10 [&_input]:text-[12px] [&_input]:rounded-xl [&_input]:shadow-sm [&_input]:px-4 [&_input]:pl-9"
        />

        <Button
          onClick={handleRegistrar}
          disabled={saving || !formClienteId}
          className="h-10 shrink-0 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-[11px] font-black uppercase tracking-widest px-4 shadow-md active:scale-95 transition-all group"
        >
          {saving ? "..." : (
            <span className="flex items-center gap-1.5">
              Registrar
              <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform" />
            </span>
          )}
        </Button>
      </div>
    </BentoCard>
  );
}
