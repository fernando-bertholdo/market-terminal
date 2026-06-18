"use client";

import React from "react";
import type { Density, TerminalPreferences, TextScale } from "@/hooks/useTerminalPreferences";

export default function PreferencesDrawer({
  open,
  preferences,
  actions,
  onClose,
}: {
  open: boolean;
  preferences: TerminalPreferences;
  actions: {
    setTextScale: (textScale: TextScale) => void;
    setDensity: (density: Density) => void;
    toggleViewMode: () => void;
    reset: () => void;
  };
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/60" onMouseDown={onClose}>
      <aside
        className="ml-auto h-full w-[min(390px,100vw)] border-l border-[#2c3750] bg-[#10141d] p-4 shadow-[-12px_0_40px_rgba(0,0,0,0.5)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral">
            Preferences
          </span>
          <button type="button" onClick={onClose} className="text-dim hover:text-neutral">
            ESC
          </button>
        </div>

        <section className="mb-5">
          <div className="mb-2 text-2xs text-dim tracking-[0.14em]">TEXT SCALE</div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#1b2230] p-1">
            {(["compact", "standard", "large"] as TextScale[]).map((scale) => (
              <button
                key={scale}
                type="button"
                onClick={() => actions.setTextScale(scale)}
                className={`rounded-md px-2 py-2 text-xs uppercase ${
                  preferences.textScale === scale
                    ? "bg-[rgba(94,139,255,0.14)] text-accent-orange"
                    : "text-dim hover:text-neutral"
                }`}
              >
                {scale}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-2 text-2xs text-dim tracking-[0.14em]">DENSITY</div>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#1b2230] p-1">
            {(["dense", "comfortable"] as Density[]).map((density) => (
              <button
                key={density}
                type="button"
                onClick={() => actions.setDensity(density)}
                className={`rounded-md px-2 py-2 text-xs uppercase ${
                  preferences.density === density
                    ? "bg-[rgba(94,139,255,0.14)] text-accent-orange"
                    : "text-dim hover:text-neutral"
                }`}
              >
                {density}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 rounded-lg border border-panel-border bg-[#151a26] p-3">
          <div className="mb-2 text-2xs text-dim tracking-[0.14em]">WORKFLOW</div>
          <button
            type="button"
            onClick={actions.toggleViewMode}
            className="mb-2 w-full rounded-md border border-panel-border px-2 py-2 text-left text-xs text-neutral hover:border-accent-orange"
          >
            VIEW MODE: {preferences.viewMode.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={actions.reset}
            className="w-full rounded-md border border-panel-border px-2 py-2 text-left text-xs text-dim hover:text-neutral"
          >
            RESET APPEARANCE
          </button>
        </section>

        <div className="text-2xs leading-5 text-dim">
          Shortcuts: Ctrl+K command, P preferences, F focus, [ ] workspace, 1-6 widgets.
        </div>
      </aside>
    </div>
  );
}
