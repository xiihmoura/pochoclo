// Função serverless (Vercel) que guarda os dados do ERP POCHOCLO na nuvem.
// Banco: Upstash Redis (Vercel Marketplace) via REST, sem dependências npm.
// Variáveis de ambiente: APP_PASSWORD + (UPSTASH_REDIS_REST_URL/TOKEN ou KV_REST_API_URL/TOKEN)
const crypto = require('crypto');

const REST_URL = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
const PASSWORD = process.env.APP_PASSWORD;
const DB_KEY = 'pochoclo:db';
const REV_KEY = 'pochoclo:rev';

// Grava só se a revisão enviada for igual à atual (evita um aparelho apagar o trabalho do outro).
const LUA =
  "local r=tonumber(redis.call('GET',KEYS[2]) or '0') " +
  "if r==tonumber(ARGV[1]) then redis.call('SET',KEYS[1],ARGV[2]) redis.call('SET',KEYS[2],r+1) return r+1 " +
  "else return -1 end";

async function redis(cmd) {
  const r = await fetch(REST_URL, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REST_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function sameSecret(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function readAll() {
  const [d, r] = await Promise.all([redis(['GET', DB_KEY]), redis(['GET', REV_KEY])]);
  return { rev: Number(r) || 0, data: d ? JSON.parse(d) : null };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!REST_URL || !REST_TOKEN || !PASSWORD) return res.status(503).json({ error: 'not_configured' });
  if (!sameSecret(req.headers['x-app-key'] || '', PASSWORD)) return res.status(401).json({ error: 'unauthorized' });
  try {
    if (req.method === 'GET') return res.status(200).json(await readAll());
    if (req.method === 'PUT') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (!body || typeof body.data !== 'object' || body.data === null) return res.status(400).json({ error: 'bad_request' });
      const out = await redis(['EVAL', LUA, '2', DB_KEY, REV_KEY, String(Number(body.rev) || 0), JSON.stringify(body.data)]);
      if (out === -1) return res.status(409).json(await readAll());
      return res.status(200).json({ rev: out });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'method_not_allowed' });
  } catch (e) {
    return res.status(500).json({ error: 'server_error' });
  }
};
