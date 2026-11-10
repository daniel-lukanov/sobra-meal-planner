export const stores = ["Pingo Doce", "Continente", "Lidl", "Aldi", "Auchan"] as const;
export type StoreName = (typeof stores)[number];

/** Brand colours of each supermarket, used only for their badges. */
export const storeBrand: Record<StoreName, { dot: string; pill: string; ring?: string }> = {
  "Pingo Doce": { dot: "#1E5631", pill: "#E3EFE6" },
  Continente: { dot: "#B83227", pill: "#F9E3E1" },
  Lidl: { dot: "#1D4ED8", pill: "#E5EDFF", ring: "#D97706" },
  Aldi: { dot: "#0F3D75", pill: "#E2EBF5" },
  Auchan: { dot: "#C83E2B", pill: "#FAD4CF" },
};
