// Genera las páginas HTML del tutorial a partir de _build/content/*.mjs
//   node _build/build.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { COURSE, MISSIONS } from './manifest.mjs';
import { SITE } from './site.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------- helpers de contenido
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (o) => escHtml(JSON.stringify(o)).replace(/"/g, '&quot;');
const ICON = {
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a2.5 2.5 0 00-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 002.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 001.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 001.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.12z"/></svg>',
  in: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 11-.02 5 2.5 2.5 0 01.02-5zM3 9.75h4v11.5H3zM9.75 9.75h3.83v1.57h.05c.53-1 1.84-2.07 3.78-2.07 4.04 0 4.79 2.66 4.79 6.12v5.88h-4v-5.2c0-1.24-.02-2.84-1.73-2.84-1.73 0-2 1.35-2 2.75v5.29h-4z"/></svg>'
};
const socials = () => `<span class="soc-links"><a class="soc yt" href="${SITE.youtube}" target="_blank" rel="noopener" title="YouTube de ${SITE.author}" aria-label="YouTube de ${SITE.author}">${ICON.yt}</a><a class="soc x" href="${SITE.twitter}" target="_blank" rel="noopener" title="X (Twitter) de ${SITE.author}" aria-label="X (Twitter) de ${SITE.author}">${ICON.x}</a><a class="soc in" href="${SITE.linkedin}" target="_blank" rel="noopener" title="LinkedIn de ${SITE.author}" aria-label="LinkedIn de ${SITE.author}">${ICON.in}</a></span>`;
const authorPill = (cls) => `<span class="pill author ${cls}"><span class="author-txt">Sitio dirigido por <a href="${SITE.web}" target="_blank" rel="noopener">${SITE.author}</a></span>${socials()}</span>`;
export const h = {
  code: (src, lang = 'js') => `<div class="codeblock" data-lang="${lang}"><span class="lang">${lang === 'js' ? 'mongosh' : lang}</span><pre><code>${escHtml(src.replace(/^\n+|\s+$/g, ''))}</code></pre></div>`,
  callout: (kind, title, html) => `<div class="callout ${kind}"><b>${title}</b>${html}</div>`,
  quiz: (o) => `<div class="quiz" data-quiz="${attr(o)}"></div>`,
  cheat: (head, rows) => `<div class="table-wrap"><table class="cheat"><thead><tr>${head.map((x) => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`,
  label: (txt) => `<div class="section-label">${txt}</div>`,
  figure: (inner, caption) => `<figure class="figure">${inner}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`,
  esc: escHtml,
  // ticket estilo Jira para las misiones
  ticket: (t) => {
    const initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
    const pr = { Alta: 'hi', Media: 'mid', Baja: 'lo', Crítica: 'crit' }[t.priority] || 'mid';
    return `<section class="ticket">
  <header class="tk-head"><span class="tk-type ${t.type.toLowerCase()}">${t.type}</span><span class="tk-key">${t.key}</span><span class="tk-status">EN CURSO</span></header>
  <h2 class="tk-title">${t.summary}</h2>
  <div class="tk-grid">
    <div class="tk-main">
      <h4>Descripción</h4>${t.description}
      <h4>Criterios de aceptación</h4>
      <ol class="tk-ac">${t.criteria.map((c) => `<li>${c}</li>`).join('')}</ol>
      ${t.comments && t.comments.length ? `<h4>Actividad</h4><div class="tk-comments">${t.comments.map((c) => `<div class="tk-c"><span class="tk-av" style="background:${c.color || 'var(--accent)'}">${initials(c.who)}</span><div><div class="tk-cm"><b>${c.who}</b> <span>${c.role}</span> · <span>${c.when}</span></div><div class="tk-ct">${c.text}</div></div></div>`).join('')}</div>` : ''}
    </div>
    <aside class="tk-side">
      <dl>
        <dt>Prioridad</dt><dd><span class="tk-pr ${pr}">▲</span> ${t.priority}</dd>
        <dt>Informador</dt><dd><span class="tk-av sm" style="background:${t.reporterColor || 'var(--violet)'}">${initials(t.reporter)}</span> ${t.reporter}</dd>
        <dt>Asignado</dt><dd><span class="tk-av sm" style="background:var(--mongo);color:#04111a">TÚ</span> Tú</dd>
        <dt>Sprint</dt><dd>${t.sprint || 'Sprint 14'}</dd>
        <dt>Estimación</dt><dd>${t.estimate}</dd>
        <dt>Etiquetas</dt><dd>${t.labels.map((l) => `<span class="tag">${l}</span>`).join(' ')}</dd>
      </dl>
    </aside>
  </div>
</section>`;
  },
  viz: (type, cfg, caption) => `<div class="viz"><div class="viz-${type}" data-cfg="${attr(cfg)}"></div>${caption ? `<p class="viz-cap">${caption}</p>` : ''}</div>`,
  // datos reales extraídos de la colección (ver _build/content/*.json)
  data: {
    sampleDoc: JSON.parse(fs.readFileSync(path.join(ROOT, '_build', 'content', 'sample-doc.json'), 'utf8')),
    mini: JSON.parse(fs.readFileSync(path.join(ROOT, '_build', 'content', 'mini-docs.json'), 'utf8'))
  }
};

// ---------------------------------------------------------------- plantilla
function sidebar(prefix, activeId) {
  const item = (x, base) => {
    const href = x.file ? prefix + x.file : '#';
    const cls = [x.id === activeId ? 'active' : '', x.ready ? '' : 'soon'].join(' ').trim();
    return `<a href="${href}" data-lesson="${x.id}" class="${cls}"><span class="num"><span>${x.num}</span></span>${x.title}</a>`;
  };
  return `<nav class="sidebar" aria-label="Temario">
    <a href="${prefix}index.html" class="${activeId === 'index' ? 'active' : ''}"><span class="num"><span>⌂</span></span>Inicio y ruta</a>
    <h4>Lecciones</h4>${COURSE.map((x) => item(x)).join('')}
    <h4>Misiones (simulación laboral)</h4>${MISSIONS.map((x) => item(x)).join('')}
    <h4>Progreso</h4><a href="#" data-reset><span class="num"><span>↺</span></span>Reiniciar progreso</a>
  </nav>`;
}

function page({ prefix, id, title, crumb, body, lab, viz }) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<script>window.MQL_CFG={db:"__DB__",col:"__COL__",sandbox:"__SANDBOX__"};window.MQL_SITE=${JSON.stringify(SITE)};try{var t=localStorage.getItem('mqlLab.theme');if(t)document.documentElement.setAttribute('data-theme',t);if(localStorage.getItem('mqlLab.nav')==='0')document.documentElement.classList.add('nav-collapsed')}catch(e){}</script>
<link rel="stylesheet" href="${prefix}assets/style.css">
</head>
<body>
<header class="topbar">
  <button class="icon-btn menu-btn" type="button" aria-label="Ocultar el menú" title="Ocultar el menú" aria-expanded="true">☰</button>
  <a class="brand" href="${prefix}index.html"><span class="brand-mark">{ }</span>MQL Lab</a>
  <span class="crumb">${crumb || ''}</span>
  <span class="spacer"></span>
  ${authorPill("hdr-author")}
  <span class="pill conn"><span class="dot"></span><span class="txt">Conectando…</span></span>
  <span class="pill xp" data-xp></span>
  <button class="icon-btn" type="button" data-theme-toggle aria-label="Cambiar tema">◐</button>
</header>
<div class="layout">
${sidebar(prefix, id)}
<main class="main">
${body}
</main>
</div>
<footer class="credits">
  <div class="cta-ticker" data-ticker aria-live="polite"></div>
  ${authorPill("foot-author")}
</footer>
<script src="${prefix}assets/app.js"></script>
${viz ? `<script src="${prefix}assets/mingo.min.js"></script><script src="${prefix}assets/viz.js"></script>` : ''}
${lab ? `<script src="${prefix}assets/lab.js"></script>` : ''}
</body>
</html>
`;
}

function labBlock(lab) {
  return `<section class="lab-section" id="lab">
  <div class="lab-intro">${h.label('▶ Laboratorio en vivo')}<h2>${lab.title}</h2><p class="muted">${lab.intro || 'La terminal de la derecha es <b>mongosh real</b> conectado a tu MongoDB. Cada paso se valida ejecutando tu consulta y comparando su resultado con el esperado.'}</p>
  <div class="server-banner"></div></div>
  <div class="lab-mount"><script type="application/json">${JSON.stringify(lab).replace(/</g, '\\u003c')}</script></div>
</section>`;
}

function lessonPage(meta, content) {
  const all = [...COURSE, ...MISSIONS].filter((x) => x.ready);
  const k = all.findIndex((x) => x.id === meta.id);
  const prev = all[k - 1], next = all[k + 1];
  const body = `<article class="article">
  <div class="hero">
    <div class="eyebrow"><span class="tag mongo">${meta.kind === 'mission' ? 'Misión' : 'Lección'} ${meta.num}</span><span>⏱ ${meta.minutes} min</span></div>
    <h1>${meta.title}</h1>
    <p class="lead">${content.lead}</p>
    ${content.objectives ? `<ul class="objectives">${content.objectives.map((o) => `<li>${o}</li>`).join('')}</ul>` : ''}
  </div>
  ${content.body}
  </article>
  ${content.lab ? labBlock(content.lab) : ''}
  <div class="article">${content.after || ''}
  <nav class="pager">${prev ? `<a href="../${prev.file}"><small>← Anterior</small>${prev.num} · ${prev.title}</a>` : '<span></span>'}${next ? `<a class="nx" href="../${next.file}"><small>Siguiente →</small>${next.num} · ${next.title}</a>` : ''}</nav>
  </div>`;
  return page({ prefix: '../', id: meta.id, title: `${meta.num} · ${meta.title} — MQL Lab`, crumb: `${meta.kind === 'mission' ? 'Misión' : 'Lección'} ${meta.num} · ${meta.title}`, body, lab: !!content.lab, viz: !!content.viz });
}

// ---------------------------------------------------------------- índice
function indexPage() {
  const card = (x) => `<a class="card ${x.ready ? '' : 'soon'}" data-lesson="${x.id}" href="${x.ready ? x.file : '#'}"><span class="n">${x.kind === 'mission' ? 'MISIÓN' : 'LECCIÓN'} ${x.num}${x.ready ? '' : ' · próximamente'}</span><h3>${x.title}</h3><p>${x.summary}</p></a>`;
  const body = `<article class="article">
  <div class="hero">
    <div class="eyebrow"><span class="tag mongo">Tutorial interactivo</span><span>MongoDB Query Language</span></div>
    <h1>Aprende MQL con tus propios datos</h1>
    <p class="lead">Un tutorial guiado para dominar <code>find()</code>, el <b>aggregation pipeline</b> y <b>MapReduce</b> sobre tu propia base de datos (<code>__DB__.__COL__</code>). Cada concepto tiene su página: vuelve a ella siempre que la necesites.</p>
  </div>
  <div class="server-banner"></div>
  <div class="rankbox"><div><div class="muted" style="font-size:.8rem">TU PROGRESO</div><div class="xp" data-xp style="font-size:1.15rem"></div></div><div class="meter"><i data-rank-meter style="width:0"></i></div><div class="muted" data-rank-next style="font-size:.85rem"></div></div>
  ${h.label('Cómo funciona')}
  <ol class="steps-howto">
    <li><b>Concepto visual.</b> Cada lección empieza con un diagrama animado que muestra el mecanismo antes de tocar la terminal.</li>
    <li><b>Lab en vivo.</b> Una terminal <code>mongosh</code> real conectada a tu MongoDB, sin simuladores.</li>
    <li><b>Validación automática.</b> Tu consulta se ejecuta y se compara con el resultado esperado, no con el texto que escribas.</li>
    <li><b>Misiones.</b> Tickets estilo Jira con criterios de aceptación, como en un trabajo real.</li>
  </ol>
  ${h.label('Lecciones')}
  <div class="cards">${COURSE.map(card).join('')}</div>
  ${h.label('Misiones · simulación laboral')}
  <div class="cards">${MISSIONS.map(card).join('')}</div>
  ${h.label('Puesta en marcha')}
  <h2>Arrancar el laboratorio</h2>
  <p>Necesitas tu <code>mongod</code> en marcha y, en otra terminal, dentro de la carpeta <code>mql-tutorial</code>:</p>
  ${h.code('node server.js', 'bash')}
  <p>Se abre el navegador solo. El servidor localiza <code>mongosh</code> y el dataset automáticamente (ahora usa <code>__DB__.__COL__</code>). Si algo falla, <code>node server.js --check</code> te dice qué falta; los detalles están en <code>README.md</code>.</p>
  </article>`;
  return page({ prefix: '', id: 'index', title: 'MQL Lab — Tutorial interactivo de MongoDB', crumb: 'Inicio', body, lab: false });
}

// ---------------------------------------------------------------- build
const write = (rel, html) => { const f = path.join(ROOT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); console.log('  ✓', rel); };
for (const x of [...COURSE, ...MISSIONS].filter((x) => x.ready)) {
  const mod = await import(pathToFileURL(path.join(ROOT, '_build', 'content', x.id + '.mjs')).href + '?v=' + Date.now());
  write(x.file, lessonPage(x, mod.default(h)));
}
write('index.html', indexPage());
