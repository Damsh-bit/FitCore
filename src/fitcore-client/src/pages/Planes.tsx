import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Receipt,
  CreditCard,
  Building2,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiFetch } from "@/lib/api";
import CheckoutModal, { type PlanParaCheckout } from "@/components/checkout/CheckoutModal";

type Plan = {
  id: number;
  nombre: string;
  precio: number;
  duracionEnDias: number;
  activo: boolean;
};

type MiMembresia = {
  id: number;
  planId: number;
  planNombre: string;
  planPrecio: number;
  fechaInicio: string;
  fechaFin: string;
};

type PagoHistorial = {
  id: number;
  membresiaId: number | null;
  planNombre: string;
  monto: number;
  montoFormatted: string;
  fecha: string;
  fechaFormatted: string;
  metodo: string;
  nota: string | null;
  periodoMes: number;
  periodoAnio: number;
};

export default function Planes() {
  const { toast } = useToast();

  const [planes, setPlanes] = useState<Plan[]>([]);
  const [miMembresia, setMiMembresia] = useState<MiMembresia | null>(null);
  const [misPagos, setMisPagos] = useState<PagoHistorial[]>([]);
  const [loadingPlanes, setLoadingPlanes] = useState(true);
  const [loadingMembresia, setLoadingMembresia] = useState(true);
  const [loadingPagos, setLoadingPagos] = useState(true);

  // Modal Checkout Multimétodo
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [planParaCheckout, setPlanParaCheckout] = useState<PlanParaCheckout | null>(null);

  // Modal baja cliente
  const [bajaOpen, setBajaOpen] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("Económico / Presupuesto");
  const [observacionBaja, setObservacionBaja] = useState("");
  const [cancelando, setCancelando] = useState(false);

  const fetchMiMembresia = useCallback(() => {
    setLoadingMembresia(true);
    apiFetch("/api/membresias/mi-membresia")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMiMembresia(data))
      .finally(() => setLoadingMembresia(false));
  }, []);

  const fetchMisPagos = useCallback(() => {
    setLoadingPagos(true);
    apiFetch("/api/pagos-cliente/mis-pagos")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PagoHistorial[]) => setMisPagos(data))
      .finally(() => setLoadingPagos(false));
  }, []);

  const fetchPlanes = useCallback(() => {
    setLoadingPlanes(true);
    apiFetch("/api/pagos-cliente/planes")
      .then((r) => (r.ok ? r.json() : apiFetch("/api/planes").then((x) => x.json())))
      .then((data: Plan[]) => setPlanes(Array.isArray(data) ? data.filter((p) => p.activo) : []))
      .catch(() => setPlanes([]))
      .finally(() => setLoadingPlanes(false));
  }, []);

  useEffect(() => {
    fetchPlanes();
    fetchMiMembresia();
    fetchMisPagos();

    // Verificación de retorno desde Mercado Pago (si viene por query string)
    const params = new URLSearchParams(window.location.search);
    const mpStatus = params.get("mp_status") || params.get("collection_status") || params.get("status");
    let planId = params.get("plan_id") ? Number(params.get("plan_id")) : null;

    if (!planId) {
      const extRef = params.get("external_reference");
      if (extRef) {
        const parts = extRef.split("_");
        if (parts.length >= 2 && !isNaN(Number(parts[1]))) {
          planId = Number(parts[1]);
        }
      }
    }

    const paymentId = params.get("payment_id") || params.get("collection_id") || params.get("merchant_order_id");

    if (mpStatus === "approved" && planId) {
      apiFetch("/api/pagos-cliente/confirmar-mercadopago", {
        method: "POST",
        body: JSON.stringify({
          planId,
          paymentId: paymentId || "MP-ONLINE",
          status: "approved",
        }),
      }).then((res) => {
        if (res.ok) {
          toast({
            variant: "success",
            title: "¡Pago de Mercado Pago aprobado!",
            description: paymentId
              ? `Operación #${paymentId}. Tu membresía fue activada correctamente.`
              : "Tu membresía fue activada correctamente.",
          });
          fetchMiMembresia();
          fetchMisPagos();
        }
      });

      // Limpiar parámetros de la URL sin recargar la página
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [fetchPlanes, fetchMiMembresia, fetchMisPagos, toast]);

  const handleAbrirCheckout = (plan: Plan) => {
    setPlanParaCheckout({
      id: plan.id,
      nombre: plan.nombre,
      precio: plan.precio,
      duracionEnDias: plan.duracionEnDias,
    });
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    fetchMiMembresia();
    fetchMisPagos();
  };

  const handleConfirmarBajaMiMembresia = async () => {
    setCancelando(true);
    try {
      const res = await apiFetch("/api/membresias/cancelar-mi-membresia", {
        method: "POST",
        body: JSON.stringify({
          motivo: motivoBaja,
          observaciones: observacionBaja.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Error al cancelar la membresía");
      }

      setMiMembresia(null);
      setBajaOpen(false);
      toast({
        variant: "success",
        title: "Membresía cancelada",
        description: "Tu membresía fue dada de baja con éxito.",
      });
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "No se pudo cancelar",
        description: err instanceof Error ? err.message : "Intentá nuevamente.",
      });
    } finally {
      setCancelando(false);
    }
  };

  const diasRestantes = miMembresia
    ? Math.max(0, Math.ceil((new Date(miMembresia.fechaFin).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-foreground tracking-tight">Tu Cuenta y Membresía</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gestioná tu plan activo, realizá pagos seguros y consultá tu historial.
        </p>
      </div>

      {/* ── 1. Membresía activa ── */}
      <div>
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-muted-foreground" /> Estado de tu Membresía
        </h2>

        {loadingMembresia ? (
          <Skeleton className="h-32 w-full rounded-2xl" />
        ) : miMembresia ? (
          <div className="bg-zinc-950 text-white rounded-3xl p-6 shadow-xl border border-zinc-800 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Membresía Activa
                  </span>
                </div>
                <h3 className="text-2xl font-black text-white">{miMembresia.planNombre}</h3>
                <p className="text-sm text-zinc-400 mt-1">
                  Vence el{" "}
                  <strong className="text-zinc-200">
                    {new Date(miMembresia.fechaFin).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </strong>
                </p>
              </div>

              <div className="flex items-center sm:flex-col sm:items-end gap-3 sm:gap-1 bg-zinc-900/80 px-4 py-3 rounded-2xl border border-zinc-800/80 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                  <span className="text-3xl font-black text-white">{diasRestantes}</span>
                </div>
                <p className="text-xs text-zinc-400 font-medium">días restantes</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Podés renovar tu plan o cambiar a uno superior en cualquier momento.
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 h-8 px-3 rounded-xl cursor-pointer"
                onClick={() => {
                  setMotivoBaja("Económico / Presupuesto");
                  setObservacionBaja("");
                  setBajaOpen(true);
                }}
              >
                Dar de baja mi membresía
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-3 shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto shadow-xs">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">No tenés una membresía activa</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                Elegí uno de los planes disponibles a continuación para comenzar a entrenar hoy mismo.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Planes disponibles ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" /> Planes Disponibles
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pagá online con Mercado Pago, Tarjeta o Transferencia bancaria directa.
            </p>
          </div>
        </div>

        {loadingPlanes ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-3xl" />
            ))}
          </div>
        ) : planes.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No hay planes disponibles por el momento.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {planes.map((p, i) => {
              const esActual = miMembresia?.planId === p.id;
              return (
                <div
                  key={p.id}
                  className={`bg-card rounded-3xl p-6 flex flex-col justify-between transition-all duration-200 border animate-fade-in-up ${
                    esActual
                      ? "border-orange-500 shadow-md ring-2 ring-orange-500/20"
                      : "border-border hover:border-muted-foreground/30 hover:shadow-lg hover:-translate-y-1"
                  }`}
                  style={{ animationDelay: `${i * 70}ms` }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-black text-foreground">{p.nombre}</h3>
                      {esActual && (
                        <span className="px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-bold">
                          Tu plan actual
                        </span>
                      )}
                    </div>

                    <div className="py-2">
                      <p className="text-3xl font-black text-foreground tracking-tight">
                        ${p.precio.toLocaleString("es-AR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        Válido por {p.duracionEnDias} días
                      </p>
                    </div>

                    <ul className="text-xs text-muted-foreground space-y-2 mt-4 pt-4 border-t border-border">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Acceso ilimitado a las instalaciones</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Registro automático de asistencias</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Múltiples métodos de pago online</span>
                      </li>
                    </ul>
                  </div>

                  <Button
                    onClick={() => handleAbrirCheckout(p)}
                    className={`mt-6 w-full h-11 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                      esActual
                        ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                        : "bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/20"
                    }`}
                  >
                    {esActual ? "Renovar Plan" : "Contratar Plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3. Historial de Pagos ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Receipt className="w-4 h-4 text-muted-foreground" /> Historial de Pagos y Recibos
          </h2>
        </div>

        {loadingPagos ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        ) : misPagos.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-8 text-center text-muted-foreground text-sm">
            <Receipt className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            Todavía no registrás pagos en tu cuenta.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xs">
            <div className="divide-y divide-border">
              {misPagos.map((p, i) => {
                const esMP = p.metodo.toLowerCase().includes("mercado");
                const esTarjeta = p.metodo.toLowerCase().includes("tarjeta");

                return (
                  <div
                    key={p.id}
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-muted/50 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        esMP
                          ? "bg-[#009ee3]/10 text-[#009ee3] border-[#009ee3]/20"
                          : esTarjeta
                          ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      }`}>
                        {esMP ? (
                          <span className="font-black text-xs">MP</span>
                        ) : esTarjeta ? (
                          <CreditCard className="w-5 h-5" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-sm text-foreground truncate">{p.planNombre}</p>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {p.metodo}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {p.fechaFormatted} {p.nota ? `— ${p.nota}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-4">
                      <p className="text-base font-black text-foreground font-mono">
                        {p.montoFormatted}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" /> Aprobado
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Checkout Multimétodo ── */}
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        plan={planParaCheckout}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* ── Modal baja propia cliente ── */}
      <Dialog open={bajaOpen} onOpenChange={setBajaOpen}>
        <DialogContent className="rounded-2xl border-border">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">
              Cancelar mi membresía
            </DialogTitle>
            <DialogDescription>
              Lamentamos que decidas darte de baja de <strong>{miMembresia?.planNombre}</strong>.
              Contanos el motivo principal para ayudarnos a mejorar el servicio:
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cliente-motivo-baja">Motivo principal</Label>
              <Select
                value={motivoBaja}
                onValueChange={setMotivoBaja}
                disabled={cancelando}
              >
                <SelectTrigger id="cliente-motivo-baja">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Económico / Presupuesto">Económico / Presupuesto</SelectItem>
                  <SelectItem value="Falta de tiempo / Horarios">Falta de tiempo / Horarios</SelectItem>
                  <SelectItem value="Lesión o motivos de salud">Lesión o motivos de salud</SelectItem>
                  <SelectItem value="Mudanza o distancia al gimnasio">Mudanza o distancia al gimnasio</SelectItem>
                  <SelectItem value="Disconformidad con las clases / instalaciones">Disconformidad con las clases / instalaciones</SelectItem>
                  <SelectItem value="Otro motivo">Otro motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cliente-obs-baja">
                Comentarios o sugerencias <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
              </Label>
              <Input
                id="cliente-obs-baja"
                placeholder="¿Qué podríamos haber hecho mejor?..."
                value={observacionBaja}
                onChange={(e) => setObservacionBaja(e.target.value)}
                disabled={cancelando}
              />
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              Al confirmar, tu membresía se cancelará de inmediato y no se generarán cuotas posteriores.
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBajaOpen(false)}
              disabled={cancelando}
              className="rounded-xl"
            >
              Mantener membresía
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmarBajaMiMembresia}
              loading={cancelando}
              className="rounded-xl"
            >
              {cancelando ? "Cancelando..." : "Confirmar cancelación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
