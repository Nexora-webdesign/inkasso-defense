// app/datenschutz/page.tsx – Datenschutzerklärung
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/blog/SiteHeader";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Informationen zur Verarbeitung personenbezogener Daten bei Inkasso·Defense.",
  alternates: { canonical: "/datenschutz" },
  robots: { index: false },
};

const H2 = (p: { children: ReactNode }) => (
  <h2 className="mt-12 text-2xl font-extrabold tracking-tight text-white" {...p} />
);
const H3 = (p: { children: ReactNode }) => (
  <h3 className="mt-8 text-lg font-bold text-white" {...p} />
);
const P = (p: { children: ReactNode }) => (
  <p className="mt-4 leading-relaxed text-slate-300" {...p} />
);
const linkCls =
  "rounded font-semibold text-mint-light underline underline-offset-2 outline-none hover:decoration-mint focus-visible:ring-2 focus-visible:ring-mint/60 focus-visible:ring-offset-2 focus-visible:ring-offset-night";

export default function DatenschutzPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-14 sm:pt-20">
        <h1 className="font-display text-4xl font-semibold tracking-tightest text-white sm:text-5xl">
          Datenschutzerklärung
        </h1>
        <P>
          Der Schutz deiner Daten hat für uns hohe Priorität. Diese Erklärung informiert dich nach
          Art. 13 DSGVO darüber, welche personenbezogenen Daten bei der Nutzung dieser Anwendung
          verarbeitet werden.
        </P>

        <H2>1. Verantwortlicher</H2>
        <P>
          Verantwortlich im Sinne der DSGVO ist:
          <br />
          Igor Bengraf
          <br />
          Amselweg 9
          <br />
          48291 Telgte, Deutschland
          <br />
          E-Mail:{" "}
          <a href="mailto:Igor.bengraf@web.de" className={linkCls}>
            Igor.bengraf@web.de
          </a>
        </P>

        <H2>2. Privacy by Design: keine dauerhafte Speicherung</H2>
        <P>
          Diese Anwendung ist auf Datensparsamkeit ausgelegt. Hochgeladene Dokumente und
          Analyseergebnisse werden{" "}
          <strong className="font-semibold text-white">nicht dauerhaft auf einem Server gespeichert</strong>;
          es wird <strong className="font-semibold text-white">keine Datenbank</strong> betrieben. Dein
          Dokument wird nur <strong className="font-semibold text-white">flüchtig im Arbeitsspeicher</strong>{" "}
          verarbeitet (für die Dauer der Analyse) und danach verworfen. Das Ergebnis verbleibt
          ausschließlich lokal in deinem Browser (Session-Speicher) und verschwindet, sobald du den
          Tab schließt.
        </P>

        <H2>3. Welche Daten verarbeitet werden</H2>
        <H3>a) Hochgeladenes Dokument</H3>
        <P>
          Das von dir hochgeladene Inkasso-/Forderungsschreiben (Bild oder PDF) kann
          personenbezogene Daten enthalten (z. B. Name, Anschrift, Aktenzeichen, Forderungshöhe,
          Gläubiger). Es wird ausschließlich zur Durchführung der Analyse verarbeitet. Bitte lade
          keine Daten besonderer Kategorien (Art. 9 DSGVO, z. B. Gesundheitsdaten) hoch.
        </P>
        <H3>b) Eingaben im Tool</H3>
        <P>
          Angaben aus dem Onboarding (z. B. erstes Schreiben, bereits gezahlter Betrag) sowie
          optionale Absenderdaten für den erzeugten Widerspruch (Name, Anschrift).
        </P>
        <H3>c) Server-Logdaten</H3>
        <P>
          Beim Aufruf fallen beim Hosting-Anbieter technische Daten an (z. B. IP-Adresse, Zeitpunkt,
          aufgerufene Ressource).
        </P>

        <H2>4. Log-Hygiene</H2>
        <P>
          Wir achten bewusst darauf, dass{" "}
          <strong className="font-semibold text-white">keine personenbezogenen Freitexte</strong> in
          Anwendungs-Logs gelangen. Protokolliert werden lediglich anonyme Kennzahlen und technische
          Regel-Kennungen – <strong className="font-semibold text-white">keine Dokumentinhalte, Namen,
          Anschriften oder Aktenzeichen</strong>.
        </P>

        <H2>5. Zwecke und Rechtsgrundlagen</H2>
        <P>
          Die Analyse des hochgeladenen Dokuments erfolgt auf Grundlage deiner{" "}
          <strong className="font-semibold text-white">Einwilligung</strong> (Art. 6 Abs. 1 lit. a
          DSGVO), die du vor dem Upload aktiv erteilst und jederzeit mit Wirkung für die Zukunft
          widerrufen kannst. Der technische Betrieb stützt sich auf unser berechtigtes Interesse an
          einer sicheren, funktionsfähigen Bereitstellung (Art. 6 Abs. 1 lit. f DSGVO). Der{" "}
          <strong className="font-semibold text-white">kostenpflichtige Erwerb des Widerspruchs-PDF</strong>{" "}
          wird zur Vertragserfüllung verarbeitet (Art. 6 Abs. 1 lit. b DSGVO).
        </P>

        <H2>6. Empfänger / Auftragsverarbeiter</H2>
        <P>Zur Erbringung des Dienstes setzen wir Auftragsverarbeiter nach Art. 28 DSGVO ein:</P>
        <H3>a) Anthropic (KI-gestützte Texterkennung, USA)</H3>
        <P>
          Zur Erkennung der Angaben im Dokument wird dieses an Anthropic (Anbieter des KI-Dienstes
          „Claude") übermittelt. Nach Angaben des Anbieters werden API-Inhalte{" "}
          <strong className="font-semibold text-white">nicht zum Training</strong> der Modelle genutzt
          und nur begrenzt aufbewahrt. Grundlage ist ein{" "}
          <a href="https://www.anthropic.com/legal/data-processing-addendum" className={linkCls} target="_blank" rel="noopener">
            Auftragsverarbeitungsvertrag (DPA)
          </a>
          ; weitere Informationen unter{" "}
          <a href="https://www.anthropic.com/legal/privacy" className={linkCls} target="_blank" rel="noopener">
            anthropic.com/legal/privacy
          </a>
          .
        </P>
        <H3>b) Vercel (Hosting, EU/USA)</H3>
        <P>
          Die Anwendung wird bei Vercel betrieben; dabei werden technische Verbindungsdaten
          verarbeitet. Grundlage ist ein{" "}
          <a href="https://vercel.com/legal/dpa" className={linkCls} target="_blank" rel="noopener">
            Auftragsverarbeitungsvertrag (DPA)
          </a>
          ; weitere Informationen unter{" "}
          <a href="https://vercel.com/legal/privacy-policy" className={linkCls} target="_blank" rel="noopener">
            vercel.com/legal/privacy-policy
          </a>
          .
        </P>
        <H3>c) Lemon Squeezy (Zahlungsabwicklung, Merchant of Record)</H3>
        <P>
          Kaufst du das kostenpflichtige Widerspruchs-PDF, wird die Zahlung über Lemon Squeezy
          (Lemon Squeezy, LLC, USA) als „Merchant of Record" abgewickelt. Lemon Squeezy ist insoweit{" "}
          <strong className="font-semibold text-white">eigenverantwortlich</strong> für die
          Zahlungsdaten (z. B. Zahlungsmittel, Rechnungsangaben); <strong className="font-semibold text-white">
          Kartendaten verarbeiten wir nicht</strong>. Wir erhalten lediglich die Information, dass eine
          gültige Lizenz vorliegt. Details:{" "}
          <a href="https://www.lemonsqueezy.com/privacy" className={linkCls} target="_blank" rel="noopener">
            lemonsqueezy.com/privacy
          </a>
          .
        </P>
        <H3>Drittlandübermittlung</H3>
        <P>
          Soweit Daten in die USA übermittelt werden, erfolgt dies auf Grundlage der
          EU-Standardvertragsklauseln (Art. 46 DSGVO), die Bestandteil der genannten
          Auftragsverarbeitungsverträge sind.
        </P>

        <H2>7. Speicherdauer</H2>
        <P>
          Hochgeladene Dokumente werden nicht dauerhaft gespeichert (siehe Ziffer 2). Ergebnisse
          verbleiben nur in deinem Browser. Bei den Auftragsverarbeitern gelten deren jeweilige
          Aufbewahrungsfristen.
        </P>

        <H2>8. Keine belastende automatisierte Entscheidung</H2>
        <P>
          Das Ergebnis ist eine regelbasierte, technische Orientierungshilfe und{" "}
          <strong className="font-semibold text-white">keine Rechtsberatung</strong>. Es entfaltet
          keine rechtliche Wirkung im Sinne von Art. 22 DSGVO; Entscheidungen triffst du selbst.
        </P>

        <H2>8a. Empfehlungen &amp; Partner-Links (Affiliate)</H2>
        <P>
          Im Analyse-Ergebnis und in Blog-Artikeln zeigen wir gelegentlich Empfehlungen zu Angeboten
          Dritter (z. B. Rechtsschutzversicherung, Bonitäts-/SCHUFA-Dienste, Schuldnerberatung).
          Provisions-/Werbepartner sind mit „Anzeige" gekennzeichnet; bei einem Abschluss erhalten wir
          ggf. eine Provision – für dich ohne Mehrkosten. Wir setzen dafür{" "}
          <strong className="font-semibold text-white">kein Tracking und keine Cookies</strong> ein;
          ein Klick öffnet lediglich die Seite des Partners. Für die dortige Datenverarbeitung sind
          die jeweiligen Anbieter selbst verantwortlich.
        </P>

        <H2>9. Deine Rechte</H2>
        <P>
          Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16), Löschung (Art. 17),
          Einschränkung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21) sowie das
          Recht, eine erteilte Einwilligung jederzeit zu widerrufen. Wende dich dazu an{" "}
          <a href="mailto:Igor.bengraf@web.de" className={linkCls}>
            Igor.bengraf@web.de
          </a>
          .
        </P>

        <H2>10. Beschwerderecht bei der Aufsichtsbehörde</H2>
        <P>
          Du hast das Recht, dich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist:
          <br />
          Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen (LDI NRW)
          <br />
          Kavalleriestraße 2–4, 40213 Düsseldorf ·{" "}
          <a href="https://www.ldi.nrw.de" className={linkCls} target="_blank" rel="noopener">
            ldi.nrw.de
          </a>
        </P>

        <H2>11. Änderungen</H2>
        <P>
          Wir passen diese Erklärung an, wenn sich die Verarbeitung ändert. Stand: Juni 2026.
        </P>
      </main>
    </>
  );
}
