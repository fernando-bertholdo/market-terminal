"use client";

// Shared actions any panel can call without prop drilling.
// Provided by TerminalLayout; the default no-op fallback keeps panels safe
// if rendered outside the provider (e.g. in isolation during development).

import { createContext, useContext } from "react";

export interface TerminalActions {
  /** Open the full-screen chart overlay for a catalog instrument id. */
  openChart: (instrumentId: string) => void;
}

const noop = () => {};

export const TerminalActionsContext = createContext<TerminalActions>({
  openChart: noop,
});

export function useTerminalActions(): TerminalActions {
  return useContext(TerminalActionsContext);
}
