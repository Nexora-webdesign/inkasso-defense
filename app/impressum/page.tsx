// app/impressum/page.tsx – Impressum (§ 5 DDG)
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/blog/SiteHeader";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Anbieterkennzeichnung nach § 5 DDG.",
  alternates: { canonical: "/impressum" },
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

export default function ImpressumPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <h1 className="font-display text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          Impressum
        </h1>

        <H2>Angaben gemäß § 5 DDG</H2>
        <P>
          Igor Bengraf
          <br />
          Amselweg 9
          <br />
          48291 Telgte, Deutschland
        </P>

        <H2>Kontakt</H2>
        <P>
          E-Mail:{" "}
          <a href="mailto:Igor.bengraf@web.de" className={linkCls}>
            Igor.bengraf@web.de
          </a>
        </P>

        <H2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</H2>
        <P>Igor Bengraf, Anschrift wie oben.</P>

        <H2>Zuständige Aufsichtsbehörde (Datenschutz)</H2>
        <P>
          Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)
          <br />
          Kavalleriestraße 2–4, 40213 Düsseldorf
          <br />
          <a href="https://www.ldi.nrw.de" className={linkCls} target="_blank" rel="noopener">
            ldi.nrw.de
          </a>
        </P>

        <H2>Hinweis zur Tätigkeit (RDG)</H2>
        <P>
          Diese Anwendung bietet eine rein technische, regelbasierte Analysehilfe und stellt{" "}
          <strong className="font-semibold text-white">keine Rechtsberatung</strong> dar. Sie ersetzt
          nicht die Prüfung des Einzelfalls durch eine fachkundige Stelle oder einen Rechtsanwalt.
        </P>

        <H2>EU-Streitschlichtung</H2>
        <P>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a href="https://ec.europa.eu/consumers/odr" className={linkCls} target="_blank" rel="noopener">
            ec.europa.eu/consumers/odr
          </a>
          . Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </P>

        <H2>Haftung für Inhalte und Links</H2>
        <P>
          Inhalte werden mit Sorgfalt erstellt; eine Gewähr für Aktualität und Vollständigkeit wird
          nicht übernommen. Für Inhalte externer Links sind ausschließlich deren Betreiber
          verantwortlich.
        </P>

        <H2>Urheberrecht</H2>
        <P>
          Die auf dieser Seite erstellten Inhalte unterliegen dem deutschen Urheberrecht. Beiträge
          Dritter sind als solche gekennzeichnet.
        </P>
      </main>
    </>
  );
}
