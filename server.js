/**
 * Inkasso-Defense – lokaler Entwicklungs-Server (Express).
 * In Produktion (Vercel) übernehmen die Serverless-Functions in /api die API;
 * die eigentliche Analyse-Logik liegt geteilt in lib/analyze.js.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const multer = require('multer');
const { MODEL, AnalyzeError, analyzeFile } = require('./lib/analyze');

const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠️  ANTHROPIC_API_KEY ist nicht gesetzt – /api/analyze wird fehlschlagen.');
}

// multer: alles im RAM (keine Datei landet auf Platte)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.post('/api/analyze', (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      const msg = uploadErr.code === 'LIMIT_FILE_SIZE' ? 'Die Datei ist zu groß (max. 10 MB).' : uploadErr.message;
      return res.status(400).json({ error: msg });
    }
    if (!req.file) return res.status(400).json({ error: 'Keine Datei hochgeladen. Erwartet wird das Feld "file".' });

    try {
      const result = await analyzeFile(req.file.buffer, req.file.mimetype);
      return res.json(result);
    } catch (err) {
      const status = err instanceof AnalyzeError ? err.httpStatus : 500;
      if (!(err instanceof AnalyzeError)) console.error('analyze error:', err);
      return res.status(status).json({ error: err.message || 'Bei der Analyse ist ein Fehler aufgetreten.' });
    }
  });
});

app.listen(PORT, () => console.log(`✅ Inkasso-Defense läuft auf http://localhost:${PORT}`));
