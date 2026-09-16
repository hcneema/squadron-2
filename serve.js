const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const SCHEDULER_HOST = 'scheduler.squadron2.com';
const SCHEDULER_ORIGIN = `https://${SCHEDULER_HOST}`;
const PROXY_PATH = '/proxy';
const ROOT = path.join(__dirname, 'pwa');

const MIME = {
  '.html': 'text/html', '.css': 'text/css',
  '.js': 'application/javascript', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

// ── Session store ──
// browser gets a sq2sid cookie (our domain) → maps to scheduler cookies
// sessions are persisted to disk so logins survive server restarts
const SESSIONS_FILE = path.join(__dirname, '.sessions.json');

function loadSessions() {
  try { return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8')); } catch { return {}; }
}

function saveSessions() {
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

const sessions = loadSessions();

function parseCookies(str = '') {
  const out = {};
  str.split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

function getSessionId(req, res) {
  const cookies = parseCookies(req.headers['cookie']);
  let sid = cookies['sq2sid'];
  if (!sid || !sessions[sid]) {
    sid = crypto.randomUUID();
    sessions[sid] = {};
    res.setHeader('Set-Cookie', `sq2sid=${sid}; Path=/; HttpOnly; SameSite=Lax`);
    console.log(`New session: ${sid}`);
  }
  return sid;
}

function buildCookieHeader(sid) {
  return Object.entries(sessions[sid] || {})
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function storeSetCookies(sid, setCookieHeaders) {
  if (!setCookieHeaders) return;
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  list.forEach(h => {
    const pair = h.split(';')[0].trim();
    const i = pair.indexOf('=');
    if (i > 0) {
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      sessions[sid][k] = v;
      console.log(`  Cookie stored [${sid.slice(0,8)}]: ${k}=${v.slice(0,20)}...`);
    }
  });
  saveSessions();
}

// ── HTML rewriter ──
function rewriteHtml(html) {
  return html
    .replace(/https?:\/\/scheduler\.squadron2\.com/g, PROXY_PATH)
    .replace(/(href|action|src)="\//g, `$1="${PROXY_PATH}/`)
    .replace(/(href|action|src)='\//g, `$1='${PROXY_PATH}/`);
}

function rewriteLocation(loc) {
  if (!loc) return loc;
  return loc
    .replace(SCHEDULER_ORIGIN, PROXY_PATH)
    .replace(/^\/(?!proxy)/, `${PROXY_PATH}/`);
}

// ── Proxy handler ──
function proxyRequest(clientReq, clientRes) {
  const sid = getSessionId(clientReq, clientRes);
  const targetPath = clientReq.url.slice(PROXY_PATH.length) || '/';

  console.log(`PROXY [${sid.slice(0,8)}] ${clientReq.method} ${targetPath}`);
  console.log(`  Cookies: ${buildCookieHeader(sid).slice(0, 80) || '(none)'}`);

  const reqHeaders = {
    'host': SCHEDULER_HOST,
    'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    'accept': clientReq.headers['accept'] || 'text/html,*/*',
    'accept-language': 'en-US,en;q=0.9',
    'cookie': buildCookieHeader(sid),
    'referer': `${SCHEDULER_ORIGIN}/`,
  };

  // only add body headers for POST/PUT
  if (['POST', 'PUT'].includes(clientReq.method)) {
    if (clientReq.headers['content-type'])   reqHeaders['content-type']   = clientReq.headers['content-type'];
    if (clientReq.headers['content-length']) reqHeaders['content-length'] = clientReq.headers['content-length'];
  }

  const options = {
    hostname: SCHEDULER_HOST,
    port: 443,
    path: targetPath,
    method: clientReq.method,
    headers: reqHeaders,
    rejectUnauthorized: false, // allow self-signed / custom CA certs
  };

  const proxyReq = https.request(options, proxyRes => {
    storeSetCookies(sid, proxyRes.headers['set-cookie']);

    const resHeaders = {};
    // copy safe headers
    ['content-type', 'cache-control', 'expires'].forEach(h => {
      if (proxyRes.headers[h]) resHeaders[h] = proxyRes.headers[h];
    });

    const loc = rewriteLocation(proxyRes.headers['location']);
    if (loc) resHeaders['location'] = loc;

    const contentType = proxyRes.headers['content-type'] || '';
    console.log(`  → ${proxyRes.statusCode} ${contentType.split(';')[0]}`);

    if (contentType.includes('text/html')) {
      let body = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', c => body += c);
      proxyRes.on('end', () => {
        const out = rewriteHtml(body);
        resHeaders['content-type'] = 'text/html; charset=utf-8';
        resHeaders['content-length'] = Buffer.byteLength(out);
        clientRes.writeHead(proxyRes.statusCode, resHeaders);
        clientRes.end(out);
      });
    } else {
      clientRes.writeHead(proxyRes.statusCode, resHeaders);
      proxyRes.pipe(clientRes);
    }
  });

  proxyReq.on('error', err => {
    console.error('Proxy error:', err.message);
    clientRes.writeHead(502);
    clientRes.end('Proxy error: ' + err.message);
  });

  if (['POST', 'PUT'].includes(clientReq.method)) {
    clientReq.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

// ── Static file handler ──
function serveStatic(req, res) {
  const urlPath = req.url.split('?')[0]; // strip query string
  const filePath = path.join(ROOT, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, {
    'Content-Type': MIME[path.extname(filePath)] || 'text/plain',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
}

// ── Server ──
http.createServer((req, res) => {
  if (req.url.startsWith(PROXY_PATH)) {
    proxyRequest(req, res);
  } else {
    serveStatic(req, res);
  }
}).listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log('\nSquadron 2 PWA running at:');
  console.log('  Local:   http://localhost:3000');
  for (const iface of Object.values(os.networkInterfaces()).flat()) {
    if (iface.family === 'IPv4' && !iface.internal)
      console.log(`  Network: http://${iface.address}:3000`);
  }
  console.log('\nProxy logs will appear here as requests come in.\n');
});
