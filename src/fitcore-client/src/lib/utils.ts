import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza un número telefónico al formato internacional requerido por WhatsApp (wa.me).
 * Maneja números locales de Argentina (código de área, prefijo 15, o con/sin 549).
 */
export function normalizeWhatsAppPhone(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  let digits = telefono.replace(/[^\d]/g, "");
  if (!digits) return null;

  // Si tiene 0 inicial (ej: 011 ...), removerlo
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Si tiene 12 dígitos con 15 después del código de área (ej: 111560021513):
  if (digits.length === 12 && digits.slice(2, 4) === "15") {
    digits = digits.slice(0, 2) + digits.slice(4);
  }

  // Si tiene 10 dígitos (ej: 1160021513 - código de área 11 + 8 dígitos):
  if (digits.length === 10) {
    digits = `549${digits}`;
  }
  // Si empieza con 54 pero le falta el 9 móvil (ej: 541160021513):
  else if (digits.startsWith("54") && !digits.startsWith("549") && digits.length === 12) {
    digits = `549${digits.slice(2)}`;
  }
  // Si empieza con 9 y le falta el 54 (ej: 91160021513):
  else if (digits.startsWith("9") && digits.length === 11) {
    digits = `54${digits}`;
  }

  return digits;
}

/**
 * Arma un link de wa.me a partir de un teléfono y un mensaje pre-cargado.
 * Devuelve null si no hay teléfono cargado.
 */
export function buildWhatsAppUrl(telefono: string | null | undefined, mensaje: string): string | null {
  const digits = normalizeWhatsAppPhone(telefono);
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(mensaje)}`;
}
