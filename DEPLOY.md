# Inkasso-Defense – Deployment-Leitfaden (Next.js)

## Architektur

| Teil | Lokal (Entwicklung) | Produktion (Vercel) |
|---|---|---|
| Frontend | statisch in `public/` (HTML + Tailwind-Build + Vanilla-JS), von Next ausgeliefert | Vercel-CDN (statisch) |
| API `/api/analyze`, `/api/health` | Next.js Route Handlers (`app/api/**/route.ts`) | Serverless Functions (Next.js) |
| Faktenextraktion | `lib/facts.ts` (Schema + Prompt; KI liefert NUR Fakten) | dito |
| Juristische Wertung | `lib/rule-engine.ts` + `lib/rules.ts` (deterministisch, Cent-Mathematik, Audit) | dito |
| Golden-Suite (CI-Gate) | `golden/` via `npm test` (vitest) | – |
| CSS | `npm run build:css` → `public/styles.css` | im `buildCommand` enthalten |

Die API liefert IMMER eine stabile Hülle: `{ ok: true, data }` oder `{ ok: false, error }`. `"/"` wird per `next.config.js`-Rewrite auf `public/index.html` gemappt.

---

## Lokale Entwicklung

```bash
npm install
# .env mit ANTHROPIC_API_KEY (Next lädt .env automatisch)
npm run build:css        # einmalig, oder parallel: npm run watch:css
npm run dev              # Next.js Dev-Server auf http://localhost:3000
```

Produktions-Build lokal testen:
```bash
npm run build            # build:css + next build
npm start                # next start
```

`.env` (lokal, gitignored):
```
ANTHROPIC_API_KEY=sk-ant-...
# optional: ANALYZE_MODEL=claude-sonnet-4-6   (Default: claude-haiku-4-5)
```

---

## Deployment auf Vercel

### Wichtig nach der Migration zu Next.js
Das Projekt war zuvor als statische Site eingerichtet. Stelle in Vercel sicher:
- **Settings → General → Framework Preset = Next.js** (wird durch `vercel.json` `"framework": "nextjs"` erzwungen, aber zur Sicherheit prüfen).
- **Output Directory** NICHT auf `public` überschrieben lassen (Next nutzt `.next`). Override ggf. entfernen.
- **Settings → Functions → Fluid Compute = ON** (empfohlen; erlaubt bis 300 s). Die Route setzt zusätzlich `maxDuration = 60`.

### Ablauf
1. Push nach `main` (GitHub-Integration deployt automatisch) – oder Dashboard → Redeploy.
2. **Environment Variable** `ANTHROPIC_API_KEY` muss gesetzt sein (Production + Preview). Optional `ANALYZE_MODEL`.
3. Build läuft via `vercel.json` → `npm run build:css && next build`.

### Verifizieren
- `https://<projekt>.vercel.app/api/health` → `{ "ok": true, "model": "claude-haiku-4-5", "keyConfigured": true }`
- App öffnen, Foto/PDF hochladen → Analyse landet im Dark-Dashboard.

---

## Informations-Modus & `geprueft`-Kennzeichnung

Jede Regel in `lib/rules.ts` trägt ein Flag `geprueft`. Die App läuft als **Orientierungshilfe im Informations-Modus**:

- **Alle Regeln berechnen das Ergebnis** – auch noch nicht anwaltlich freigegebene (`geprueft:false`). Der Nutzer sieht die *potenzielle* Ersparnis.
- Stammt eine Kürzung aus einer ungeprüften Regel, erscheint der Hinweis „Eine mögliche Kürzung wartet noch auf anwaltliche Freigabe." und das Audit weist `ungepruefteErsparnis` aus.
- Das Dashboard-Badge ist dynamisch: **„Anwaltlich geprüft"** nur, wenn alle angewendeten Regeln `geprueft:true` sind, sonst **„Regelbasierte Analyse"**.
- Abgesichert wird über Haftungsausschluss + Warnhinweis (keine Rechtsberatung, RDG) – nicht über das Unterdrücken der Anzeige.

> Hinweis: Die frühere Env **`RULES_REQUIRE_APPROVAL` ist obsolet** und wird nicht mehr ausgewertet. Sie kann in Vercel/`.env.local` entfernt werden.

---

## Hinweise

- **Modell & Tempo:** Default `claude-haiku-4-5` (~10–15 s, im Warmbetrieb schneller dank 24-h-Schema-Cache). Über Env **`ANALYZE_MODEL`** auf `claude-sonnet-4-6` (≈30–45 s) oder `claude-opus-4-8` umstellbar – dann ist **Fluid Compute Pflicht**.
- **Upload-Limit:** Serverless-Body ~4,5 MB; das Frontend skaliert Fotos clientseitig herunter. Sehr große PDFs ggf. vorher komprimieren.
- **`public/styles.css`** ist generiert (gitignored) und wird im Build erzeugt – nie direkt editieren, sondern `src/input.css` / `tailwind.config.js`.

---

## PWA – „Zum Home-Bildschirm hinzufügen"
Installierbar via `public/manifest.webmanifest` + `public/sw.js` + Icons (`public/icons/`), Dark-Theme `#0b0f19`.
- **Android (Chrome):** Menü ⋮ → *App installieren*.
- **iOS (Safari):** Teilen → *Zum Home-Bildschirm*.
