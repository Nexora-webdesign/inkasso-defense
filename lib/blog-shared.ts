// lib/blog-shared.ts
// Client-sichere Blog-Typen & Helfer (KEIN node:fs!). Darf von Client-
// Komponenten importiert werden. Die fs-gestützten Loader liegen in lib/blog.ts.

/** Basis-URL für Canonical-/OG-Links (per Env überschreibbar). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.inkasso-defense.de";

export interface PostMeta {
  slug: string;
  title: string;
  lead: string;
  category: string;
  /** ISO-Datum (YYYY-MM-DD) */
  date: string;
  /** Optionaler Pfad zu einem Cover-Bild (sonst Platzhalter-Verlauf). */
  cover?: string;
  /** Lesezeit in Minuten. */
  readingMinutes?: number;
  /** SEO-Keywords (aus Frontmatter, kommagetrennt oder Liste). */
  keywords?: string[];
}

/** Deutsches Langdatum, deterministisch (kein Locale-Drift im Build). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const monate = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember",
  ];
  if (!y || !m || !d) return iso;
  return `${d}. ${monate[m - 1]} ${y}`;
}
