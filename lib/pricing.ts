// lib/pricing.ts – zentrale Preis-Anzeige der „Fall-Begleitung".
// Env-überschreibbar (NEXT_PUBLIC_, also auch im Client verfügbar).
export const CASE_PRICE_LABEL =
  process.env.NEXT_PUBLIC_LS_CASE_PRICE || "9,90 € einmalig · 90 Tage";
