import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ATLAS palette — deep blue-black + restrained blue accent
        "terminal": "#0a0d13",
        "panel": "#10141d",
        "panel-hover": "#151a26",
        "panel-border": "#1f2735",
        "panel-border-active": "#5e8bff",

        // Accent (legacy "orange" names kept so existing classes restyle in place)
        "accent-orange": "#5e8bff",
        "accent-orange-dim": "#4a6fd0",
        "accent-orange-glow": "rgba(94,139,255,0.14)",

        // Data colors
        "up": "#34c98e",
        "up-dim": "#2aa476",
        "down": "#f0647a",
        "down-dim": "#c54f62",
        "neutral": "#e8ecf4",
        "dim": "#98a2b8",
        "muted": "#566076",

        // Specific UI elements
        "header-bg": "#151a26",
        "row-even": "#10141d",
        "row-odd": "#11161f",
        "row-hover": "#1b2230",
        "cursor": "#5e8bff",
        "selection-bg": "rgba(94,139,255,0.35)",
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        xs: ["0.7rem", { lineHeight: "1rem" }],
        sm: ["0.75rem", { lineHeight: "1.125rem" }],
        base: ["0.8125rem", { lineHeight: "1.25rem" }],
      },
      spacing: {
        "panel-gap": "1px",
        "cell-px": "6px",
        "cell-py": "3px",
      },
      borderWidth: {
        "panel": "1px",
      },
      animation: {
        "blink": "blink 1s step-end infinite",
        "flash-up": "flashUp 0.6s ease-out",
        "flash-down": "flashDown 0.6s ease-out",
        "ticker": "ticker 30s linear infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        flashUp: {
          "0%": { backgroundColor: "rgba(52,201,142,0.18)" },
          "100%": { backgroundColor: "transparent" },
        },
        flashDown: {
          "0%": { backgroundColor: "rgba(240,100,122,0.18)" },
          "100%": { backgroundColor: "transparent" },
        },
        ticker: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(-100%)" },
        },
      },
      gridTemplateColumns: {
        "terminal": "280px 1fr 320px",
        "terminal-wide": "300px 1fr 1fr 300px",
      },
    },
  },
  plugins: [],
};

export default config;
