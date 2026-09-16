import { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  ShieldCheck,
  HeartPulse,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  Calendar,
  AlertCircle
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";

interface PerfilData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  categoria: string;
  fechaAlta: string;
  activo: boolean;
  contactoEmergenciaNombre: string | null;
  contactoEmergenciaTelefono: string | null;
  contactoEmergenciaRelacion: string | null;
  aptoMedicoVence: string | null;
  membresia: {
    planId: number;
    planNombre: string;
    fechaFin: string;
  } | null;
}

export default function MiPerfil() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);

  // Estados editables vinculados a la base de datos
  const [perfil, setPerfil] = useState<PerfilData | null>(null);
  const [telefono, setTelefono] = useState("");
  const [contactoEmergencia, setContactoEmergencia] = useState({
    nombre: "",
    telefono: "",
    relacion: "Familiar"
  });
  const [aptoMedicoVence, setAptoMedicoVence] = useState<string>("");

  useEffect(() => {
    setLoading(true);
    apiFetch("/api/usuarios/mi-perfil")
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar el perfil");
        return res.json();
      })
      .then((data: PerfilData) => {
        setPerfil(data);
        setTelefono(data.telefono || "");
        setContactoEmergencia({
          nombre: data.contactoEmergenciaNombre || "",
          telefono: data.contactoEmergenciaTelefono || "",
          relacion: data.contactoEmergenciaRelacion || "Familiar"
        });
        setAptoMedicoVence(data.aptoMedicoVence ? data.aptoMedicoVence.split("T")[0] : "");
      })
      .catch((err) => {
        toast({
          variant: "destructive",
          title: "Error al cargar perfil",
          description: err instanceof Error ? err.message : "Error desconocido"
        });
      })
      .finally(() => setLoading(false));
  }, [toast]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);

    try {
      const res = await apiFetch("/api/usuarios/mi-perfil", {
        method: "PUT",
        body: JSON.stringify({
          telefono: telefono.trim(),
          contactoEmergenciaNombre: contactoEmergencia.nombre.trim() || null,
          contactoEmergenciaTelefono: contactoEmergencia.telefono.trim() || null,
          contactoEmergenciaRelacion: contactoEmergencia.relacion.trim() || null,
          aptoMedicoVence: aptoMedicoVence ? aptoMedicoVence : null
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.mensaje || "Error al actualizar en la base de datos");
      }

      toast({
        variant: "success",
        title: "¡Perfil guardado en la base de datos!",
        description: "Tus datos personales y de emergencia quedaron sincronizados con éxito."
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "No se pudo guardar",
        description: err instanceof Error ? err.message : "Intente nuevamente"
      });
    } finally {
      setGuardando(false);
    }
  };

  // Cálculo de estado del apto médico
  const calcularEstadoApto = () => {
    if (!aptoMedicoVence) {
      return {
        tipo: "pendiente",
        texto: "Certificado Pendiente",
        colorBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        colorCard: "bg-amber-500/5 border-amber-500/20",
        descripcion: "No registramos la fecha de vigencia de tu apto médico anual."
      };
    }

    const fechaFin = new Date(aptoMedicoVence + "T00:00:00");
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const diffDias = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDias < 0) {
      return {
        tipo: "vencido",
        texto: "Certificado Vencido",
        colorBadge: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        colorCard: "bg-red-500/5 border-red-500/20",
        descripcion: `Tu apto médico venció hace ${Math.abs(diffDias)} días. Es necesario renovarlo.`
      };
    } else if (diffDias <= 30) {
      return {
        tipo: "por-vencer",
        texto: `Vence pronto (${diffDias} días)`,
        colorBadge: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
        colorCard: "bg-orange-500/5 border-orange-500/20",
        descripcion: `Tu certificado vencerá en ${diffDias} días. Solicitá turno médico con antelación.`
      };
    } else {
      return {
        tipo: "vigente",
        texto: "Certificado Vigente",
        colorBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        colorCard: "bg-emerald-500/5 border-emerald-500/20",
        descripcion: `Certificado al día. Válido hasta el ${fechaFin.toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric"
        })}.`
      };
    }
  };

  const estadoApto = calcularEstadoApto();

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-12 w-64 rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl animate-fade-in-up">
      {/* ── Encabezado ── */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
          <User className="w-8 h-8 text-orange-600 dark:text-orange-500" /> Mi Perfil y Ficha de Salud
        </h1>
        <p className="text-sm text-muted-foreground font-medium mt-1">
          Tus datos se encuentran resguardados en los servidores de FitCore.
        </p>
      </div>

      <form onSubmit={handleGuardar} className="space-y-6">
        {/* ── 1. Información Personal ── */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              <h2 className="text-base font-bold text-foreground">Datos Personales</h2>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20 hover:bg-orange-500/20 text-xs font-bold">
                {perfil?.categoria || "Cliente"}
              </Badge>
              {perfil?.membresia && (
                <Badge variant="outline" className="text-xs font-semibold text-muted-foreground">
                  {perfil.membresia.planNombre}
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground">Nombre Completo</Label>
              <Input
                disabled
                value={`${perfil?.nombre || ""} ${perfil?.apellido || ""}`.trim()}
                className="rounded-xl bg-muted text-foreground/80 font-medium cursor-not-allowed"
              />
              <p className="text-[11px] text-muted-foreground">Identidad registrada por recepción.</p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" /> Correo Electrónico
              </Label>
              <Input
                disabled
                value={perfil?.email || ""}
                className="rounded-xl bg-muted text-foreground/80 font-medium cursor-not-allowed"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="telefono" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-orange-600 dark:text-orange-500" /> Teléfono / WhatsApp (Sincronizado en BD)
              </Label>
              <Input
                id="telefono"
                placeholder="Ej: +54 9 11 4455-6677"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="rounded-xl max-w-md focus-visible:ring-orange-500"
              />
              <p className="text-[11px] text-muted-foreground">
                Utilizado para enviarte avisos de vencimiento de cuota y notificaciones importantes.
              </p>
            </div>
          </div>
        </div>

        {/* ── 2. Contacto de Emergencia ── */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              <h2 className="text-base font-bold text-foreground">Contacto de Emergencia</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Información visible para los entrenadores y recepción ante cualquier eventualidad médica en sala.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Nombre y Apellido</Label>
              <Input
                placeholder="Ej: Laura Martínez"
                value={contactoEmergencia.nombre}
                onChange={(e) =>
                  setContactoEmergencia({ ...contactoEmergencia, nombre: e.target.value })
                }
                className="rounded-xl focus-visible:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Teléfono de Emergencia</Label>
              <Input
                placeholder="Ej: +54 9 11 2233-4455"
                value={contactoEmergencia.telefono}
                onChange={(e) =>
                  setContactoEmergencia({ ...contactoEmergencia, telefono: e.target.value })
                }
                className="rounded-xl focus-visible:ring-orange-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-foreground">Vínculo / Relación</Label>
              <select
                value={contactoEmergencia.relacion}
                onChange={(e) =>
                  setContactoEmergencia({ ...contactoEmergencia, relacion: e.target.value })
                }
                className="w-full h-10 px-3 rounded-xl border border-border text-xs font-semibold text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
              >
                <option value="Familiar">Familiar directo</option>
                <option value="Pareja">Pareja / Cónyuge</option>
                <option value="Amigo/a">Amigo / Amiga</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── 3. Apto Médico y Ficha de Salud ── */}
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
              <h2 className="text-base font-bold text-foreground">Apto Físico y Salud</h2>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${estadoApto.colorBadge}`}
            >
              {estadoApto.tipo === "vigente" ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : estadoApto.tipo === "por-vencer" ? (
                <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              )}
              {estadoApto.texto}
            </span>
          </div>

          <div className={`p-4 rounded-2xl border ${estadoApto.colorCard} flex flex-col sm:flex-row sm:items-center justify-between gap-4`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-card text-foreground flex items-center justify-center shrink-0 border border-border shadow-2xs">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-500" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-foreground">Certificado Médico Anual</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{estadoApto.descripcion}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="aptoFecha" className="text-xs font-bold text-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Fecha de Vigencia:
              </Label>
              <Input
                id="aptoFecha"
                type="date"
                value={aptoMedicoVence}
                onChange={(e) => setAptoMedicoVence(e.target.value)}
                className="w-40 rounded-xl bg-card text-xs font-semibold"
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-muted/50 border border-border flex items-start gap-3 text-xs text-muted-foreground">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Por normativas legales de gimnasios, el certificado de aptitud física debe ser renovado una vez al año por un médico matriculado. Al renovarlo, podés presentarlo en el mostrador para su sellado.
            </p>
          </div>
        </div>

        {/* ── Botón Guardar Cambios ── */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            loading={guardando}
            className="h-11 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md shadow-orange-600/20 cursor-pointer"
          >
            {!guardando && <Save className="w-4 h-4 mr-2" />}
            {guardando ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
