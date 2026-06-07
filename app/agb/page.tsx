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
          Diese Bedingungen gelten für den kostenpflichtigen Erwerb des Widerspruchs-PDF. Die Analyse,
          die Posten-Übersicht und das Kopieren der Antwort-E-Mail sind und bleiben kostenlos.
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
          Gegenstand des kostenpflichtigen Angebots ist die einmalige Erstellung und Bereitstellung
          eines individuellen Widerspruchs-Schreibens als PDF-Datei auf Grundlage der von dir
          erfassten Angaben. Es handelt sich um eine{" "}
          <strong className="font-semibold text-white">technische Analyse- und Dokumenterstellung,
          nicht um Rechtsberatung</strong>.
        </P>

        <H2>3. Preis und Zahlungsabwicklung</H2>
        <P>
          Der Preis für das Widerspruchs-PDF beträgt <strong className="font-semibold text-white">4,90 €
          inkl. gesetzlicher Umsatzsteuer</strong>. Die Zahlungs- und Rechnungsabwicklung erfolgt über
          unseren Reseller{" "}
          <strong className="font-semibold text-white">Lemon Squeezy (Lemon Squeezy, LLC)</strong> als
          „Merchant of Record". Lemon Squeezy stellt die Rechnung, wickelt die Zahlung ab und führt die
          jeweils anfallende Umsatzsteuer ab. Es gelten ergänzend deren Bedingungen.
        </P>

        <H2>4. Vertragsschluss</H2>
        <P>
          Der Vertrag kommt mit Abschluss des Bezahlvorgangs über Lemon Squeezy zustande. Nach
          erfolgreicher Zahlung erhältst du einen Freischaltcode (Lizenzschlüssel), mit dem das PDF
          erzeugt und heruntergeladen werden kann.
        </P>

        <H2>5. Widerrufsrecht bei digitalen Inhalten</H2>
        <P>
          Verbraucher haben grundsätzlich ein 14-tägiges Widerrufsrecht. Bei digitalen Inhalten, die
          nicht auf einem körperlichen Datenträger geliefert werden, <strong className="font-semibold text-white">
          erlischt das Widerrufsrecht</strong>, wenn die Ausführung begonnen hat, nachdem du
          ausdrücklich zugestimmt hast, dass mit der Ausführung vor Ablauf der Widerrufsfrist begonnen
          wird, und du deine Kenntnis vom Verlust des Widerrufsrechts bestätigt hast (§ 356 Abs. 5 BGB).
        </P>
        <P>
          Diese ausdrückliche Zustimmung und Bestätigung holen wir vor dem Kauf über eine Pflicht-
          Checkbox ein. Da das PDF unmittelbar nach Zahlung bereitgestellt wird, erlischt dein
          Widerrufsrecht mit Beginn der Bereitstellung.
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
