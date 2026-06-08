// lib/format.ts – zentrale UI-Formatierung & Status-Maps (DRY).
// Vorher mehrfach in /konto, /faelle, /fall kopiert.

export const eur = (n: unknown) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Number(n) || 0);

export const fmtDate = (d: Date | string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

export const fmtDateShort = (d: Date | string) =>
  new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", year: "numeric" });

export const STATUS_LABEL: Record<string, string> = {
  offen: "Offen",
  widerspruch_gesendet: "Widerspruch gesendet",
  mahnbescheid_erhalten: "Mahnbescheid erhalten",
  erledigt: "Erledigt",
};

export const STATUS_CLS: Record<string, string> = {
  offen: "bg-mint/15 text-mint-light",
  widerspruch_gesendet: "bg-sky-400/15 text-sky-300",
  mahnbescheid_erhalten: "bg-amber-400/15 text-amber-300",
  erledigt: "bg-white/10 text-slate-300",
};
