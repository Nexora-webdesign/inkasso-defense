// app/agb/page.tsx – Allgemeine Geschäftsbedingungen (für den kostenpflichtigen PDF-Kauf)
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/blog/SiteHeader";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description: "AGB und Widerrufsbelehrung für den kostenpflichtigen Widerspruchs-PDF-Kauf.",
  alternates: { canonical: "/agb" },
  robots: { index: false },
};

const H2 = (p: { children: ReactNode }) => (
  <h2 className="mt-12 text-2xl font-extrabold tracking-tight text-white" {...p} />
);
const P = (p: { children: ReactNode }) => (
  <p className="mt-4 leading-relaxed text-slate-300" {...p} />
);
const linkCls =
  "rounded font-semibold text-mint-light underline underline-offset-2 outline-none hover:decoration-mint focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night";

export default function AgbPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <h1 className="font-display text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          Allgemeine Geschäftsbedingungen
        </h1>
        <P>
          Die Nutzung von Inkasso·Defense – einschließlich Analyse, Posten-Übersicht, Antwort-E-Mail
          und Widerspruchs-PDF – ist <strong className="font-semibold text-white">kostenlos</strong>.
          Diese Bedingungen gelten für etwaige künftige <strong className="font-semibold text-white">
          kostenpflichtige Zusatzangebote</strong> (z. B. eine „Fall-Begleitung"). Sobald ein solches
          Angebot verfügbar ist, gelten die nachstehenden Regelungen.
        </P>

        <H2>1. Anbieter</H2>
        <P>
          Igor Bengraf, Amselweg 9, 48291 Telgte, Deutschland · E-Mail:{" "}
          <a href="mailto:Igor.bengraf@web.de" className={linkCls}>
            Igor.bengraf@web.de
          </a>
          . Weitere Angaben im{" "}
          <a href="/impressum" className={linkCls}>
            Impressum
          </a>
          .
        </P>

        <H2>2. Leistung</H2>
        <P>
          Der kostenlose Kern (Analyse, Posten-Übersicht, Antwort-E-Mail, Widerspruchs-PDF) ist eine{" "}
          <strong className="font-semibold text-white">technische, regelbasierte Orientierungshilfe –
          keine Rechtsberatung</strong>. Gegenstand künftiger kostenpflichtiger Zusatzangebote ist eine
          erweiterte digitale Leistung (z. B. zeitlich begrenzte „Fall-Begleitung").
        </P>

        <H2>3. Preis und Zahlungsabwicklung</H2>
        <P>
          Der Preis eines kostenpflichtigen Zusatzangebots wird vor dem Kauf klar inkl. gesetzlicher
          Umsatzsteuer ausgewiesen. Die Zahlungs- und Rechnungsabwicklung erfolgt über unseren Reseller{" "}
          <strong className="font-semibold text-white">Lemon Squeezy (Lemon Squeezy, LLC)</strong> als
          „Merchant of Record": Lemon Squeezy stellt die Rechnung, wickelt die Zahlung ab und führt die
          anfallende Umsatzsteuer ab. Es gelten ergänzend deren Bedingungen.
        </P>

        <H2>4. Vertragsschluss</H2>
        <P>
          Ein kostenpflichtiger Vertrag kommt erst mit Abschluss des Bezahlvorgangs über Lemon Squeezy
          zustande. Für den kostenlosen Kern entsteht keine Zahlungspflicht.
        </P>

        <H2>5. Widerrufsrecht bei digitalen Inhalten</H2>
        <P>
          Bei kostenpflichtigen digitalen Inhalten haben Verbraucher grundsätzlich ein 14-tägiges
          Widerrufsrecht. Es <strong className="font-semibold text-white">erlischt</strong>, wenn die
          Ausführung begonnen hat, nachdem du ausdrücklich zugestimmt hast, dass mit der Ausführung vor
          Ablauf der Widerrufsfrist begonnen wird, und du deine Kenntnis vom Verlust des Widerrufsrechts
          bestätigt hast (§ 356 Abs. 5 BGB). Diese Zustimmung holen wir vor einem Kauf über eine
          Pflicht-Checkbox ein.
        </P>

        <H2>6. Keine Rechtsberatung (RDG)</H2>
        <P>
          Das Angebot ist eine technische, regelbasierte Orientierungshilfe und ersetzt nicht die
          Prüfung des Einzelfalls durch eine fachkundige Stelle oder einen Rechtsanwalt.
        </P>

        <H2>7. Haftung</H2>
        <P>
          Wir haften unbeschränkt für Vorsatz und grobe Fahrlässigkeit sowie nach dem
          Produkthaftungsgesetz. Bei einfacher Fahrlässigkeit haften wir nur bei Verletzung einer
          wesentlichen Vertragspflicht und der Höhe nach begrenzt auf den vorhersehbaren,
          vertragstypischen Schaden. Für die rechtliche Wirksamkeit eines erstellten Schreibens im
          Einzelfall wird keine Gewähr übernommen.
        </P>

        <H2>8. Anwendbares Recht & Streitschlichtung</H2>
        <P>
          Es gilt deutsches Recht. Hinweise zur EU-Online-Streitbeilegung findest du im{" "}
          <a href="/impressum" className={linkCls}>
            Impressum
          </a>
          . Zur Datenverarbeitung siehe{" "}
          <a href="/datenschutz" className={linkCls}>
            Datenschutzerklärung
          </a>
          .
        </P>

        <P>Stand: Juni 2026.</P>
      </main>
    </>
  );
}
