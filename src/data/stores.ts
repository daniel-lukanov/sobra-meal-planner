export const stores = ["Pingo Doce", "Continente", "Lidl", "Aldi", "Auchan"] as const;
export type StoreName = (typeof stores)[number];
