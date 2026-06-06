// Vercel Serverless Function: GET /api/health
const { MODEL } = require('../lib/analyze');

module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    model: MODEL,
    keyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  });
};
