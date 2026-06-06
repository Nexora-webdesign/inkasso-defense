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

## „geprueft"-Gate (anwaltliche Freigabe)

Jede Regel in `lib/rules.ts` trägt ein Flag `geprueft`. Über `RULES_REQUIRE_APPROVAL` steuert die Route, ob nur freigegebene Regeln angewendet werden:

- **Produktion (Vercel): `RULES_REQUIRE_APPROVAL` NICHT auf `false` setzen** (am besten gar nicht setzen → Default = Gate aktiv). Solange alle Regeln in `rules.ts` `geprueft:false` sind, zeigt die Produktion bewusst **KEINE Kürzungen**.
- **Lokal:** `RULES_REQUIRE_APPROVAL=false` in `.env.local` schaltet das Gate aus, sodass auch ungeprüfte Regeln getestet werden können.

Erst nach anwaltlicher Freigabe wird die jeweilige Regel in `lib/rules.ts` auf `geprueft:true` gesetzt – ab dann greift sie auch in Produktion. Greift eine noch ungeprüfte Regel auf einen Posten, blendet die App den Hinweis „Eine mögliche Kürzung wartet noch auf anwaltliche Freigabe." ein.

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
