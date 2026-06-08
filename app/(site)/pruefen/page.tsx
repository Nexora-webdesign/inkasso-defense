// app/pruefen/page.tsx – Neuer geführter Funnel ("Gegenwehr-Cockpit"),
// angebunden an die bestehende Logik (/api/analyze + Regel-Engine + Supabase).
// Öffentlich (keine Anmeldung nötig; Speichern erfordert später Login).
import type { Metadata } from "next";
import { GegenwehrWizard } from "@/components/funnel/GegenwehrWizard";

export const metadata: Metadata = {
  title: "Forderung prüfen",
  description:
    "Inkasso-Forderung in 5 Schritten prüfen: Dokument scannen, Fakten-Check, KI-Analyse, Ergebnis und Gegenwehr – kostenlos.",
  alternates: { canonical: "/pruefen" },
};

export default function PruefenPage() {
  return <GegenwehrWizard />;
}
