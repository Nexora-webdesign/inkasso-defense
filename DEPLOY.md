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
- **Function-Timeout:** `api/analyze.js` ist in `vercel.json` auf `maxDuration: 60` gesetzt (Hobby-Plan-Maximum). Claude-Vision-Analysen liegen typisch darunter. Bei Bedarf (Pro-Plan) erhöhbar.
- **Kosten/Tokens:** Jede Analyse ruft die Anthropic-API mit `claude-opus-4-8` (Vision + adaptive Thinking, Effort `high`). Für günstigere Läufe `effort` in `lib/analyze.js` auf `medium` senken.
- **`public/styles.css`** ist generiert (gitignored) und wird im Vercel-Build erzeugt – nie direkt editieren, sondern `src/input.css` / `tailwind.config.js`.

---

## PWA – „Zum Home-Bildschirm hinzufügen"

Die App ist installierbar (Manifest + Service Worker + Icons, Dark-Theme `#0b0f19`):

- **Android (Chrome):** Menü ⋮ → *App installieren* bzw. *Zum Startbildschirm hinzufügen* (oder automatischer Banner).
- **iOS (Safari):** Teilen-Symbol → *Zum Home-Bildschirm*.

Nach der Installation startet sie im Standalone-Modus (ohne Browser-Leiste) wie eine native App.
