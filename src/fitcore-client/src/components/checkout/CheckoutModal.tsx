import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { apiFetch } from "@/lib/api";
import {
  CreditCard,
  Building2,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  Lock,
  AlertCircle,
  CheckCircle2,
  FlaskConical,
} from "lucide-react";

// Algoritmo de Luhn (Módulo 10) estándar bancario
export function isValidLuhn(cardNumber: string): boolean {
  const sanitized = cardNumber.replace(/\D/g, "");
  if (sanitized.length < 13 || sanitized.length > 19) return false;

  let sum = 0;
  let shouldDouble = false;

  for (let i = sanitized.length - 1; i >= 0; i--) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

export type CardBrand = "visa" | "mastercard" | "amex" | "cabal" | "generic";

export function detectCardBrand(cardNumber: string): { brand: CardBrand; name: string; bgClass: string; badgeClass: string } {
  const clean = cardNumber.replace(/\D/g, "");
  if (/^4/.test(clean)) {
    return {
      brand: "visa",
      name: "VISA",
      bgClass: "from-blue-950 via-slate-900 to-zinc-950 border-blue-500/40 shadow-blue-950/40",
      badgeClass: "bg-blue-600/30 text-blue-300 border-blue-500/50",
    };
  }
  if (/^(5[1-5]|2[2-7])/.test(clean)) {
    return {
      brand: "mastercard",
      name: "Mastercard",
      bgClass: "from-orange-950 via-stone-900 to-zinc-950 border-orange-500/40 shadow-orange-950/40",
      badgeClass: "bg-orange-600/30 text-orange-300 border-orange-500/50",
    };
  }
  if (/^3[47]/.test(clean)) {
    return {
      brand: "amex",
      name: "American Express",
      bgClass: "from-cyan-950 via-slate-900 to-zinc-950 border-cyan-500/40 shadow-cyan-950/40",
      badgeClass: "bg-cyan-600/30 text-cyan-300 border-cyan-500/50",
    };
  }
  if (/^(589657|6042|6043)/.test(clean)) {
    return {
      brand: "cabal",
      name: "Cabal",
      bgClass: "from-rose-950 via-neutral-900 to-zinc-950 border-rose-500/40 shadow-rose-950/40",
      badgeClass: "bg-rose-600/30 text-rose-300 border-rose-500/50",
    };
  }
  return {
    brand: "generic",
    name: "Tarjeta",
    bgClass: "from-zinc-900 via-zinc-800 to-zinc-950 border-zinc-700 shadow-zinc-950/40",
    badgeClass: "bg-zinc-700/50 text-zinc-300 border-zinc-600",
  };
}

export function validateExpiry(venc: string): { valid: boolean; error?: string } {
  const parts = venc.split("/");
  if (parts.length !== 2 || parts[0].length !== 2 || parts[1].length !== 2) {
    return { valid: false, error: "Formato esperado MM/AA" };
  }
  const month = parseInt(parts[0], 10);
  const year = parseInt(parts[1], 10) + 2000;

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return { valid: false, error: "El mes debe ser entre 01 y 12" };
  }

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  if (year < curYear || (year === curYear && month < curMonth)) {
    return { valid: false, error: "La tarjeta se encuentra vencida" };
  }
  if (year > curYear + 15) {
    return { valid: false, error: "Año de vencimiento inválido" };
  }

  return { valid: true };
}

// Presets de tarjetas de prueba oficiales de Mercado Pago / Industria
const TEST_CARDS = [
  {
    label: "Visa Test (Aprobada)",
    numero: "4509 9535 6623 3704",
    titular: "APRO PEREZ",
    vencimiento: "12/28",
    cvv: "123",
    color: "border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  {
    label: "Mastercard Test (Aprobada)",
    numero: "5031 7557 3453 0604",
    titular: "APRO GOMEZ",
    vencimiento: "10/29",
    cvv: "456",
    color: "border-orange-300 text-orange-700 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  },
  {
    label: "Tarjeta Inválida (Rechazo)",
    numero: "1234 5678 9012 3456",
    titular: "JUAN RECHAZADO",
    vencimiento: "05/30",
    cvv: "999",
    color: "border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
  },
];

export type PlanParaCheckout = {
  id: number;
  nombre: string;
  precio: number;
  duracionEnDias: number;
  tipo?: number;
};

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: PlanParaCheckout | null;
  onPaymentSuccess: () => void;
}

type MetodoPagoTab = "mercadopago" | "tarjeta" | "transferencia";

export default function CheckoutModal({
  open,
  onOpenChange,
  plan,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<MetodoPagoTab>("mercadopago");
  const [loading, setLoading] = useState(false);

  // Estado formulario tarjeta
  const [tarjeta, setTarjeta] = useState({
    numero: "",
    titular: "",
    vencimiento: "",
    cvv: "",
  });

  // Estado formulario transferencia
  const [transferencia, setTransferencia] = useState({
    comprobante: "",
    observaciones: "",
  });

  // Estado copia clipboard
  const [copiadoAlias, setCopiadoAlias] = useState(false);
  const [copiadoCbu, setCopiadoCbu] = useState(false);

  // Validación y marca dinámica de tarjeta (cálculo en tiempo real sin hooks)
  const cardBrand = detectCardBrand(tarjeta.numero);
  const cleanCardNumber = tarjeta.numero.replace(/\s/g, "");
  const luhnStatus = cleanCardNumber.length < 13 ? null : isValidLuhn(cleanCardNumber);
  const expiryStatus = tarjeta.vencimiento.length < 5 ? null : validateExpiry(tarjeta.vencimiento);

  const cargarTarjetaPrueba = (preset: typeof TEST_CARDS[number]) => {
    setTarjeta({
      numero: preset.numero,
      titular: preset.titular,
      vencimiento: preset.vencimiento,
      cvv: preset.cvv,
    });
    toast({
      title: `Tarjeta cargada: ${preset.label}`,
      description: "Datos de prueba listos en el formulario.",
    });
  };

  // Formateo de número de tarjeta con espacios
  const handleNumeroTarjetaChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 16);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setTarjeta((p) => ({ ...p, numero: parts.join(" ") }));
  };

  // Formateo de vencimiento MM/AA
  const handleVencimientoChange = (val: string) => {
    const raw = val.replace(/\D/g, "").slice(0, 4);
    if (raw.length >= 3) {
      setTarjeta((p) => ({ ...p, vencimiento: `${raw.slice(0, 2)}/${raw.slice(2)}` }));
    } else {
      setTarjeta((p) => ({ ...p, vencimiento: raw }));
    }
  };

  const copiarTexto = async (texto: string, tipo: "alias" | "cbu") => {
    try {
      await navigator.clipboard.writeText(texto);
      if (tipo === "alias") {
        setCopiadoAlias(true);
        setTimeout(() => setCopiadoAlias(false), 2000);
      } else {
        setCopiadoCbu(true);
        setTimeout(() => setCopiadoCbu(false), 2000);
      }
      toast({
        title: "Copiado al portapapeles",
        description: texto,
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Error al copiar",
        description: "Copia el dato manualmente.",
      });
    }
  };

  // 1. Manejo de Mercado Pago
  const handlePagarMercadoPago = async () => {
    if (!plan) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/pagos-cliente/iniciar-mercadopago", {
        method: "POST",
        body: JSON.stringify({
          planId: plan.id,
          backUrlSuccess: `${window.location.origin}/mi-membresia?mp_status=approved&plan_id=${plan.id}`,
          backUrlFailure: `${window.location.origin}/mi-membresia?mp_status=failure`,
          backUrlPending: `${window.location.origin}/mi-membresia?mp_status=pending`,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje ?? "No se pudo conectar con Mercado Pago");
      }

      const pref = await res.json();

      if (pref.isSimulated) {
        // Modo simulación local: confirmamos directamente el pago
        const confirmRes = await apiFetch("/api/pagos-cliente/confirmar-mercadopago", {
          method: "POST",
          body: JSON.stringify({
            planId: plan.id,
            paymentId: `MP-SIM-${Date.now()}`,
            status: "approved",
          }),
        });

        if (!confirmRes.ok) throw new Error("Error al registrar el pago de prueba");

        toast({
          variant: "success",
          title: "¡Pago aprobado!",
          description: `Se activó tu membresía en el plan ${plan.nombre}.`,
        });

        onOpenChange(false);
        onPaymentSuccess();
      } else {
        // Redirigir a la URL oficial de Mercado Pago (initPoint evita los bucles de sandbox)
        const targetUrl = pref.initPoint || pref.sandboxInitPoint;
        if (targetUrl) {
          window.location.href = targetUrl;
        } else {
          throw new Error("No se obtuvo la URL de pago de Mercado Pago");
        }
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error con Mercado Pago",
        description: err instanceof Error ? err.message : "Intentá nuevamente más tarde.",
      });
    } finally {
      setLoading(false);
    }
  };

  // 2. Manejo de Tarjeta de Crédito / Débito
  const handlePagarTarjeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = tarjeta.numero.replace(/\s/g, "");
    if (cleanNum.length < 13 || cleanNum.length > 19) {
      toast({ variant: "destructive", title: "Número de tarjeta incompleto", description: "Verificá los 16 dígitos de la tarjeta." });
      return;
    }
    if (!isValidLuhn(cleanNum)) {
      toast({
        variant: "destructive",
        title: "Tarjeta inválida (Falla de Luhn)",
        description: "El número no supera la verificación bancaria estándar. Verificá los dígitos o usá una tarjeta de prueba.",
      });
      return;
    }
    if (!tarjeta.titular.trim()) {
      toast({ variant: "destructive", title: "Falta el titular", description: "Ingresá el nombre que figura en la tarjeta." });
      return;
    }
    const expCheck = validateExpiry(tarjeta.vencimiento);
    if (!expCheck.valid) {
      toast({
        variant: "destructive",
        title: "Vencimiento inválido",
        description: expCheck.error ?? "Verificá la fecha de vencimiento (MM/AA).",
      });
      return;
    }
    if (!tarjeta.cvv || tarjeta.cvv.length < 3) {
      toast({ variant: "destructive", title: "CVV inválido", description: "Ingresá los 3 dígitos de seguridad." });
      return;
    }

    if (!plan) return;
    setLoading(true);
    try {
      // Solo viajan los últimos 4 dígitos y la franquicia: el número completo,
      // el CVV y el DNI nunca salen del navegador.
      const res = await apiFetch("/api/pagos-cliente/confirmar-tarjeta", {
        method: "POST",
        body: JSON.stringify({
          planId: plan.id,
          ultimos4: cleanNum.slice(-4),
          franquicia: cardBrand.name,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje ?? "No se pudo procesar el pago con tarjeta.");
      }

      toast({
        variant: "success",
        title: "¡Pago con tarjeta aprobado!",
        description: `Tu membresía en el plan ${plan.nombre} ya está activa.`,
      });

      onOpenChange(false);
      onPaymentSuccess();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error al pagar",
        description: err instanceof Error ? err.message : "Revisá los datos ingresados.",
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Manejo de Transferencia Bancaria
  const handleConfirmarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferencia.comprobante.trim()) {
      toast({
        variant: "destructive",
        title: "Falta el comprobante",
        description: "Ingresá el número de operación o referencia bancaria.",
      });
      return;
    }

    if (!plan) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/pagos-cliente/confirmar-transferencia", {
        method: "POST",
        body: JSON.stringify({
          planId: plan.id,
          numeroComprobante: transferencia.comprobante.trim(),
          observaciones: transferencia.observaciones.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.mensaje ?? "No se pudo registrar la transferencia.");
      }

      toast({
        variant: "success",
        title: "¡Transferencia registrada!",
        description: `Comprobante ingresado correctamente. Tu plan ${plan.nombre} quedó activado.`,
      });

      onOpenChange(false);
      onPaymentSuccess();
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Error al registrar transferencia",
        description: err instanceof Error ? err.message : "Intentá nuevamente.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!plan) return null;

  const precioFormatted = `$${(plan.precio ?? 0).toLocaleString("es-AR")}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 border-border bg-card text-card-foreground shadow-2xl rounded-2xl">
        {/* Header Resumen del Plan */}
        <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white p-6 rounded-t-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
          <DialogHeader className="text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Checkout Seguro
              </span>
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight text-white flex items-center justify-between">
              <span>{plan.nombre}</span>
              <span className="text-orange-400 font-mono text-2xl">{precioFormatted}</span>
            </DialogTitle>
            <DialogDescription className="text-zinc-300 text-xs mt-1">
              Acceso completo al gimnasio durante {plan.duracionEnDias} días continuos.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-6">
          {/* Selector de Métodos */}
          <div>
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2.5 block">
              Seleccioná cómo pagar
            </Label>
            <div className="grid grid-cols-3 gap-2.5">
              {/* Opción Mercado Pago */}
              <button
                type="button"
                onClick={() => setTab("mercadopago")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  tab === "mercadopago"
                    ? "border-[#009ee3] bg-[#009ee3]/10 ring-2 ring-[#009ee3]/30 text-foreground font-semibold shadow-xs"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-[#009ee3] text-white flex items-center justify-center mb-1.5 shadow-xs">
                  <span className="font-black text-xs">MP</span>
                </div>
                <span className="text-xs font-bold">Mercado Pago</span>
              </button>

              {/* Opción Tarjeta */}
              <button
                type="button"
                onClick={() => setTab("tarjeta")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  tab === "tarjeta"
                    ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30 text-foreground font-semibold shadow-xs"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center mb-1.5 shadow-xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Tarjeta</span>
              </button>

              {/* Opción Transferencia */}
              <button
                type="button"
                onClick={() => setTab("transferencia")}
                className={`flex flex-col items-center justify-center p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                  tab === "transferencia"
                    ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/30 text-foreground font-semibold shadow-xs"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted text-muted-foreground"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-1.5 shadow-xs">
                  <Building2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold">Transferencia</span>
              </button>
            </div>
          </div>

          {/* ────────────────── CONTENIDO: MERCADO PAGO ────────────────── */}
          {tab === "mercadopago" && (
            <div className="space-y-4 pt-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
              <div className="border border-[#009ee3]/20 bg-[#009ee3]/5 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#009ee3] text-white flex items-center justify-center shrink-0 shadow-sm font-black text-sm">
                    MP
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Mercado Pago Checkout</h4>
                    <p className="text-xs text-muted-foreground">Pagá con dinero en cuenta, débito o crédito en cuotas.</p>
                  </div>
                </div>

                <ul className="text-xs text-muted-foreground space-y-1.5 pt-1 pl-1">
                  <li className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Transacción 100% encriptada y protegida.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Acreditación y activación inmediata de tu plan.</span>
                  </li>
                </ul>
              </div>

              <Button
                onClick={handlePagarMercadoPago}
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#009ee3] hover:bg-[#0087c2] text-white text-sm font-bold shadow-md shadow-[#009ee3]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {loading ? (
                  "Conectando con Mercado Pago..."
                ) : (
                  <>
                    Pagar {precioFormatted} con Mercado Pago
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* ────────────────── CONTENIDO: TARJETA ────────────────── */}
          {tab === "tarjeta" && (
            <form onSubmit={handlePagarTarjeta} className="space-y-4 pt-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
              {/* Presets de prueba */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-x-2 gap-y-1">
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Tarjetas de Test (1 clic)
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                    Oficiales Mercado Pago
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {TEST_CARDS.map((tc, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => cargarTarjetaPrueba(tc)}
                      className={`text-[11px] px-2.5 py-1.5 rounded-lg border font-semibold text-left transition-all cursor-pointer shadow-xs ${tc.color}`}
                    >
                      {tc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tarjeta Visual Previa */}
              <div
                className={`bg-gradient-to-tr ${cardBrand.bgClass} text-white rounded-2xl p-5 shadow-lg border relative overflow-hidden space-y-4 transition-all duration-300`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono tracking-wider text-zinc-300">FITCORE PAY</span>
                    {luhnStatus === true && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Luhn OK
                      </span>
                    )}
                    {luhnStatus === false && (
                      <span className="inline-flex items-center gap-1 text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
                        <AlertCircle className="w-3 h-3" />
                        Inválida
                      </span>
                    )}
                  </div>
                  <div className={`px-2.5 py-0.5 rounded-md border text-xs font-black tracking-wider uppercase ${cardBrand.badgeClass}`}>
                    {cardBrand.name}
                  </div>
                </div>

                <div className="py-1">
                  <span className="font-mono text-lg sm:text-xl tracking-widest text-zinc-100">
                    {tarjeta.numero || "•••• •••• •••• ••••"}
                  </span>
                </div>

                <div className="flex justify-between items-end text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">Titular</span>
                    <span className="font-semibold uppercase tracking-wider text-zinc-100">
                      {tarjeta.titular || "NOMBRE Y APELLIDO"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-widest block">Vence</span>
                    <span className="font-mono text-zinc-100">{tarjeta.vencimiento || "MM/AA"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="tarjeta-numero" className="text-xs font-semibold text-foreground">
                      Número de Tarjeta
                    </Label>
                    {luhnStatus === true && (
                      <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Número válido ({cardBrand.name})
                      </span>
                    )}
                    {luhnStatus === false && (
                      <span className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Falla algoritmo de Luhn
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="tarjeta-numero"
                      placeholder="1234 5678 9012 3456"
                      value={tarjeta.numero}
                      onChange={(e) => handleNumeroTarjetaChange(e.target.value)}
                      disabled={loading}
                      className={
                        luhnStatus === true
                          ? "border-emerald-500 ring-1 ring-emerald-500/20"
                          : luhnStatus === false
                          ? "border-red-500 ring-1 ring-red-500/20"
                          : ""
                      }
                      required
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-xs font-bold text-muted-foreground">
                      {cardBrand.name}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="tarjeta-titular" className="text-xs font-semibold text-foreground">
                    Nombre del Titular (como figura en la tarjeta)
                  </Label>
                  <Input
                    id="tarjeta-titular"
                    placeholder="JUAN PEREZ"
                    value={tarjeta.titular}
                    onChange={(e) => setTarjeta((p) => ({ ...p, titular: e.target.value.toUpperCase() }))}
                    disabled={loading}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tarjeta-venc" className="text-xs font-semibold text-foreground">
                      Vence
                    </Label>
                    <Input
                      id="tarjeta-venc"
                      placeholder="MM/AA"
                      value={tarjeta.vencimiento}
                      onChange={(e) => handleVencimientoChange(e.target.value)}
                      disabled={loading}
                      className={
                        expiryStatus?.valid === true
                          ? "border-emerald-500"
                          : expiryStatus?.valid === false
                          ? "border-red-500"
                          : ""
                      }
                      required
                    />
                    {expiryStatus?.valid === false && (
                      <p className="text-[10px] text-red-500">{expiryStatus.error}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tarjeta-cvv" className="text-xs font-semibold text-foreground">
                      CVV
                    </Label>
                    <Input
                      id="tarjeta-cvv"
                      type="password"
                      maxLength={4}
                      placeholder="123"
                      value={tarjeta.cvv}
                      onChange={(e) => setTarjeta((p) => ({ ...p, cvv: e.target.value.replace(/\D/g, "") }))}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || luhnStatus === false || expiryStatus?.valid === false}
                className="w-full h-12 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
              >
                {loading ? (
                  "Procesando pago..."
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Pagar {precioFormatted} con Tarjeta
                  </>
                )}
              </Button>
            </form>
          )}

          {/* ────────────────── CONTENIDO: TRANSFERENCIA ────────────────── */}
          {tab === "transferencia" && (
            <form onSubmit={handleConfirmarTransferencia} className="space-y-4 pt-1 animate-in fade-in-0 slide-in-from-bottom-1 duration-200">
              {/* Tarjeta de Datos Bancarios */}
              <div className="border border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Datos de la Cuenta del Gimnasio</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center gap-x-3 bg-card p-2.5 rounded-xl border border-border">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">Banco & Titular</span>
                      <span className="font-semibold text-foreground truncate block">Banco Galicia — FitCore Gym S.A.</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">CUIT: 30-71234567-8</span>
                  </div>

                  {/* Alias con botón de copia */}
                  <div className="flex justify-between items-center gap-x-3 bg-card p-2.5 rounded-xl border border-border">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">Alias</span>
                      <span className="font-mono font-bold text-foreground text-sm truncate">FITCORE.GYM</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copiarTexto("FITCORE.GYM", "alias")}
                      className="h-8 gap-1.5 text-xs rounded-lg cursor-pointer shrink-0"
                    >
                      {copiadoAlias ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar Alias
                        </>
                      )}
                    </Button>
                  </div>

                  {/* CBU con botón de copia */}
                  <div className="flex justify-between items-center gap-x-3 bg-card p-2.5 rounded-xl border border-border">
                    <div className="min-w-0">
                      <span className="text-[10px] text-muted-foreground block uppercase font-bold">CBU / CVU</span>
                      <span className="font-mono text-xs text-foreground truncate block">0070123420000012345678</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copiarTexto("0070123420000012345678", "cbu")}
                      className="h-8 gap-1.5 text-xs rounded-lg cursor-pointer shrink-0"
                    >
                      {copiadoCbu ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar CBU
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Formulario de Comprobante */}
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="transf-comp" className="text-xs font-semibold text-foreground">
                    N° de Comprobante / Código de Operación <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="transf-comp"
                    placeholder="Ej. OP-8492048 o últimos 6 dígitos del comprobante"
                    value={transferencia.comprobante}
                    onChange={(e) => setTransferencia((p) => ({ ...p, comprobante: e.target.value }))}
                    disabled={loading}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Podés encontrar este código en el comprobante emitido por tu banco o billetera virtual.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="transf-obs" className="text-xs font-semibold text-foreground">
                    Observación adicional <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
                  </Label>
                  <Input
                    id="transf-obs"
                    placeholder="Ej. Transferido desde cuenta a nombre de..."
                    value={transferencia.observaciones}
                    onChange={(e) => setTransferencia((p) => ({ ...p, observaciones: e.target.value }))}
                    disabled={loading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
              >
                {loading ? (
                  "Verificando comprobante..."
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Confirmar Transferencia de {precioFormatted}
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Footer de Seguridad */}
          <div className="pt-2 border-t border-border flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Tus pagos están protegidos bajo estándares bancarios y SSL.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
