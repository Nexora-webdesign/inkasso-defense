# Inkasso-Defense – Deployment-Leitfaden

## Architektur

| Teil | Lokal (Entwicklung) | Produktion (Vercel) |
|---|---|---|
| Frontend (`public/`) | Express liefert statisch aus | Vercel-CDN (statisch) |
| API `/api/analyze`, `/api/health` | Express-Routen in `server.js` | Serverless Functions in `api/*.js` |
| Analyse-Logik | `lib/analyze.js` (geteilt) | `lib/analyze.js` (geteilt) |
| CSS | `npm run build:css` → `public/styles.css` | `buildCommand` aus `vercel.json` |

`server.js` ist nur für die lokale Entwicklung. In Produktion übernehmen die Functions in `api/` – beide nutzen dieselbe `lib/analyze.js`.

---

## Lokale Entwicklung

```bash
npm install
# .env anlegen (siehe unten) mit ANTHROPIC_API_KEY
npm run build:css        # einmalig, oder: npm run watch:css (separat laufen lassen)
npm start                # baut CSS via prestart und startet http://localhost:3000
```

`.env` (lokal, wird **nicht** committet – steht in `.gitignore`):

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
```

---

## Deployment auf Vercel

### A) Über GitHub (empfohlen)

1. **Repo pushen**
   ```bash
   git remote add origin https://github.com/<user>/inkasso-defense.git
   git push -u origin main
   ```
2. **In Vercel importieren**: vercel.com → *Add New… → Project* → GitHub-Repo wählen.
   - Framework Preset: **Other** (wird durch `vercel.json` korrekt gesetzt).
   - Build & Output werden aus `vercel.json` übernommen (Build: `npm run build:css`, Output: `public`).
3. **Environment Variable setzen**: *Project → Settings → Environment Variables*
   - `ANTHROPIC_API_KEY` = dein Key → für **Production** (und **Preview**) hinzufügen.
4. **Deploy** klicken. Fertig – die App läuft unter `https://<projekt>.vercel.app`.

### B) Über die Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link                       # Projekt anlegen/verknüpfen
vercel env add ANTHROPIC_API_KEY  # Wert eingeben, Scope Production (+ Preview)
vercel --prod                     # Production-Deploy
```

---

## Wichtige Hinweise

- **Request-Limit (4,5 MB):** Serverless Functions auf Vercel akzeptieren max. ~4,5 MB Request-Body. Das Frontend verkleinert Foto-Uploads daher automatisch (längste Kante 2000 px, JPEG) – Handy-Fotos bleiben sicher darunter. Sehr große PDFs ggf. vorher komprimieren.
- **Function-Timeout / Fluid Compute (wichtig!):** Aktiviere **Fluid Compute** unter *Project → Settings → Functions* – damit erlaubt der Hobby-Plan bis **300 s** Laufzeit (sonst nur 10 s Default / 60 s Max). `vercel.json` setzt zusätzlich `maxDuration: 60` für `api/analyze.js`. Ohne diese Einstellung läuft die Analyse ins 10-s-Timeout.
- **Modell & Tempo:** Standardmodell ist das schnelle **`claude-haiku-4-5`** (Vision + Structured Outputs), Thinking aus, knappe Ausgabe → typ. ~10–15 s (im Warmbetrieb schneller, da das JSON-Schema 24 h gecacht wird). Über die Env-Var **`ANALYZE_MODEL`** (z. B. `claude-sonnet-4-6` oder `claude-opus-4-8`) auf mehr juristische Tiefe umstellbar – dann ggf. Fluid Compute zwingend nötig.
- **Kosten/Tokens:** Jede Analyse ist ein Anthropic-API-Call (Vision). Haiku ist am günstigsten/schnellsten.
- **`public/styles.css`** ist generiert (gitignored) und wird im Vercel-Build erzeugt – nie direkt editieren, sondern `src/input.css` / `tailwind.config.js`.

---

## PWA – „Zum Home-Bildschirm hinzufügen"

Die App ist installierbar (Manifest + Service Worker + Icons, Dark-Theme `#0b0f19`):

- **Android (Chrome):** Menü ⋮ → *App installieren* bzw. *Zum Startbildschirm hinzufügen* (oder automatischer Banner).
- **iOS (Safari):** Teilen-Symbol → *Zum Home-Bildschirm*.

Nach der Installation startet sie im Standalone-Modus (ohne Browser-Leiste) wie eine native App.
