// Puente local entre el tutorial (navegador) y tu MongoDB real.
// Sin dependencias: sirve la web y controla sesiones de `mongosh` (una por pestaña de terminal).
//
// Uso:
//   node server.js            arranca y abre el navegador
//   node server.js --check    diagnostica tu instalación y sale
//   node server.js --no-open  arranca sin abrir el navegador
//   node server.js --port 4000
//
// Variables de entorno opcionales (tienen prioridad sobre config.json):
//   MQL_URI, MQL_DB, MQL_COLLECTION, MONGOSH_PATH, PORT
'use strict';

const [NODE_MAJOR] = process.versions.node.split('.').map(Number);
if (NODE_MAJOR < 16) {
  console.error('\n  Necesitas Node.js 16 o superior (tienes ' + process.version + '). Descárgalo en https://nodejs.org\n');
  process.exit(1);
}

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const ROOT = __dirname;
const IS_WIN = process.platform === 'win32';
const ARGS = process.argv.slice(2);
const flag = (f) => ARGS.includes(f);
const flagVal = (f) => { const i = ARGS.indexOf(f); return i >= 0 ? ARGS[i + 1] : undefined; };

// ---------------------------------------------------------------- configuración
let fileCfg = {};
try { fileCfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8')); } catch (e) { /* sin config: todo automático */ }
const auto = (v) => v === undefined || v === null || v === '' || v === 'auto';
const CFG = {
  port: +(flagVal('--port') || process.env.PORT || fileCfg.port || 3000),
  mongoUri: process.env.MQL_URI || fileCfg.mongoUri || 'mongodb://127.0.0.1:27017',
  database: process.env.MQL_DB || (auto(fileCfg.database) ? null : fileCfg.database),
  collection: process.env.MQL_COLLECTION || (auto(fileCfg.collection) ? null : fileCfg.collection),
  sandboxDatabase: fileCfg.sandboxDatabase || 'mql_tutorial',
  mongosh: process.env.MONGOSH_PATH || (auto(fileCfg.mongosh) ? null : fileCfg.mongosh),
  timeout: (fileCfg.commandTimeoutSeconds || 30) * 1000,
  maxValidationDocs: fileCfg.maxValidationDocs || 3000
};
const MAX_OUT = 400 * 1024;
const PROMPT = '<<MQLP>> ';

// Estado del entorno detectado (se rellena en detect())
const ENV = { mongosh: null, mongoshVersion: null, serverVersion: null, db: CFG.database, coll: CFG.collection, count: null, problem: null, message: null, candidates: [] };

// ---------------------------------------------------------------- localizar mongosh
function mongoshCandidates() {
  const exe = IS_WIN ? 'mongosh.exe' : 'mongosh';
  const list = [];
  if (CFG.mongosh) list.push(CFG.mongosh);
  // PATH
  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    if (!dir) continue;
    list.push(path.join(dir, exe));
    if (IS_WIN) list.push(path.join(dir, 'mongosh.cmd'));
  }
  const home = os.homedir();
  if (IS_WIN) {
    const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)'], process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Programs')].filter(Boolean);
    for (const base of pf) {
      list.push(path.join(base, 'mongosh', 'mongosh.exe'));
      for (const d of safeDirs(path.join(base, 'MongoDB'))) list.push(path.join(base, 'MongoDB', d, 'bin', 'mongosh.exe'));
    }
  } else {
    list.push('/opt/homebrew/bin/mongosh', '/usr/local/bin/mongosh', '/usr/bin/mongosh', '/snap/bin/mongosh', path.join(home, '.local/bin/mongosh'));
  }
  // descargas descomprimidas a mano (p. ej. ~/Downloads/mongosh-2.x/bin/mongosh)
  for (const base of [path.join(home, 'Downloads'), path.join(home, 'Descargas'), path.join(home, 'Downloads', 'bin'), path.join(home, 'Applications'), path.join(home, 'bin')]) {
    for (const d of safeDirs(base)) if (/mongosh/i.test(d)) list.push(path.join(base, d, 'bin', exe));
  }
  return [...new Set(list)];
}
function safeDirs(dir) { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch (e) { return []; } }
const needsShell = (p) => IS_WIN && /\.(cmd|bat)$/i.test(p);

function findMongosh() {
  for (const p of mongoshCandidates()) {
    if (p !== 'mongosh' && !fs.existsSync(p)) continue;
    const r = spawnSync(p, ['--version'], { encoding: 'utf8', shell: needsShell(p), windowsHide: true, timeout: 15000 });
    if (r.status === 0 && /\d+\.\d+/.test(r.stdout)) return { path: p, version: r.stdout.trim().split(/\s+/)[0] };
  }
  return null;
}

// Ejecuta un script corto con mongosh y devuelve su salida (para diagnóstico/detección)
function mongoshEval(script, timeoutMs = 20000) {
  const r = spawnSync(ENV.mongosh, ['--quiet', '--norc', CFG.mongoUri, '--eval', script], { encoding: 'utf8', shell: needsShell(ENV.mongosh), windowsHide: true, timeout: timeoutMs });
  return { ok: r.status === 0, out: (r.stdout || '').trim(), err: ((r.stderr || '') + (r.error ? r.error.message : '')).trim() };
}

// ---------------------------------------------------------------- detección del entorno
const IMPORT_HINT = 'mongoimport --db demo --collection facturas --file demo/demo-data.json';
function detect() {
  ENV.problem = null; ENV.message = null;
  if (!ENV.mongosh) {
    const m = findMongosh();
    if (!m) { ENV.problem = 'nomongosh'; ENV.message = 'No encuentro <code>mongosh</code>. Instálalo (https://www.mongodb.com/try/download/shell) o indica su ruta en <code>config.json</code> → <code>"mongosh"</code> (o en la variable <code>MONGOSH_PATH</code>).'; return ENV; }
    ENV.mongosh = m.path; ENV.mongoshVersion = m.version;
  }
  // Busca colecciones con la forma del dataset (Client + contract + billing)
  const script = `
    const skip = ['admin','config','local', ${JSON.stringify(CFG.sandboxDatabase)}];
    const out = { version: db.version(), found: [] };
    for (const d of db.adminCommand({ listDatabases: 1, nameOnly: true }).databases) {
      if (skip.includes(d.name)) continue;
      const sdb = db.getSiblingDB(d.name);
      for (const c of sdb.getCollectionInfos({ type: 'collection' }, { nameOnly: true })) {
        if (c.name.startsWith('system.')) continue;
        const one = sdb.getCollection(c.name).findOne({ Client: { $exists: true }, contract: { $exists: true }, billing: { $exists: true } }, { _id: 1 });
        if (one) out.found.push({ db: d.name, coll: c.name, count: sdb.getCollection(c.name).estimatedDocumentCount() });
      }
    }
    print(JSON.stringify(out));`;
  const r = mongoshEval(script.replace(/\n\s*/g, ' '));
  if (!r.ok) {
    ENV.problem = 'noconn';
    ENV.message = 'mongosh no puede conectar con <code>' + CFG.mongoUri + '</code>. ¿Está arrancado el servidor <code>mongod</code>? (Detalle: ' + escHtml(r.err.split('\n')[0].slice(0, 160)) + ')';
    return ENV;
  }
  let info; try { info = JSON.parse(r.out.split('\n').pop()); } catch (e) { info = { found: [] }; }
  ENV.serverVersion = info.version; ENV.candidates = info.found;
  if (CFG.database && CFG.collection) {
    const hit = info.found.find((x) => x.db === CFG.database && x.coll === CFG.collection);
    ENV.db = CFG.database; ENV.coll = CFG.collection; ENV.count = hit ? hit.count : 0;
    if (!hit) { ENV.problem = 'nodata'; ENV.message = 'La collection configurada <code>' + CFG.database + '.' + CFG.collection + '</code> no existe o no tiene el formato del dataset.' + suggest(info.found); }
    return ENV;
  }
  const pool = info.found.filter((x) => (!CFG.database || x.db === CFG.database) && (!CFG.collection || x.coll === CFG.collection));
  pool.sort((a, b) => b.count - a.count);
  if (!pool.length) {
    ENV.problem = 'nodata';
    ENV.message = info.found.length
      ? 'No encuentro el dataset en la database/collection indicada.' + suggest(info.found)
      : 'MongoDB funciona, pero no encuentro ninguna collection con facturas (campos <code>Client</code>, <code>contract</code> y <code>billing</code>). Importa tus datos o genera los de demostración (<code>node demo/generate-demo-data.mjs</code>) y cárgalos:<br><code>' + IMPORT_HINT + '</code>';
    return ENV;
  }
  ENV.db = pool[0].db; ENV.coll = pool[0].coll; ENV.count = pool[0].count;
  return ENV;
}
function suggest(found) { return found.length ? ' Encontrado en: ' + found.map((x) => '<code>' + x.db + '.' + x.coll + '</code>').join(', ') + '. Ajusta <code>config.json</code> o pon "auto".' : ' Impórtalo con:<br><code>' + IMPORT_HINT + '</code>'; }
function escHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ---------------------------------------------------------------- protección
// Evita escrituras accidentales en tus datos. Es una ayuda para el aprendizaje, no una barrera de seguridad.
const WRITE_RE = /\.\s*(insert(One|Many)?|update(One|Many)?|replaceOne|delete(One|Many)|remove|drop|dropDatabase|dropIndex(es)?|createIndex(es)?|createCollection|renameCollection|bulkWrite|findOneAnd(Update|Replace|Delete)|findAndModify|runCommand|adminCommand|shutdownServer|createUser|dropUser|grantRolesToUser|fsyncLock)\s*\(/;
function guard(code) {
  const sandbox = new RegExp('db\\s*:\\s*[\'"]' + CFG.sandboxDatabase + '[\'"]');
  if (/^\s*prompt\s*=/m.test(code)) return 'Bloqueado por el tutorial: el prompt lo gestiona el laboratorio.';
  if (WRITE_RE.test(code)) return 'Bloqueado por el tutorial: las operaciones de escritura (insert, update, delete, drop, createIndex…) están desactivadas para proteger tus datos.';
  if (/\brequire\s*\(|\bprocess\s*\.|\bload\s*\(/.test(code)) return 'Bloqueado por el tutorial: require(), process y load() no están permitidos en el laboratorio.';
  if (/\$out\b|\$merge\b/.test(code) && !sandbox.test(code)) return 'Bloqueado por el tutorial: $out / $merge solo pueden escribir en la base de prácticas «' + CFG.sandboxDatabase + '». Ejemplo: { $out: { db: "' + CFG.sandboxDatabase + '", coll: "resultado" } }';
  if (/mapReduce/.test(code) && !/inline\s*:\s*(1|true)/.test(code) && !sandbox.test(code)) return 'Bloqueado por el tutorial: mapReduce debe usar { out: { inline: 1 } } o escribir en la base de prácticas: { out: { replace: "resultado", db: "' + CFG.sandboxDatabase + '" } }';
  return null;
}

// Comprueba que la entrada está completa (paréntesis/llaves/corchetes y cadenas cerradas)
function balanced(code) {
  let depth = 0, q = null, esc = false, lineComment = false, blockComment = false;
  for (let i = 0; i < code.length; i++) {
    const c = code[i], n = code[i + 1];
    if (lineComment) { if (c === '\n') lineComment = false; continue; }
    if (blockComment) { if (c === '*' && n === '/') { blockComment = false; i++; } continue; }
    if (q) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === q) q = null; continue; }
    if (c === '/' && n === '/') { lineComment = true; continue; }
    if (c === '/' && n === '*') { blockComment = true; i++; continue; }
    if (c === '"' || c === "'" || c === '`') q = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
  }
  return depth <= 0 && !q && !blockComment;
}

// ---------------------------------------------------------------- sesiones mongosh
const HELPER = [
  'globalThis.__mqlRes = function (v, mode, cap) {',
  '  if (v && typeof v.toArray === "function") v = v.toArray();',
  '  if (v && v.ok === 1 && Array.isArray(v.results)) v = v.results;',
  '  else if (v && v.ok === 1 && v.result) { const r = v.result; v = (typeof r === "string" ? db.getCollection(r) : db.getSiblingDB(r.db).getCollection(r.collection)).find().toArray(); }',
  '  if (!Array.isArray(v)) v = [v];',
  '  const total = v.length;',
  '  if (mode === "ids") v = v.map(d => (d && typeof d === "object" && "_id" in d) ? d._id : d);',
  '  return { total: total, docs: v.slice(0, cap) };',
  '}'
].join(' ');

const sessions = new Map();
const validDb = (d) => /^[^\s/\\."$*<>:|?]{1,63}$/.test(d || '');

class Session {
  constructor(id, db) {
    db = validDb(db) ? db : (ENV.db || 'test');
    this.id = id; this.buf = ''; this.waiter = null; this.chain = Promise.resolve(); this.db = db; this.startDb = db; this.lastUsed = Date.now();
    this.alive = true;
    if (!ENV.mongosh) { this.alive = false; this.startError = 'mongosh no encontrado'; this.ready = Promise.resolve(); return; }
    this.proc = spawn(ENV.mongosh, ['--quiet', '--norc', CFG.mongoUri], { stdio: ['pipe', 'pipe', 'pipe'], shell: needsShell(ENV.mongosh), windowsHide: true });
    this.proc.on('error', (e) => { this.alive = false; this.startError = e.message; this._flush(); });
    this.proc.on('exit', () => { this.alive = false; this._flush(); });
    const onData = (d) => { this.buf += d.toString(); this._check(); };
    this.proc.stdout.on('data', onData);
    this.proc.stderr.on('data', onData);
    this.proc.stdin.on('error', () => { /* proceso cerrado */ });
    this.ready = this.exec('prompt = ' + JSON.stringify(PROMPT) + '\nuse ' + db + '\n' + HELPER);
  }
  _check() {
    if (!this.waiter) return;
    const i = this.buf.indexOf(this.waiter.marker);
    if (i < 0) { if (this.buf.length > MAX_OUT * 4) this.buf = this.buf.slice(-MAX_OUT * 2); return; }
    const end = this.buf.indexOf('>>', i + this.waiter.marker.length);
    if (end < 0) return;
    const out = this.buf.slice(0, i), db = this.buf.slice(i + this.waiter.marker.length, end);
    this.buf = this.buf.slice(end + 2);
    const w = this.waiter; this.waiter = null; clearTimeout(w.timer);
    w.resolve({ out: cleanOutput(out), db: db || this.db });
  }
  _flush() { if (this.waiter) { const w = this.waiter; this.waiter = null; clearTimeout(w.timer); w.resolve({ out: cleanOutput(this.buf) + '\n' + (this.startError ? 'No se pudo arrancar mongosh: ' + this.startError : 'La sesión de mongosh se cerró.'), db: this.db, dead: true }); } }
  exec(code) {
    this.lastUsed = Date.now();
    const run = () => new Promise((resolve) => {
      if (!this.alive) return resolve({ out: this.startError ? 'No se pudo arrancar mongosh: ' + this.startError : 'La sesión de mongosh está cerrada. Pulsa «Reiniciar».', db: this.db, dead: true });
      const token = crypto.randomBytes(6).toString('hex');
      const marker = '<<MQL_END_' + token + ':';
      this.buf = '';
      const timer = setTimeout(() => {
        this.waiter = null;
        resolve({ out: cleanOutput(this.buf) + '\nTiempo agotado (' + CFG.timeout / 1000 + ' s). La sesión se ha reiniciado: prueba a añadir un $match al principio o un .limit() mientras desarrollas.', db: this.startDb, timeout: true });
        this.kill(); sessions.set(this.id, new Session(this.id, this.startDb));
      }, CFG.timeout);
      this.waiter = { marker, resolve: (r) => { if (r.db) this.db = r.db; resolve(r); }, timer };
      this.proc.stdin.write(code.replace(/\r\n/g, '\n') + '\n');
      this.proc.stdin.write('print("' + marker + '" + db.getName() + ">>")\n');
    });
    const p = this.chain.then(run, run);
    this.chain = p;
    return p;
  }
  kill() { this.alive = false; try { this.proc && this.proc.kill(); } catch (e) { /* ya cerrada */ } }
}

function cleanOutput(s) {
  return s
    .replace(/\r/g, '')
    .split(PROMPT).join('')
    .replace(/^[^\n]*?> (?=<<MQL|$)/, '')        // prompt inicial antes de fijar el nuestro
    .replace(/^\[Function: __mqlRes\]\n?/m, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '')
    .slice(0, MAX_OUT);
}

function getSession(id, db) {
  if (!id || !sessions.has(id)) { id = id || crypto.randomBytes(8).toString('hex'); sessions.set(id, new Session(id, db)); }
  return { id, s: sessions.get(id) };
}

// Sesión interna para soluciones de referencia y preguntas "en vivo"
let system = null;
function sys() { if (!system || !system.alive) system = new Session('__system', ENV.db); return system; }

async function evaluate(session, code, mode, cap) {
  const expr = String(code).trim().replace(/;+\s*$/, '');
  const cmd = 'print("<<MQL_RES>>" + EJSON.stringify(__mqlRes((' + expr + '), ' + JSON.stringify(mode || 'docs') + ', ' + (cap || CFG.maxValidationDocs) + '), { relaxed: true }))';
  const r = await session.exec(cmd);
  const m = r.out.match(/<<MQL_RES>>(.*)$/m);
  if (!m) return { ok: false, error: r.out || 'Sin resultado', timeout: r.timeout };
  try { return { ok: true, value: JSON.parse(m[1]) }; } catch (e) { return { ok: false, error: 'Resultado ilegible: ' + e.message }; }
}

// limpieza de sesiones inactivas
setInterval(() => { for (const [id, s] of sessions) if (Date.now() - s.lastUsed > 30 * 60 * 1000) { s.kill(); sessions.delete(id); } }, 60 * 1000).unref();
const shutdown = () => { for (const s of sessions.values()) s.kill(); if (system) system.kill(); process.exit(0); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);

// ---------------------------------------------------------------- HTTP
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function send(res, code, obj) { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }
function body(req) { return new Promise((ok, ko) => { let b = ''; req.on('data', (d) => { b += d; if (b.length > 1e6) req.destroy(); }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch (e) { ko(e); } }); }); }

let lastDetect = Date.now();
function statusPayload() {
  return { ok: !ENV.problem, problem: ENV.problem, message: ENV.message, database: ENV.db, collection: ENV.coll, sandbox: CFG.sandboxDatabase, count: ENV.count, serverVersion: ENV.serverVersion, mongoshVersion: ENV.mongoshVersion, candidates: ENV.candidates };
}

async function api(req, res, route) {
  const b = req.method === 'POST' ? await body(req) : {};
  if (route === 'status') {
    // si algo fallaba (p. ej. mongod apagado), vuelve a intentarlo como mucho cada 5 s
    if (ENV.problem && Date.now() - lastDetect > 5000) { lastDetect = Date.now(); const before = ENV.db; detect(); if (ENV.db !== before && system) { system.kill(); system = null; } }
    if (!ENV.problem) {
      const r = await evaluate(sys(), 'db.getSiblingDB(' + JSON.stringify(ENV.db) + ').getCollection(' + JSON.stringify(ENV.coll) + ').estimatedDocumentCount()', 'docs', 1);
      if (r.ok) ENV.count = r.value.docs[0];
      else { ENV.problem = 'noconn'; ENV.message = 'MongoDB ha dejado de responder. ¿Sigue arrancado <code>mongod</code>?'; }
    }
    return send(res, 200, statusPayload());
  }
  if (route === 'session') { const { id } = getSession(b.session, b.db); return send(res, 200, { session: id, db: sessions.get(id).db }); }
  if (route === 'reset') { const old = sessions.get(b.session); if (old) old.kill(); sessions.delete(b.session); const { id, s } = getSession(b.session, b.db); return send(res, 200, { session: id, db: s.db }); }
  if (route === 'exec') {
    const code = String(b.code || '');
    if (!balanced(code)) return send(res, 200, { incomplete: true });
    const blocked = guard(code); if (blocked) return send(res, 200, { out: blocked, blocked: true });
    const { id, s } = getSession(b.session, b.db); await s.ready;
    const r = await s.exec(code);
    return send(res, 200, { session: id, out: r.out, db: r.db, timeout: !!r.timeout });
  }
  if (route === 'eval') {
    // b.target: "session" (consulta del alumno, con sus variables) | "system" (referencia)
    const code = String(b.code || '');
    const blocked = guard(code); if (blocked) return send(res, 200, { ok: false, error: blocked });
    let target;
    if (b.target === 'session') { const g = getSession(b.session); target = g.s; await target.ready; }
    else { target = sys(); await target.ready; if (ENV.db) await target.exec('use ' + ENV.db); }
    return send(res, 200, await evaluate(target, code, b.mode, b.cap));
  }
  send(res, 404, { error: 'ruta desconocida' });
}

function serveStatic(req, res, urlPath) {
  let p;
  try { p = decodeURIComponent(urlPath.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = path.relative(ROOT, file);
  if (rel.startsWith('..') || path.isAbsolute(rel) || /^(_build|node_modules)([\\/]|$)|^(server\.js|config\.json)$/.test(rel)) { res.writeHead(403); return res.end('Prohibido'); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') data = Buffer.from(data.toString('utf8').replace(/__COL__/g, ENV.coll || 'facturas').replace(/__DB__/g, ENV.db || 'demo').replace(/__SANDBOX__/g, CFG.sandboxDatabase));
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

function openBrowser(url) {
  try {
    const cmd = IS_WIN ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    const args = IS_WIN ? ['/c', 'start', '""', url] : [url];
    spawn(cmd, args, { detached: true, stdio: 'ignore', windowsHide: true }).on('error', () => {}).unref();
  } catch (e) { /* sin navegador: el usuario abre la URL a mano */ }
}

// ---------------------------------------------------------------- informe
function report() {
  const ok = (b) => (b ? '  ✔ ' : '  ✘ ');
  const plain = (s) => String(s || '').replace(/<br>/g, '\n      ').replace(/<[^>]+>/g, '');
  console.log('\n  MQL Lab · diagnóstico');
  console.log(ok(true) + 'Node.js ' + process.version + ' (' + process.platform + ')');
  console.log(ok(!!ENV.mongosh) + 'mongosh ' + (ENV.mongosh ? ENV.mongoshVersion + '  →  ' + ENV.mongosh : 'no encontrado'));
  if (ENV.mongosh) console.log(ok(ENV.problem !== 'noconn') + 'MongoDB ' + (ENV.serverVersion ? ENV.serverVersion + '  en  ' + CFG.mongoUri : 'sin conexión con ' + CFG.mongoUri));
  if (ENV.candidates.length) console.log('      Datasets encontrados: ' + ENV.candidates.map((x) => x.db + '.' + x.coll + ' (' + x.count + ')').join(', '));
  if (!ENV.problem) console.log(ok(true) + 'Dataset: ' + ENV.db + '.' + ENV.coll + ' · ' + ENV.count + ' documentos' + (CFG.database ? '' : '  (detectado automáticamente)'));
  if (ENV.problem) console.log('\n  → ' + plain(ENV.message));
  console.log('');
}

// ---------------------------------------------------------------- arranque
detect();
report();
if (flag('--check')) process.exit(ENV.problem ? 1 : 0);

const server = http.createServer((req, res) => {
  const m = req.url.match(/^\/api\/(\w+)/);
  if (m) return api(req, res, m[1]).catch((e) => send(res, 500, { error: e.message }));
  serveStatic(req, res, req.url);
});
let port = CFG.port;
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && port < CFG.port + 10) { port++; server.listen(port, '127.0.0.1'); }
  else { console.error('  No se pudo abrir el servidor web: ' + e.message); process.exit(1); }
});
server.on('listening', () => {
  const url = 'http://localhost:' + port;
  console.log('  MQL Lab listo →  ' + url + (port !== CFG.port ? '   (el puerto ' + CFG.port + ' estaba ocupado)' : ''));
  console.log('  Ctrl+C para parar.\n');
  if (!flag('--no-open')) openBrowser(url);
});
server.listen(port, '127.0.0.1');
