"use client";

import { useEffect, useMemo, useState } from "react";

export type TextScale = "compact" | "standard" | "large";
export type Density = "dense" | "comfortable";
export type ViewMode = "overview" | "focus";
export type TerminalTheme = "classic" | "contrast" | "soft";
export type TerminalLayout = "threeColumn" | "newsRight" | "chartsFocus";

export interface TerminalPreferences {
  textScale: TextScale;
  density: Density;
  viewMode: ViewMode;
  theme: TerminalTheme;
  layout: TerminalLayout;
}

const STORAGE_KEY = "terminal.preferences.v1";

const DEFAULT_PREFS: TerminalPreferences = {
  textScale: "standard",
  density: "dense",
  viewMode: "overview",
  theme: "classic",
  layout: "threeColumn",
};

const TEXT_ORDER: TextScale[] = ["compact", "standard", "large"];
const DENSITY_ORDER: Density[] = ["dense", "comfortable"];
const THEME_ORDER: TerminalTheme[] = ["classic", "contrast", "soft"];
const LAYOUT_ORDER: TerminalLayout[] = [
  "threeColumn",
  "newsRight",
  "chartsFocus",
];

function isTextScale(value: unknown): value is TextScale {
  return value === "compact" || value === "standard" || value === "large";
}

function isDensity(value: unknown): value is Density {
  return value === "dense" || value === "comfortable";
}

function isViewMode(value: unknown): value is ViewMode {
  return value === "overview" || value === "focus";
}

function isTerminalTheme(value: unknown): value is TerminalTheme {
  return value === "classic" || value === "contrast" || value === "soft";
}

function isTerminalLayout(value: unknown): value is TerminalLayout {
  return (
    value === "threeColumn" ||
    value === "newsRight" ||
    value === "chartsFocus"
  );
}

function readPrefs(): TerminalPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      textScale: isTextScale(parsed.textScale)
        ? parsed.textScale
        : DEFAULT_PREFS.textScale,
      density: isDensity(parsed.density) ? parsed.density : DEFAULT_PREFS.density,
      viewMode: isViewMode(parsed.viewMode)
        ? parsed.viewMode
        : DEFAULT_PREFS.viewMode,
      theme: isTerminalTheme(parsed.theme) ? parsed.theme : DEFAULT_PREFS.theme,
      layout: isTerminalLayout(parsed.layout)
        ? parsed.layout
        : DEFAULT_PREFS.layout,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function useTerminalPreferences() {
  const [preferences, setPreferences] =
    useState<TerminalPreferences>(DEFAULT_PREFS);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setPreferences(readPrefs());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [hasHydrated, preferences]);

  const actions = useMemo(
    () => ({
      increaseText() {
        setPreferences((current) => {
          const index = TEXT_ORDER.indexOf(current.textScale);
          return {
            ...current,
            textScale: TEXT_ORDER[Math.min(index + 1, TEXT_ORDER.length - 1)],
          };
        });
      },
      decreaseText() {
        setPreferences((current) => {
          const index = TEXT_ORDER.indexOf(current.textScale);
          return {
            ...current,
            textScale: TEXT_ORDER[Math.max(index - 1, 0)],
          };
        });
      },
      toggleDensity() {
        setPreferences((current) => ({
          ...current,
          density: current.density === "dense" ? "comfortable" : "dense",
        }));
      },
      setDensity(density: Density) {
        setPreferences((current) => ({ ...current, density }));
      },
      cycleDensity() {
        setPreferences((current) => {
          const index = DENSITY_ORDER.indexOf(current.density);
          return {
            ...current,
            density: DENSITY_ORDER[(index + 1) % DENSITY_ORDER.length],
          };
        });
      },
      toggleViewMode() {
        setPreferences((current) => ({
          ...current,
          viewMode: current.viewMode === "overview" ? "focus" : "overview",
        }));
      },
      setViewMode(viewMode: ViewMode) {
        setPreferences((current) => ({ ...current, viewMode }));
      },
      setTextScale(textScale: TextScale) {
        setPreferences((current) => ({ ...current, textScale }));
      },
      cycleTextScale() {
        setPreferences((current) => {
          const index = TEXT_ORDER.indexOf(current.textScale);
          return {
            ...current,
            textScale: TEXT_ORDER[(index + 1) % TEXT_ORDER.length],
          };
        });
      },
      setTheme(theme: TerminalTheme) {
        setPreferences((current) => ({ ...current, theme }));
      },
      cycleTheme() {
        setPreferences((current) => {
          const index = THEME_ORDER.indexOf(current.theme);
          return {
            ...current,
            theme: THEME_ORDER[(index + 1) % THEME_ORDER.length],
          };
        });
      },
      setLayout(layout: TerminalLayout) {
        setPreferences((current) => ({ ...current, layout }));
      },
      cycleLayout() {
        setPreferences((current) => {
          const index = LAYOUT_ORDER.indexOf(current.layout);
          return {
            ...current,
            layout: LAYOUT_ORDER[(index + 1) % LAYOUT_ORDER.length],
          };
        });
      },
      reset() {
        setPreferences(DEFAULT_PREFS);
      },
    }),
    []
  );

  return { preferences, actions };
}
