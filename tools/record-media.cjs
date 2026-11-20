// Genera las imágenes y los GIF del README (docs/media/) grabando el tutorial real en un navegador.
//
// Requisitos:  npm i --no-save playwright-core   ·   ffmpeg en el PATH   ·   un Chromium (npx playwright install chromium)
// Uso:
//   1. Genera y carga los datos de demostración (no uses tus datos reales: saldrían en las imágenes):
//        node demo/generate-demo-data.mjs
//        mongoimport --db demo --collection facturas --file demo/demo-data.json
//   2. Arranca el tutorial:   node server.js --no-open
//   3. Graba:                 node tools/record-media.cjs            (todo)
//                             node tools/record-media.cjs --only lab,mapreduce
// Variables: BASE_URL (por defecto http://localhost:3000), CHROME_PATH (ejecutable de Chromium).
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright-core');

const BASE = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const OUT = path.resolve(__dirname, '..', 'docs', 'media');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mql-media-'));
const only = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1].split(',') : null; })();
fs.mkdirSync(OUT, { recursive: true });

// ---------- cursor visible + onda al pulsar (el vídeo no graba el puntero del sistema)
const CURSOR = `(() => {
  const mk = () => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-80px,-80px)';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M5 3l14 8.5-6.2 1.6L9.9 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    const st = document.createElement('style'); st.textContent = '@keyframes __rip{from{transform:scale(.3);opacity:.9}to{transform:scale(2.4);opacity:0}}';
    document.head.appendChild(st);
    addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + (e.clientX - 5) + 'px,' + (e.clientY - 3) + 'px)'; }, true);
    addEventListener('mousedown', (e) => { const r = document.createElement('div'); r.style.cssText = 'position:fixed;z-index:2147483646;pointer-events:none;width:34px;height:34px;border-radius:50%;background:rgba(76,155,255,.55);left:' + (e.clientX - 17) + 'px;top:' + (e.clientY - 17) + 'px;animation:__rip .45s ease-out forwards'; document.documentElement.appendChild(r); setTimeout(() => r.remove(), 500); }, true);
  };
  if (document.documentElement) mk(); document.addEventListener('DOMContentLoaded', mk);
})();`;

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- acciones con ratón/teclado "humanas"
function actions(page) {
  let cx = 60, cy = 60;
  const glide = async (x, y, ms = 420) => {
    const n = Math.max(6, Math.round(ms / 16)), sx = cx, sy = cy;
    for (let i = 1; i <= n; i++) { const k = ease(i / n); await page.mouse.move(sx + (x - sx) * k, sy + (y - sy) * k); await wait(14); }
    cx = x; cy = y;
  };
  const center = async (loc) => { await loc.evaluate((e) => e.scrollIntoView({ block: 'nearest', inline: 'nearest' })); const b = await loc.boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2]; };
  return {
    wait,
    click: async (loc, pause = 350) => { const [x, y] = await center(loc); await glide(x, y); await wait(90); await page.mouse.down(); await wait(70); await page.mouse.up(); await wait(pause); },
    type: async (loc, text, delay = 34) => { const [x, y] = await center(loc); await glide(x, y); await page.mouse.down(); await page.mouse.up(); await wait(150); await page.keyboard.type(text, { delay }); },
    key: async (k, pause = 300) => { await page.keyboard.press(k); await wait(pause); },
    scrollTo: async (loc, block = 'start') => { await loc.evaluate((e, b) => e.scrollIntoView({ block: b, behavior: 'instant' }), block); await wait(250); },
    // coloca el elemento justo debajo de la barra superior fija (que mide 56 px)
    scrollToTop: async (loc, offset = 76) => { await loc.evaluate((e, o) => scrollTo(0, e.getBoundingClientRect().top + scrollY - o), offset); await wait(250); },
    // fija la altura de un visor al máximo que alcanza (así el recorte del GIF no cambia entre estados)
    lockHeight: async (viz, clicks = []) => { let h = 0; const m = async () => { h = Math.max(h, await viz.evaluate((e) => e.offsetHeight)); }; await m(); for (const c of clicks) { await c.click(); await wait(350); await m(); } await viz.evaluate((e, hh) => { e.style.minHeight = hh + 'px'; }, h); },
    scrollBy: async (dy, ms = 900) => { const n = Math.round(ms / 16); for (let i = 1; i <= n; i++) { await page.mouse.wheel(0, dy / n); await wait(15); } },
    box: async (loc) => loc.boundingBox()
  };
}

// ---------- una escena = un contexto con vídeo → GIF
async function scene(browser, s) {
  const vp = s.viewport || { width: 1280, height: 720 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, recordVideo: { dir: TMP, size: vp }, locale: 'es-ES' });
  await ctx.addInitScript(CURSOR);
  await ctx.addInitScript((init) => { try { for (const [k, v] of Object.entries(init || {})) localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }, s.storage);
  const page = await ctx.newPage();
  const created = Date.now();
  await page.goto(BASE + s.url, { waitUntil: 'load' });
  await page.waitForFunction(() => /docs/.test((document.querySelector('.pill.conn') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const a = actions(page);
  const ctxInfo = {};
  const t0 = () => (Date.now() - created) / 1000;
  await s.setup(page, a, ctxInfo);                   // preparar (sin grabar en el GIF)
  const start = t0() + 0.25;
  await s.run(page, a, ctxInfo);                     // lo que se ve en el GIF
  await a.wait(s.tail || 900);
  const end = t0();
  await ctx.close();
  const video = await page.video().path();
  const crop = ctxInfo.crop ? `crop=${ctxInfo.crop.w}:${ctxInfo.crop.h}:${ctxInfo.crop.x}:${ctxInfo.crop.y},` : '';
  if (process.env.KEEP_VIDEO) { fs.mkdirSync(process.env.KEEP_VIDEO, { recursive: true }); fs.copyFileSync(video, path.join(process.env.KEEP_VIDEO, s.name + '.webm')); fs.writeFileSync(path.join(process.env.KEEP_VIDEO, s.name + '.json'), JSON.stringify({ start, end, crop: ctxInfo.crop || null })); }
  const out = path.join(OUT, s.name + '.gif');
  const fps = s.fps || 10, width = s.width || 880;
  const vf = `${crop}fps=${fps},scale=${width}:-1:flags=lanczos,tpad=stop_mode=clone:stop_duration=1.6,split[a][b];[a]palettegen=max_colors=${s.colors || 128}:stats_mode=diff[p];[b][p]paletteuse=dither=${s.dither || 'bayer:bayer_scale=5'}:diff_mode=rectangle`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(start.toFixed(2)), '-t', String((end - start).toFixed(2)), '-i', video, '-vf', vf, '-loop', '0', out]);
  const kb = Math.round(fs.statSync(out).size / 1024);
  console.log(`  ✓ ${s.name}.gif  ${(end - start).toFixed(1)} s · ${kb} KB`);
  return out;
}

// ---------- captura estática (PNG)
async function shot(browser, s) {
  const vp = s.viewport || { width: 1280, height: 800 };
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: s.scale || 1, locale: 'es-ES' });
  await ctx.addInitScript((init) => { try { for (const [k, v] of Object.entries(init || {})) localStorage.setItem(k, v); } catch (e) { /* sin almacenamiento */ } }, s.storage);
  const page = await ctx.newPage();
  await page.goto(BASE + s.url, { waitUntil: 'load' });
  await page.waitForFunction(() => /docs/.test((document.querySelector('.pill.conn') || {}).textContent || ''), null, { timeout: 15000 }).catch(() => {});
  await wait(500);
  const a = actions(page);
  if (s.setup) await s.setup(page, a);
  const out = path.join(OUT, s.name + '.png');
  await page.screenshot({ path: out, clip: s.clip ? await s.clip(page) : undefined, timeout: 15000 });
  await ctx.close();
  console.log(`  ✓ ${s.name}.png  ${Math.round(fs.statSync(out).size / 1024)} KB`);
}

const cropTo = async (a, loc, vp, pad = 14, maxH = Infinity) => {
  const b = await a.box(loc); b.height = Math.min(b.height, maxH);
  const x = Math.max(0, Math.floor(b.x - pad)), y = Math.max(0, Math.floor(b.y - pad));
  const w = Math.min(vp.width - x, Math.ceil(b.width + 2 * pad)), h = Math.min(vp.height - y, Math.ceil(b.height + 2 * pad));
  return { x, y, w: w - (w % 2), h: h - (h % 2) };
};
const KEY = 'mqlLab.v1';
const progress = (steps, xp, labs = []) => ({ [KEY]: JSON.stringify({ xp, steps: Object.fromEntries(steps.map((k) => [k, 1])), labs: Object.fromEntries(labs.map((k) => [k, 1])), quiz: {} }) });
const done = (lesson, n) => Array.from({ length: n }, (_, i) => `${lesson}:${i}`);

// ====================================================================== escenas
const SCENES = [
  { name: 'laboratorio', kind: 'gif', url: '/lecciones/07-group-acumuladores.html', fps: 10, width: 900, colors: 160,
    async setup(p, a) { await a.scrollTo(p.locator('#lab'), 'start'); await a.wait(400); },
    async run(p, a) {
      await a.wait(700);
      await a.click(p.locator('.lab-head button[title="Pantalla completa"]').first(), 700);
      await a.type(p.locator('.term-input textarea'), 'db.facturas.aggregate([{ $group: { _id: "$billing", facturacion: { $sum: "$TOTAL" }, facturas: { $sum: 1 } } }])', 22);
      await a.wait(350); await a.key('Enter', 1700);
      await a.click(p.getByRole('button', { name: 'Comprobar' }), 2400);
      await a.click(p.locator('.lab .next'), 1500);
    } },

  { name: 'modo-estudio', kind: 'gif', url: '/lecciones/07-group-acumuladores.html', fps: 10, width: 900, colors: 160, storage: progress(done('l07', 1), 40),
    async setup(p, a) { await a.scrollTo(p.locator('#lab'), 'start'); await a.click(p.locator('.lab-head button[title="Pantalla completa"]').first(), 500); },
    async run(p, a) {
      await a.wait(900);
      await a.click(p.locator('.lab-tab', { hasText: 'Hint' }), 700);
      await a.click(p.getByRole('button', { name: /Mostrar pista 1/ }), 1100);
      await a.click(p.getByRole('button', { name: /Mostrar pista 2/ }), 1300);
      await a.click(p.getByRole('button', { name: /Ver solución/ }), 1500);
      await a.click(p.getByRole('button', { name: /Pegar en la terminal/ }), 1000);
      await a.key('Enter', 1500);
      await a.click(p.getByRole('button', { name: 'Comprobar' }), 2300);
    } },

  { name: 'pipeline', kind: 'gif', url: '/lecciones/06-aggregation-pipeline.html', viewport: { width: 1280, height: 1000 }, fps: 8, width: 760, colors: 64, dither: 'none', storage: { 'mqlLab.nav': '0' },
    async setup(p, a, c) { const box = p.locator('.viz-pipe').first().locator('xpath=..'); await a.scrollToTop(box); await a.lockHeight(box); c.crop = await cropTo(a, box, { width: 1280, height: 1000 }, 4, 640); },
    async run(p, a) {
      await a.wait(1100);
      for (let i = 0; i < 4; i++) await a.click(p.locator('.viz-pipe .btn', { hasText: 'Siguiente etapa' }).first(), i === 3 ? 1600 : 1500);
    } },

  { name: 'explorador', kind: 'gif', url: '/lecciones/01-modelo-de-documentos.html', viewport: { width: 1280, height: 1000 }, fps: 8, width: 760, colors: 64, dither: 'none', storage: { 'mqlLab.nav': '0' },
    async setup(p, a, c) { const box = p.locator('.viz-doctree').first().locator('xpath=..'); await a.scrollToTop(box); await box.evaluate((e) => { e.style.minHeight = '590px'; }); c.crop = await cropTo(a, box, { width: 1280, height: 1000 }, 4); },
    async run(p, a) {
      const row = (t) => p.locator('.dt-row', { hasText: t }).first();
      const tog = (t) => row(t).locator('.dt-tog');
      await a.wait(700);
      await a.click(tog('Client'), 800);
      await a.click(row('Email'), 1300);
      await a.click(row('Surname'), 1500);
      await a.click(tog('Movies'), 700);
      await a.click(p.locator('.dt-row', { hasText: /\[0\]: \{ 6 campos \}/ }).first().locator('.dt-tog'), 700);
      await a.click(tog('Details'), 700);
      await a.click(row('Genres'), 1700);
    } },

  { name: 'regex', kind: 'gif', url: '/lecciones/05-expresiones-regulares.html', viewport: { width: 1280, height: 1000 }, fps: 8, width: 760, colors: 64, dither: 'none', storage: { 'mqlLab.nav': '0' },
    async setup(p, a, c) {
      const box = p.locator('.viz-regex').first().locator('xpath=..'), chip = (l) => p.locator('.viz-regex .chip', { hasText: l });
      await a.scrollToTop(box);
      await a.lockHeight(box, ['contiene', 'palabra completa', 'formato', 'empieza por'].map(chip));
      c.crop = await cropTo(a, box, { width: 1280, height: 1000 }, 4);
    },
    async run(p, a) {
      await a.wait(900);
      for (const [l, ms] of [['termina en', 1300], ['contiene', 1900], ['palabra completa', 1700], ['formato', 1800]]) await a.click(p.locator('.viz-regex .chip', { hasText: l }), ms);
    } },

  { name: 'mapreduce', kind: 'gif', url: '/lecciones/11-mapreduce.html', viewport: { width: 1280, height: 1100 }, fps: 8, width: 760, colors: 64, dither: 'none', storage: { 'mqlLab.nav': '0' },
    async setup(p, a, c) {
      const v = p.locator('.viz-mr').nth(1), box = v.locator('xpath=..'), st = (t) => v.locator('.vstage', { hasText: t });
      await a.scrollToTop(box);
      await a.lockHeight(box, [st('shuffle'), st('reduce'), st('finalize'), st('map')]);
      c.crop = await cropTo(a, box, { width: 1280, height: 1100 }, 4, 650); c.v = v;
    },
    async run(p, a, c) {
      const st = (t) => c.v.locator('.vstage', { hasText: t });
      await a.wait(1500);
      for (const [l, ms] of [['shuffle', 1900], ['reduce', 2100], ['finalize', 2300]]) await a.click(st(l), ms);
    } },

  // ------------------------------------------------------------- capturas estáticas
  { name: 'indice', kind: 'png', url: '/index.html', storage: progress([...done('l00', 7), ...done('l01', 6), ...done('l02', 6), ...done('l03', 6), ...done('l04', 6)], 340, ['l00', 'l01', 'l02', 'l03', 'l04']), viewport: { width: 1280, height: 860 } },
  { name: 'leccion', kind: 'png', url: '/lecciones/04-arrays-y-subdocumentos.html', viewport: { width: 1280, height: 860 },
    async setup(p, a) { await a.scrollTo(p.locator('.figure').first(), 'center'); await a.wait(300); } },
  { name: 'ticket', kind: 'png', url: '/misiones/m4-cine-por-pais.html', viewport: { width: 1280, height: 900 } },
  { name: 'modo-claro', kind: 'png', url: '/lecciones/09-expresiones-agregacion.html', viewport: { width: 1280, height: 860 }, storage: { 'mqlLab.theme': 'light' } }
];

(async () => {
  const exe = process.env.CHROME_PATH;
  const list = SCENES.filter((s) => !only || only.includes(s.name));
  console.log(`Grabando ${list.length} escena(s) desde ${BASE} → docs/media/`);
  for (const s of list) {
    // un navegador nuevo por escena: en algunos entornos solo la primera pestaña de cada proceso se puede capturar
    const browser = await chromium.launch(exe ? { executablePath: exe } : {});
    try { await (s.kind === 'png' ? shot(browser, s) : scene(browser, s)); }
    catch (e) { console.log(`  ✗ ${s.name}: ${String(e.message).split('\n')[0]}`); }
    await browser.close().catch(() => {});
  }
  fs.rmSync(TMP, { recursive: true, force: true });
})();
