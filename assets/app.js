/* MQL Lab — utilidades comunes: progreso, XP, tema, resaltado, quizzes, confeti */
(function () {
  'use strict';
  var KEY = 'mqlLab.v1';
  var RANKS = [[0, 'Becario/a de datos'], [100, 'Analista junior'], [300, 'Data Engineer'], [600, 'Senior Data Engineer'], [1000, 'Arquitecto/a MongoDB']];

  // ---------- almacenamiento (tolerante a fallos) ----------
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* sin almacenamiento */ } }
  var state = load();
  state.xp = state.xp || 0; state.steps = state.steps || {}; state.labs = state.labs || {}; state.quiz = state.quiz || {};

  function rankFor(xp) { var r = RANKS[0], next = null; for (var i = 0; i < RANKS.length; i++) { if (xp >= RANKS[i][0]) { r = RANKS[i]; next = RANKS[i + 1] || null; } } return { name: r[1], from: r[0], next: next }; }

  var Progress = {
    get: function () { return state; },
    award: function (key, xp, bucket) {
      bucket = bucket || 'steps';
      if (state[bucket][key]) return false;
      state[bucket][key] = 1; state.xp += xp; save(state); renderXP(); toast('+' + xp + ' XP');
      return true;
    },
    has: function (key, bucket) { return !!state[bucket || 'steps'][key]; },
    completeLab: function (id) { if (!state.labs[id]) { state.labs[id] = 1; save(state); renderSidebar(); } },
    reset: function () { state = { xp: 0, steps: {}, labs: {}, quiz: {} }; save(state); location.reload(); },
    rank: rankFor
  };

  function renderXP() {
    var r = rankFor(state.xp);
    document.querySelectorAll('[data-xp]').forEach(function (el) { el.innerHTML = '<b>' + state.xp + '</b> XP<span class="rk"> · ' + r.name + '</span>'; });
    document.querySelectorAll('[data-rank-meter]').forEach(function (el) {
      var pct = r.next ? Math.round((state.xp - r.from) / (r.next[0] - r.from) * 100) : 100;
      el.style.width = pct + '%';
    });
    document.querySelectorAll('[data-rank-next]').forEach(function (el) { el.textContent = r.next ? 'Siguiente rango: ' + r.next[1] + ' (' + r.next[0] + ' XP)' : 'Rango máximo alcanzado'; });
  }
  function renderSidebar() {
    document.querySelectorAll('[data-lesson]').forEach(function (a) { if (state.labs[a.getAttribute('data-lesson')]) a.classList.add('done'); });
  }

  // ---------- tema ----------
  function applyTheme(t) { if (t) document.documentElement.setAttribute('data-theme', t); else document.documentElement.removeAttribute('data-theme'); }
  try { applyTheme(localStorage.getItem('mqlLab.theme')); } catch (e) { /* nada */ }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    applyTheme(cur); try { localStorage.setItem('mqlLab.theme', cur); } catch (e) { /* nada */ }
  }

  // ---------- API ----------
  function api(route, body) {
    return fetch('/api/' + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  var statusPromise = null;
  function status() {
    if (!statusPromise) statusPromise = (location.protocol === 'file:' ? Promise.reject(new Error('file')) : api('status'));
    return statusPromise;
  }
  var PROBLEM = { nomongosh: 'Falta mongosh', noconn: 'MongoDB no responde', nodata: 'Falta el dataset' };
  function renderStatus() {
    var pill = document.querySelector('.pill.conn'), banner = document.querySelector('.server-banner');
    var retry = function () { setTimeout(function () { statusPromise = null; renderStatus(); }, 6000); };
    status().then(function (s) {
      if (s.ok) {
        if (pill) { pill.className = 'pill conn on'; pill.title = 'MongoDB ' + (s.serverVersion || '') + ' · mongosh ' + (s.mongoshVersion || ''); pill.innerHTML = '<span class="dot"></span><span class="txt">' + esc(s.database + '.' + s.collection) + ' · ' + Number(s.count).toLocaleString('es-ES') + ' docs</span>'; }
        if (banner) banner.classList.remove('show');
      } else {
        if (pill) { pill.className = 'pill conn off'; pill.innerHTML = '<span class="dot"></span><span class="txt">' + (PROBLEM[s.problem] || 'Sin conexión') + '</span>'; }
        if (banner) { banner.innerHTML = '<b>' + (PROBLEM[s.problem] || 'Hay un problema con MongoDB') + '.</b><br>' + (s.message || '') + '<br><span class="muted">Para un diagnóstico completo ejecuta <code>node server.js --check</code>. Esta página vuelve a comprobarlo sola cada pocos segundos.</span>'; banner.classList.add('show'); }
        retry();
      }
    }).catch(function () {
      if (pill) { pill.className = 'pill conn off'; pill.innerHTML = '<span class="dot"></span><span class="txt">Sin servidor</span>'; }
      if (banner) { banner.innerHTML = '<b>Los laboratorios necesitan el servidor local.</b><br>En una terminal, dentro de la carpeta <code>mql-tutorial</code>, ejecuta <code>node server.js</code>: se abrirá el navegador solo. La teoría se puede leer igualmente.'; banner.classList.add('show'); }
      if (location.protocol !== 'file:') retry();
    });
  }

  // ---------- resaltado de sintaxis (JS/MQL y salida de mongosh) ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b)|(\$\$?[A-Za-z_][\w.]*)|([A-Za-z_$][\w$]*)(\s*:(?!:))|([A-Za-z_$][\w$]*)(?=\s*\()|(\/(?![*/])(?:[^/\\\n[]|\\.|\[(?:[^\]\\\n]|\\.)*\])+\/[gimsuy]*)/g;
  function highlight(src, lang) {
    if (lang === 'bash' || lang === 'shell') {
      return esc(src).replace(/(^|\n)(\s*)([\w.-]+)/g, '$1$2<span class="tk-p">$3</span>').replace(/(\s)(--?[\w-]+)/g, '$1<span class="tk-k">$2</span>').replace(/(#[^\n]*)/g, '<span class="tk-c">$1</span>');
    }
    if (lang === 'text' || lang === 'plain' || lang === 'markdown') return esc(src);
    var out = '', last = 0, m;
    TOKEN.lastIndex = 0;
    while ((m = TOKEN.exec(src))) {
      out += esc(src.slice(last, m.index));
      if (m[1]) out += '<span class="tk-c">' + esc(m[1]) + '</span>';
      else if (m[2]) out += '<span class="' + (/^["'`]\$/.test(m[2]) ? 'tk-o' : 'tk-s') + '">' + esc(m[2]) + '</span>';
      else if (m[3]) out += '<span class="tk-n">' + m[3] + '</span>';
      else if (m[4]) out += '<span class="tk-o">' + esc(m[4]) + '</span>';
      else if (m[5]) out += '<span class="tk-k">' + esc(m[5]) + '</span>' + esc(m[6]);
      else if (m[7]) out += '<span class="tk-f">' + esc(m[7]) + '</span>';
      else if (m[8]) out += '<span class="tk-s">' + esc(m[8]) + '</span>';
      last = TOKEN.lastIndex;
    }
    return out + esc(src.slice(last));
  }

  function enhanceCode(root) {
    (root || document).querySelectorAll('.codeblock:not([data-ready])').forEach(function (b) {
      b.setAttribute('data-ready', '1');
      var code = b.querySelector('code'), lang = b.getAttribute('data-lang') || 'js';
      var raw = code.textContent;
      code.innerHTML = highlight(raw, lang);
      var btn = document.createElement('button'); btn.className = 'copy'; btn.type = 'button'; btn.textContent = 'Copiar';
      btn.onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(raw) : Promise.reject()).then(function () { btn.textContent = '¡Copiado!'; setTimeout(function () { btn.textContent = 'Copiar'; }, 1300); }).catch(function () { btn.textContent = 'Selecciona y copia'; }); };
      b.appendChild(btn);
    });
  }

  // ---------- quiz en línea y de lab ----------
  // opts: { q, options:[], answer, why, onRight(), onWrong() }
  function renderOptions(container, opts) {
    var wrap = document.createElement('div'); wrap.className = 'opts';
    var why = document.createElement('div'); why.className = 'why';
    opts.options.forEach(function (label, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'opt'; b.innerHTML = label;
      b.onclick = function () {
        if (i === opts.answer) {
          wrap.querySelectorAll('.opt').forEach(function (o, j) { o.disabled = true; o.classList.remove('wrong'); if (j !== i) o.classList.add('dim'); });
          b.classList.add('right'); if (opts.why) { why.innerHTML = opts.why; why.classList.add('show'); }
          confettiAt(b); if (opts.onRight) opts.onRight();
        } else {
          b.classList.remove('wrong'); void b.offsetWidth; b.classList.add('wrong');
          if (opts.wrongWhy && opts.wrongWhy[i]) { why.innerHTML = opts.wrongWhy[i]; why.classList.add('show'); }
          if (opts.onWrong) opts.onWrong(i);
        }
      };
      wrap.appendChild(b);
    });
    container.appendChild(wrap); container.appendChild(why);
    return { reveal: function () { wrap.querySelectorAll('.opt')[opts.answer].click(); } };
  }
  function initQuizzes() {
    document.querySelectorAll('.quiz[data-quiz]').forEach(function (el) {
      var cfg = JSON.parse(el.getAttribute('data-quiz'));
      el.innerHTML = '<div class="q">' + cfg.q + '</div>';
      var r = renderOptions(el, { options: cfg.options, answer: cfg.answer, why: cfg.why, wrongWhy: cfg.wrongWhy, onRight: function () { Progress.award(cfg.id, 5, 'quiz'); } });
      if (Progress.has(cfg.id, 'quiz')) { r.reveal(); }
    });
  }

  // ---------- confeti y toast ----------
  var canvas, ctx, parts = [], raf = null;
  function confettiAt(el, n) {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!canvas) { canvas = document.createElement('canvas'); canvas.id = 'confetti'; document.body.appendChild(canvas); ctx = canvas.getContext('2d'); }
    canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    var r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    var colors = ['#00ed64', '#4c9bff', '#ffffff', '#a78bfa', '#ffc66d', '#2bd46b'];
    for (var i = 0; i < (n || 70); i++) {
      parts.push({ x: r.left + Math.random() * r.width, y: r.top + r.height / 2, vx: (Math.random() - .5) * 9, vy: -Math.random() * 9 - 2, s: 4 + Math.random() * 6, a: Math.random() * 6, va: (Math.random() - .5) * .3, c: colors[i % colors.length], life: 90 + Math.random() * 40 });
    }
    if (!raf) tick();
  }
  function tick() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(function (p) { return p.life-- > 0 && p.y < innerHeight + 20; });
    parts.forEach(function (p) {
      p.vy += .22; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.globalAlpha = Math.min(1, p.life / 30); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); ctx.restore();
    });
    raf = parts.length ? requestAnimationFrame(tick) : (ctx.clearRect(0, 0, innerWidth, innerHeight), null);
  }
  function toast(html) {
    var t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html.replace(/(\+\d+ XP)/, '<b>$1</b>');
    document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2200);
  }

  // ---------- llamados a la acción: compartir y franja de mensajes ----------
  var SITE = window.MQL_SITE || {};
  var SHARE_TEXT = 'Estoy aprendiendo MongoDB (MQL) con MQL Lab: lecciones interactivas y laboratorios sobre MongoDB real.';
  function shareUrl(network, text) {
    var u = encodeURIComponent(SITE.repo || ''), t = encodeURIComponent(text || SHARE_TEXT);
    if (network === 'linkedin') return 'https://www.linkedin.com/sharing/share-offsite/?url=' + u;
    return 'https://twitter.com/intent/tweet?text=' + t + '&url=' + u + (SITE.handle ? '&via=' + encodeURIComponent(SITE.handle) : '');
  }
  function link(href, label) { return '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + label + '</a>'; }
  function initTicker() {
    var box = document.querySelector('[data-ticker]'); if (!box) return;
    var msgs = [];
    if (SITE.repo) {
      msgs.push('⭐ ¿Te está sirviendo MQL Lab? ' + link(SITE.repo, 'Dale una estrella en GitHub'));
      msgs.push('💬 Compártelo con tus compañeros: ' + link(shareUrl('linkedin'), 'LinkedIn') + ' · ' + link(shareUrl('x'), 'X'));
    }
    if (SITE.youtube) msgs.push('▶ Más contenido sobre datos en ' + link(SITE.youtube, 'YouTube · @' + (SITE.handle || '')));
    if (SITE.web) msgs.push('🌐 Más proyectos y recursos en ' + link(SITE.web, SITE.web.replace(/^https?:\/\/(www\.)?/, '')));
    if (!msgs.length) return;
    var i = 0, timer = null, still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var show = function () {
      var old = box.querySelector('.msg');
      var put = function () { box.innerHTML = '<span class="msg">' + msgs[i % msgs.length] + '</span>'; i++; };
      if (old && !still) { old.classList.add('out'); setTimeout(put, 480); } else put();
    };
    var start = function () { if (timer) return; show(); if (!still && msgs.length > 1) timer = setInterval(function () { if (!document.hidden) show(); }, 9000); };
    // empieza cuando el pie entra en pantalla: discreto, sin distraer durante la lección
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { start(); ob.disconnect(); } }).observe(box);
    else start();
  }

  // ---------- arranque ----------
  document.addEventListener('DOMContentLoaded', function () {
    renderXP(); renderSidebar(); renderStatus(); enhanceCode(); initQuizzes(); initTicker();
    var tb = document.querySelector('[data-theme-toggle]'); if (tb) tb.onclick = toggleTheme;
    var mb = document.querySelector('.menu-btn');
    if (mb) {
      var desktop = function () { return window.matchMedia('(min-width: 1101px)').matches; };
      var sync = function () {
        var open = desktop() ? !document.documentElement.classList.contains('nav-collapsed') : document.body.classList.contains('nav-open');
        mb.setAttribute('aria-expanded', open ? 'true' : 'false');
        mb.title = open ? 'Ocultar el menú' : 'Mostrar el menú';
        mb.setAttribute('aria-label', mb.title);
      };
      mb.onclick = function () {
        if (desktop()) {
          var collapsed = document.documentElement.classList.toggle('nav-collapsed');
          try { localStorage.setItem('mqlLab.nav', collapsed ? '0' : '1'); } catch (e) { /* sin almacenamiento */ }
        } else document.body.classList.toggle('nav-open');
        sync();
      };
      // en pantallas estrechas el menú es un cajón: se cierra al pulsar fuera o con Esc
      document.addEventListener('click', function (e) { if (!desktop() && document.body.classList.contains('nav-open') && !e.target.closest('.sidebar, .menu-btn')) { document.body.classList.remove('nav-open'); sync(); } });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !desktop() && document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); sync(); } });
      window.matchMedia('(min-width: 1101px)').addEventListener('change', sync);
      sync();
    }
    var rs = document.querySelector('[data-reset]'); if (rs) rs.onclick = function () { if (confirm('¿Borrar todo tu progreso y XP?')) Progress.reset(); };
  });

  window.MQLApp = { site: SITE, shareUrl: shareUrl, Progress: Progress, api: api, status: status, highlight: highlight, esc: esc, enhanceCode: enhanceCode, renderOptions: renderOptions, confettiAt: confettiAt, toast: toast };
})();
