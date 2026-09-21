import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";

interface GymSettings {
  nombreGimnasio: string | null;
  logoBase64: string | null;
  faviconBase64: string | null;
  colorPrimario: string | null;
  colorSecundario: string | null;
  colorAcento: string | null;
  borderRadius: string;
  fontFamily: string;
  avatarStyle: string;
  mensajeBienvenida: string | null;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  tiktokUrl: string | null;
  reporteOcupacionHabilitado: boolean;
  reporteContableHabilitado: boolean;
}

const DEFAULT_SETTINGS: GymSettings = {
  nombreGimnasio: null,
  logoBase64: null,
  faviconBase64: null,
  colorPrimario: null,
  colorSecundario: null,
  colorAcento: null,
  borderRadius: "lg",
  fontFamily: "inter",
  avatarStyle: "avataaars",
  mensajeBienvenida: null,
  telefono: null,
  whatsapp: null,
  email: null,
  instagramUrl: null,
  facebookUrl: null,
  tiktokUrl: null,
  reporteOcupacionHabilitado: true,
  reporteContableHabilitado: true,
};


const RADIUS_MAP: Record<string, string> = {
  none: "0rem",
  sm: "0.5rem",
  md: "1rem",
  lg: "1.5rem",
};

const FONT_MAP: Record<string, string> = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  geist: "'Geist Variable', sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

interface GymSettingsContextType {
  settings: GymSettings;
  loading: boolean;
  refetch: () => void;
}

const GymSettingsContext = createContext<GymSettingsContextType | null>(null);

export function GymSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GymSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const cargar = () => {
    apiFetch("/api/gymsettings")
      .then((r) => (r.ok ? r.json() : DEFAULT_SETTINGS))
      .then((data) => setSettings({ ...DEFAULT_SETTINGS, ...data }))
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    const setOrRemove = (prop: string, value: string | null) => {
      if (value) root.style.setProperty(prop, value);
      else root.style.removeProperty(prop);
    };

    setOrRemove("--primary", settings.colorPrimario);
    setOrRemove("--secondary", settings.colorSecundario);
    setOrRemove("--accent", settings.colorAcento);
    root.style.setProperty("--radius", RADIUS_MAP[settings.borderRadius] ?? RADIUS_MAP.lg);
    root.style.setProperty("--font-sans", FONT_MAP[settings.fontFamily] ?? FONT_MAP.inter);

    if (settings.faviconBase64) {
      document
        .querySelector<HTMLLinkElement>("link[rel~='icon']")
        ?.setAttribute("href", settings.faviconBase64);
    }
  }, [settings]);

  return (
    <GymSettingsContext.Provider value={{ settings, loading, refetch: cargar }}>
      {children}
    </GymSettingsContext.Provider>
  );
}

export function useGymSettings() {
  const ctx = useContext(GymSettingsContext);
  if (!ctx) throw new Error("useGymSettings debe usarse dentro de GymSettingsProvider");
  return ctx;
}
