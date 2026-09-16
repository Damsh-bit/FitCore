import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ClienteOpcion = {
  id: string | number;
  nombre: string;
  apellido?: string | null;
};

interface ClienteComboboxProps {
  clientes: ClienteOpcion[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/**
 * Selector de cliente con búsqueda en vivo. Reemplaza a los <select>/Select
 * comunes en los flujos de alta frecuencia (check-in, registrar pago) donde
 * un gimnasio con muchos socios vuelve inutilizable un dropdown sin filtro.
 */
export default function ClienteCombobox({
  clientes,
  value,
  onChange,
  placeholder = "Buscar cliente por nombre...",
  emptyLabel = "No se encontraron clientes",
  disabled,
  className,
  id,
}: ClienteComboboxProps) {
  const [open, setOpen] = useState(false);
  // Se desmonta con retraso para que la transición de cierre (opacidad +
  // traslado) llegue a reproducirse antes de sacar el nodo del DOM.
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [dropUp, setDropUp] = useState(false);
  const [maxListHeight, setMaxListHeight] = useState(256);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const timeout = setTimeout(() => setMounted(false), 150);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Evita que el dropdown se abra fuera de la pantalla (y arrastre scroll a
  // toda la página): si no entra por debajo, se abre hacia arriba, y en
  // ambos casos se recorta a lo que realmente entra en la ventana.
  useEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const margin = 8;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const preferUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    setDropUp(preferUp);
    setMaxListHeight(Math.max(120, Math.min(256, preferUp ? spaceAbove : spaceBelow)));
  }, [open]);

  const seleccionado = useMemo(
    () => clientes.find((c) => String(c.id) === String(value)) ?? null,
    [clientes, value]
  );

  const nombreCompleto = (c: ClienteOpcion) => `${c.nombre} ${c.apellido ?? ""}`.trim();

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => nombreCompleto(c).toLowerCase().includes(q));
  }, [clientes, query]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const seleccionar = (c: ClienteOpcion) => {
    onChange(String(c.id));
    setOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const c = filtrados[highlight];
      if (c) seleccionar(c);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          id={id}
          ref={inputRef}
          type="text"
          disabled={disabled}
          placeholder={seleccionado ? nombreCompleto(seleccionado) : placeholder}
          value={open ? query : ""}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-background pl-9 pr-16 py-2 text-sm font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316] focus-visible:border-[#f97316] disabled:cursor-not-allowed disabled:opacity-50",
            !open && seleccionado && "placeholder:text-foreground placeholder:font-medium"
          )}
        />
        {seleccionado && !open && (
          <button
            type="button"
            aria-label="Limpiar selección"
            disabled={disabled}
            onClick={() => {
              onChange("");
              setQuery("");
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {mounted && !disabled && (
        <div
          className={cn(
            "absolute z-50 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-xl py-1",
            "transition-[opacity,transform] duration-150 ease-out",
            dropUp ? "bottom-full mb-1" : "top-full mt-1",
            open
              ? "opacity-100 translate-y-0"
              : cn("opacity-0 pointer-events-none", dropUp ? "translate-y-1" : "-translate-y-1")
          )}
          style={{ maxHeight: maxListHeight }}
        >
          {filtrados.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground text-center">{emptyLabel}</p>
          ) : (
            filtrados.map((c, i) => (
              <button
                key={c.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionar(c)}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm truncate",
                  i === highlight ? "bg-orange-500/15 text-orange-600 dark:text-orange-400" : "text-foreground hover:bg-muted",
                  String(c.id) === String(value) && "font-semibold"
                )}
              >
                {nombreCompleto(c)}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
