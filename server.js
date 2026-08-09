const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');

const PORT = Number(process.env.PORT || 4173);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, 'public');
const STATE = path.join(ROOT, 'data', 'state.json');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml'
};

function respond(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2_000_000) throw new Error('Payload too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function validState(value) {
  return value && typeof value === 'object' &&
    Array.isArray(value.projects) && Array.isArray(value.tasks) &&
    Array.isArray(value.pipeline) && value.company;
}

async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/state' && req.method === 'GET') {
      return respond(res, 200, await fs.readFile(STATE, 'utf8'));
    }
    if (url.pathname === '/api/state' && req.method === 'PUT') {
      const state = await readBody(req);
      if (!validState(state)) return respond(res, 400, JSON.stringify({ error: 'Invalid state shape' }));
      state.updatedAt = new Date().toISOString();
      const temporary = `${STATE}.tmp`;
      await fs.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`);
      await fs.rename(temporary, STATE);
      return respond(res, 200, JSON.stringify({ ok: true, updatedAt: state.updatedAt }));
    }

    const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.resolve(PUBLIC, relative);
    if (!file.startsWith(`${PUBLIC}${path.sep}`)) return respond(res, 403, 'Forbidden', 'text/plain');
    const body = await fs.readFile(file);
    return respond(res, 200, body, MIME[path.extname(file)] || 'application/octet-stream');
  } catch (error) {
    if (error.code === 'ENOENT') return respond(res, 404, 'Not found', 'text/plain');
    console.error(error);
    return respond(res, 500, JSON.stringify({ error: error.message }));
  }
}

if (require.main === module) {
  http.createServer(handler).listen(PORT, '127.0.0.1', () => {
    console.log(`Neo Labs OS running at http://localhost:${PORT}`);
  });
}

module.exports = handler;
