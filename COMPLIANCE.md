# Datenschutz & Compliance – Inkasso-Defense

> **Kein Rechtsdokument.** Diese Datei ist eine technische Arbeits- und Übersichtsgrundlage
> für den Betreiber. Vor dem kommerziellen Go-Live einmal von einer datenschutz-/RDG-kundigen
> Stelle prüfen lassen. Stand: laufend pflegen.

Betriebsmodell: **kommerziell / Vorbereitung Business** → durchgehend Profi-Standard.

---

## 1. Welche personenbezogenen Daten verarbeitet werden

| Datum | Herkunft | Sensibilität |
|---|---|---|
| Inkassoschreiben (Bild/PDF): Name, Anschrift, Aktenzeichen, Forderungshöhe, Gläubiger | Upload durch Nutzer | **hoch** (finanzielle Lage) |
| Onboarding-Angaben (erstes Schreiben?, bereits gezahlt?, widersprochen?) | Eingabe Nutzer | mittel |
| Absenderdaten für den Widerspruchs-PDF (Name, Straße, PLZ/Ort) | Eingabe Nutzer | mittel |
| Technische Daten (IP, Request-Logs) | automatisch (Vercel) | niedrig–mittel |

**Keine** besonderen Kategorien (Art. 9 DSGVO) vorgesehen – Nutzer ist anzuweisen, keine
Gesundheits-/o. ä. Daten hochzuladen (Hinweis in Datenschutzerklärung).

---

## 2. Datenfluss

```
Browser ──upload──▶ Vercel Function (/api/analyze) ──Bild/PDF──▶ Anthropic API (Claude, USA)
                                   │
        Ergebnis (JSON) ◀──────────┘
        gespeichert NUR im sessionStorage des Browsers · KEINE Server-Datenbank
PDF-Erstellung (/api/widerspruch-pdf): rein in-memory, keine Speicherung
```

**Privacy by Design (bereits umgesetzt):**
- Keine Datenbank, kein serverseitiges Speichern von Uploads/Ergebnissen.
- Ergebnis nur clientseitig (`sessionStorage`) – verschwindet beim Schließen des Tabs.
- LLM mit `temperature:0`; Logging ohne Dokument-Freitexte (siehe §6).

---

## 3. Rechtsgrundlagen (Art. 6 DSGVO)

- Verarbeitung des Uploads zur Analyse: **Einwilligung** (Art. 6 Abs. 1 lit. a) – aktiv vor dem
  Upload einzuholen (Checkbox), **oder** Vertragserfüllung (lit. b), wenn als Dienst angeboten.
- Technische Logs/Betrieb: berechtigtes Interesse (lit. f).

---

## 4. Auftragsverarbeiter (Art. 28) + Drittlandtransfer (Art. 44 ff.)

Mit **beiden** Dienstleistern ist ein **AVV/DPA** abzuschließen; der USA-Transfer wird über die
**EU-Standardvertragsklauseln (SCC)** in den jeweiligen DPAs abgesichert.

### Anthropic (Claude API – OCR/Faktenextraktion)
- DPA / Data Processing Addendum: https://www.anthropic.com/legal/data-processing-addendum
- Datenschutzerklärung: https://www.anthropic.com/legal/privacy
- Commercial Terms: https://www.anthropic.com/legal/commercial-terms
- Trust Center / Subprozessoren / Zertifizierungen: https://trust.anthropic.com
- **Wichtig (verifizieren):** API-Eingaben/-Ausgaben werden **nicht** zum Modelltraining genutzt;
  begrenzte Aufbewahrung (Standard i. d. R. bis zu 30 Tage zu Missbrauchszwecken). Für
  „Zero Data Retention" ggf. gesondert anfragen.

### Vercel (Hosting / Serverless Functions)
- DPA: https://vercel.com/legal/dpa
- Subprozessoren: https://vercel.com/legal/subprocessors
- Datenschutzerklärung: https://vercel.com/legal/privacy-policy
- **Region:** Function-Region möglichst **EU (z. B. fra1, Frankfurt)** setzen, damit die
  Verarbeitung in der EU stattfindet (siehe §6).

> ☐ TODO Betreiber: Anthropic-DPA abschließen ☐ Vercel-DPA abschließen ☐ Region fra1 setzen

---

## 5. Aufbewahrung / Löschung

| Ort | Aufbewahrung |
|---|---|
| Upload (Bild/PDF) | nur transient im Function-Speicher, keine Persistenz |
| Ergebnis | nur `sessionStorage` (Client), kein Server-Speicher |
| Anthropic | gemäß deren Richtlinie (bis ~30 Tage, verifizieren) |
| Vercel-Logs | gemäß Vercel-Retention; Logs ohne Dokument-Freitexte halten |

---

## 6. Technische & organisatorische Maßnahmen (TOM, Art. 32)

- ✅ Kein Datenbank-Layer (Datenminimierung).
- ✅ **Log-Hygiene**: `/api/analyze` loggt nur Rule-IDs/Kennzahlen, **keine** Dokument-Freitexte,
  Namen oder Adressen.
- ☐ **Vercel-Region EU** (`fra1`) per Route-Config/Projekt-Einstellung.
- ✅ Übertragung ausschließlich via HTTPS/TLS.
- ☐ Upload-Begrenzung (Größe/Format) – bereits validiert, regelmäßig prüfen.
- ☐ Zugriff auf Vercel/Anthropic-Konten mit 2FA, minimale Berechtigungen.

---

## 7. Pflicht-Artefakte (Checkliste)

- ☐ **Datenschutzerklärung** (`/datenschutz`) – Art. 13 (in Arbeit)
- ☐ **Impressum** (`/impressum`) – § 5 DDG (in Arbeit)
- ✅ **Einwilligung vor Upload** (Checkbox + Link) – technisch umgesetzt
- ☐ **AVV** mit Anthropic & Vercel (siehe §4)
- ☐ **Verzeichnis von Verarbeitungstätigkeiten** (Art. 30), sofern erforderlich
- ☐ **DSFA / DPIA** (Art. 35) prüfen – sensible Finanzdaten + automatisierte Bewertung
- ☐ **Cookie-/Consent-Banner** – nur falls Analytics/Tracking aktiviert wird (aktuell keins)
- ✅ **RDG-Disclaimer** in App + jedem Blogartikel („keine Rechtsberatung")

---

## 8. Offene Aufgaben des Betreibers (nicht im Code lösbar)

1. AVV/DPA mit Anthropic und Vercel abschließen (Links in §4).
2. Datenschutzerklärung & Impressum mit echten Firmendaten füllen (Platzhalter ersetzen).
3. Vercel-Region auf `fra1` stellen und im Dashboard verifizieren.
4. Datenschutz-/RDG-Erstprüfung durch fachkundige Stelle.
5. Entscheiden: Einwilligung vs. Vertrag als Rechtsgrundlage (Geschäftsmodell).
