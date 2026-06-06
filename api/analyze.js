// Vercel Serverless Function: POST /api/analyze
// Multipart-Parsing via busboy (multer ist Express-Middleware), dann gemeinsame Analyse-Logik.
const Busboy = require('busboy');
const { analyzeFile, AnalyzeError } = require('../lib/analyze');

const MAX_BYTES = 10 * 1024 * 1024;

function parseUpload(req) {
  return new Promise((resolve, reject) => {
    const ct = req.headers['content-type'] || '';
    if (!ct.includes('multipart/form-data')) {
      resolve({ buffer: null, mimetype: null, tooLarge: false });
      return;
    }
    const bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_BYTES, files: 1 } });
    let buffer = null;
    let mimetype = null;
    let tooLarge = false;

    bb.on('file', (_name, stream, info) => {
      mimetype = info.mimeType;
      const chunks = [];
      stream.on('data', (d) => chunks.push(d));
      stream.on('limit', () => { tooLarge = true; stream.resume(); });
      stream.on('end', () => { buffer = Buffer.concat(chunks); });
    });
    bb.on('error', reject);
    bb.on('close', () => resolve({ buffer, mimetype, tooLarge }));
    req.pipe(bb);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  try {
    const { buffer, mimetype, tooLarge } = await parseUpload(req);
    if (tooLarge) {
      res.status(400).json({ error: 'Die Datei ist zu groß (max. 10 MB).' });
      return;
    }
    const result = await analyzeFile(buffer, mimetype);
    res.status(200).json(result);
  } catch (err) {
    const status = err instanceof AnalyzeError ? err.httpStatus : 500;
    if (!(err instanceof AnalyzeError)) console.error('analyze error:', err);
    res.status(status).json({ error: err.message || 'Bei der Analyse ist ein Fehler aufgetreten.' });
  }
};
