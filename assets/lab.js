/* MQL Lab — laboratorio a pantalla dividida: tareas (izquierda) + terminal mongosh real (derecha) */
(function () {
  'use strict';
  var A = window.MQLApp, esc = A.esc;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function canon(v) {
    if (v === undefined) return '(nada)';
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6);
    return JSON.stringify(v);
  }
  function short(v) { var s = canon(v); return s.length > 140 ? s.slice(0, 140) + '…' : s; }
  function fmtTime(s) { var a = Math.abs(s), m = Math.floor(a / 60), x = a % 60; return (s < 0 ? '+' : '') + (m < 10 ? '0' : '') + m + ':' + (x < 10 ? '0' : '') + x; }

  // ======================= Terminal =======================
  function Term(lab, n) {
    this.lab = lab; this.n = n; this.session = null; this.db = lab.cfg.startDb || (window.MQL_CFG || {}).db || 'test'; this.history = []; this.hpos = 0; this.lastQuery = null; this.busy = false;
    this.screen = el('div', 'term-screen');
    this.screen.appendChild(el('p', 'ln sys', 'Conectado a tu MongoDB local a través del puente del tutorial. Escribe comandos de mongosh y pulsa Intro.\nMayús+Intro = nueva línea · ↑/↓ = historial · Ctrl+L = limpiar · help = ayuda'));
    this.inputRow = el('div', 'term-input');
    this.ps = el('span', 'ps', esc(this.db) + '&gt;');
    this.ta = el('textarea'); this.ta.rows = 1; this.ta.spellcheck = false; this.ta.setAttribute('autocapitalize', 'off'); this.ta.setAttribute('aria-label', 'Entrada de la terminal mongosh');
    this.inputRow.appendChild(this.ps); this.inputRow.appendChild(this.ta); this.screen.appendChild(this.inputRow);
    var self = this;
    this.screen.addEventListener('mouseup', function () { if (!window.getSelection().toString()) self.ta.focus(); });
    this.ta.addEventListener('input', function () { self.grow(); });
    this.ta.addEventListener('keydown', function (e) { self.key(e); });
  }
  Term.prototype.grow = function () { this.ta.style.height = 'auto'; this.ta.style.height = this.ta.scrollHeight + 'px'; };
  Term.prototype.print = function (cls, html) { this.screen.insertBefore(el('p', 'ln ' + cls, html), this.inputRow); this.screen.scrollTop = this.screen.scrollHeight; };
  Term.prototype.setDb = function (db) { this.db = db; this.ps.innerHTML = esc(db) + '&gt;'; };
  Term.prototype.clear = function () { this.screen.querySelectorAll('.ln').forEach(function (n) { n.remove(); }); };
  Term.prototype.key = function (e) {
    var ta = this.ta, v = ta.value;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (!this.busy) this.submit(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l') { e.preventDefault(); this.clear(); return; }
    if (e.key === 'Tab') { e.preventDefault(); var s = ta.selectionStart; ta.value = v.slice(0, s) + '  ' + v.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; return; }
    if (e.key === 'ArrowUp' && v.lastIndexOf('\n', ta.selectionStart - 1) < 0 && this.history.length) { e.preventDefault(); this.hpos = Math.max(0, this.hpos - 1); ta.value = this.history[this.hpos] || ''; this.grow(); return; }
    if (e.key === 'ArrowDown' && v.indexOf('\n', ta.selectionStart) < 0 && this.history.length) { e.preventDefault(); this.hpos = Math.min(this.history.length, this.hpos + 1); ta.value = this.history[this.hpos] || ''; this.grow(); }
  };
  Term.prototype.paste = function (code) { this.ta.value = code; this.grow(); this.ta.focus(); };
  Term.prototype.submit = function () {
    var self = this, code = this.ta.value;
    if (!code.trim()) { this.print('cmd', '<span class="ps">' + esc(this.db) + '&gt;</span> '); return; }
    if (/^\s*(clear|cls)\s*;?\s*$/.test(code)) { this.ta.value = ''; this.clear(); return; }
    this.busy = true; this.screen.classList.add('term-busy'); this.ps.innerHTML = '<span class="spin"></span>';
    A.api('exec', { session: this.session, db: this.lab.cfg.startDb, code: code }).then(function (r) {
      if (r.incomplete) { self.ta.value = code + '\n'; self.grow(); return; }
      self.history.push(code); self.hpos = self.history.length; self.ta.value = ''; self.grow();
      self.print('cmd', '<span class="ps">' + esc(self.db) + '&gt;</span> ' + A.highlight(code));
      if (r.session) self.session = r.session;
      var out = r.out || '';
      if (out) {
        var bad = r.blocked || /^(Uncaught|MongoServerError|SyntaxError|TypeError|ReferenceError|MongoshInvalidInputError|Error)/m.test(out);
        var html = out.split('\n').map(function (line) {
          if (/^(Uncaught|Mongo\w*Error|SyntaxError|TypeError|ReferenceError|Bloqueado)/.test(line) || r.blocked) return '<span class="err">' + esc(line) + '</span>';
          if (/^(DeprecationWarning|See https)/.test(line)) return '<span class="warn">' + esc(line) + '</span>';
          if (/^Tiempo agotado/.test(line)) return '<span class="warn">' + esc(line) + '</span>';
          return A.highlight(line);
        }).join('\n');
        self.print('out', html);
        if (!bad && /\bdb\b/.test(code) && !/^\s*(use|show|it|var|let|const|function|print|exit)\b/.test(code)) self.lastQuery = code;
      }
      if (r.db) self.setDb(r.db);
      self.lab.onCommand(self, code, out);
    }).catch(function () {
      self.print('err', 'No hay conexión con el servidor del tutorial. ¿Está ejecutándose «node server.js»?');
    }).then(function () { self.busy = false; self.screen.classList.remove('term-busy'); if (self.ps.querySelector('.spin')) self.setDb(self.db); self.ta.focus(); });
  };
  Term.prototype.reset = function () {
    var self = this;
    this.clear(); this.lastQuery = null; this.history = []; this.hpos = 0;
    if (!this.session) return;
    A.api('reset', { session: this.session, db: this.lab.cfg.startDb }).then(function (r) { self.session = r.session; self.setDb(r.db); self.print('sys', 'Sesión de mongosh reiniciada.'); });
  };

  // ======================= Lab =======================
  function Lab(mount, cfg) {
    this.cfg = cfg; this.id = cfg.id; this.steps = cfg.steps; this.i = 0; this.tab = 'task'; this.hints = {}; this.terms = []; this.term = null;
    var P = A.Progress;
    // continuar donde lo dejaste
    for (var k = 0; k < this.steps.length; k++) { if (!P.has(this.key(k)) && this.steps[k].kind !== 'info') { this.i = k; break; } this.i = Math.min(k + 1, this.steps.length - 1); }
    if (this.steps.every(function (s, j) { return s.kind === 'info' || P.has(cfg.id + ':' + j); })) this.i = 0;
    this.build(mount); this.render(); this.startTimer();
  }
  Lab.prototype.key = function (i) { return this.id + ':' + i; };
  Lab.prototype.passed = function (i) { return this.steps[i].kind === 'info' || A.Progress.has(this.key(i)); };

  Lab.prototype.build = function (mount) {
    var self = this;
    var root = el('div', 'lab'); this.root = root;
    // ---- izquierda
    var left = el('section', 'lab-panel');
    var head = el('div', 'lab-head');
    this.tTask = el('button', 'lab-tab on', 'Task'); this.tHint = el('button', 'lab-tab', 'Hint<span class="badge">0</span>');
    this.tTask.type = this.tHint.type = 'button';
    this.tTask.onclick = function () { self.tab = 'task'; self.render(); };
    this.tHint.onclick = function () { self.tab = 'hint'; self.render(); };
    this.timerEl = el('span', 'timer', '⏱ 00:00');
    var max1 = el('button', 'ghost', '⤢'); max1.type = 'button'; max1.title = 'Pantalla completa'; max1.onclick = function () { self.toggleMax(); };
    head.appendChild(this.tTask); head.appendChild(this.tHint); head.appendChild(el('span', 'grow')); head.appendChild(this.timerEl); head.appendChild(max1);
    this.body = el('div', 'lab-body');
    left.appendChild(head); left.appendChild(this.body);
    // ---- divisor
    var div = el('div', 'divider'); div.title = 'Arrastra para ajustar';
    div.addEventListener('pointerdown', function (e) {
      e.preventDefault(); div.setPointerCapture(e.pointerId);
      var move = function (ev) { var r = root.getBoundingClientRect(); var pct = Math.min(70, Math.max(25, (ev.clientX - r.left) / r.width * 100)); root.style.setProperty('--split', pct + '%'); };
      var up = function () { div.removeEventListener('pointermove', move); div.removeEventListener('pointerup', up); };
      div.addEventListener('pointermove', move); div.addEventListener('pointerup', up);
    });
    // ---- derecha (terminal)
    var right = el('section', 'lab-panel term');
    var thead = el('div', 'lab-head');
    this.tabsEl = el('div', 'term-tabs');
    var plus = el('button', 'ghost', '+'); plus.type = 'button'; plus.title = 'Nueva terminal'; plus.style.fontSize = '1.3rem'; plus.onclick = function () { self.addTerm(); };
    var rst = el('button', 'ghost', '<span class="sq"></span>Reiniciar'); rst.type = 'button'; rst.title = 'Reinicia la sesión de mongosh de esta pestaña'; rst.onclick = function () { self.term.reset(); };
    var max2 = el('button', 'ghost', '⤢'); max2.type = 'button'; max2.title = 'Pantalla completa'; max2.onclick = function () { self.toggleMax(); };
    thead.appendChild(this.tabsEl); thead.appendChild(plus); thead.appendChild(el('span', 'grow')); thead.appendChild(rst); thead.appendChild(max2);
    this.termHost = el('div'); this.termHost.style.cssText = 'flex:1;display:flex;flex-direction:column;min-height:0';
    right.appendChild(thead); right.appendChild(this.termHost);
    root.appendChild(left); root.appendChild(div); root.appendChild(right);
    mount.appendChild(root);
    this.addTerm();
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('max')) self.toggleMax(); });
  };
  Lab.prototype.toggleMax = function () { this.root.classList.toggle('max'); document.body.style.overflow = this.root.classList.contains('max') ? 'hidden' : ''; };
  Lab.prototype.addTerm = function () {
    var self = this, t = new Term(this, this.terms.length + 1);
    this.terms.push(t); this.showTerm(t); return t;
  };
  Lab.prototype.showTerm = function (t) {
    var self = this; this.term = t;
    this.termHost.innerHTML = ''; this.termHost.appendChild(t.screen);
    this.tabsEl.innerHTML = '';
    this.terms.forEach(function (x) {
      var b = el('button', 'term-tab' + (x === t ? ' on' : ''), 'Terminal ' + x.n); b.type = 'button';
      b.onclick = function () { self.showTerm(x); };
      if (self.terms.length > 1) { var c = el('span', 'x', '×'); c.title = 'Cerrar'; c.onclick = function (e) { e.stopPropagation(); self.closeTerm(x); }; b.appendChild(c); }
      self.tabsEl.appendChild(b);
    });
    setTimeout(function () { t.ta.focus({ preventScroll: true }); }, 0);
  };
  Lab.prototype.closeTerm = function (t) { if (t.session) A.api('reset', { session: t.session }).catch(function () {}); this.terms.splice(this.terms.indexOf(t), 1); this.showTerm(this.terms[this.terms.length - 1]); };
  Lab.prototype.onCommand = function (term) {
    var s = this.steps[this.i];
    // comprobación automática de pasos de tipo "db" (por ejemplo, tras un `use`)
    if (s && s.kind === 'task' && s.check && s.check.type === 'db' && !this.passed(this.i)) this.check(true);
  };

  Lab.prototype.startTimer = function () {
    var self = this, total = (this.cfg.minutes || 30) * 60, t0 = Date.now();
    setInterval(function () { var left = total - Math.floor((Date.now() - t0) / 1000); self.timerEl.textContent = '⏱ ' + fmtTime(left); self.timerEl.classList.toggle('over', left < 0); }, 1000);
  };

  // ---- renderizado del panel izquierdo
  Lab.prototype.render = function () {
    var self = this, s = this.steps[this.i], b = this.body;
    this.tTask.classList.toggle('on', this.tab === 'task'); this.tHint.classList.toggle('on', this.tab === 'hint');
    var nh = (s.hints || []).length + (s.solution ? 1 : 0);
    this.tHint.querySelector('.badge').textContent = nh;
    b.innerHTML = '';
    // segmentos
    var seg = el('div', 'segments');
    this.steps.forEach(function (_, j) { seg.appendChild(el('i', j === self.i ? 'cur' : self.passed(j) ? 'done' : '')); });
    b.appendChild(seg);
    // navegación
    var nav = el('div', 'step-nav');
    var prev = el('button', 'prev', '← Anterior'); prev.type = 'button'; prev.disabled = this.i === 0; prev.onclick = function () { self.go(self.i - 1); };
    var last = this.i === this.steps.length - 1;
    var skip = s.optional && !this.passed(this.i);
    var next = el('button', 'next', skip ? 'Saltar →' : last ? 'Finalizar ✓' : 'Next →'); next.type = 'button'; next.disabled = !this.passed(this.i) && !s.optional;
    next.title = next.disabled ? 'Completa este paso para continuar' : '';
    next.onclick = function () { if (last) self.finish(); else self.go(self.i + 1); };
    this.nextBtn = next;
    nav.appendChild(prev); nav.appendChild(next);
    if (this.tab === 'hint') {
      var back = el('button', 'back-task', '← Volver a la tarea'); back.type = 'button';
      back.onclick = function () { self.tab = 'task'; self.render(); };
      var hn = el('div', 'step-nav'); hn.appendChild(back); hn.appendChild(el('span', 'muted', '<small>Pistas · paso ' + (this.i + 1) + ' / ' + this.steps.length + '</small>'));
      b.appendChild(hn);
      if (s.title) b.appendChild(el('div', 'step-title', s.title));
      this.renderHints(b, s);
      var back2 = el('button', 'btn subtle back-bottom', '← Volver a la tarea y comprobar'); back2.type = 'button';
      back2.onclick = back.onclick; b.appendChild(back2);
    } else {
      b.appendChild(nav);
      b.appendChild(el('div', 'step-count', (this.i + 1) + ' / ' + this.steps.length));
      this.renderTask(b, s);
    }
    A.enhanceCode(b);
  };
  Lab.prototype.go = function (i) { this.i = i; this.tab = 'task'; this.render(); this.body.scrollTop = 0; };
  Lab.prototype.markPassed = function (anchor) {
    var s = this.steps[this.i];
    A.Progress.award(this.key(this.i), s.xp || (s.kind === 'quiz' ? 10 : 20));
    A.confettiAt(anchor || this.nextBtn);
    this.nextBtn.disabled = false; this.nextBtn.title = ''; this.nextBtn.textContent = this.i === this.steps.length - 1 ? 'Finalizar ✓' : 'Next →';
    this.body.querySelectorAll('.segments i')[this.i].className = 'cur done';
  };
  Lab.prototype.finish = function () {
    A.Progress.completeLab(this.id);
    this.body.innerHTML = '<div class="lab-done"><div class="big">🏆</div><div class="step-title">¡Laboratorio completado!</div><p class="step-body">' + (this.cfg.done || 'Has superado todos los pasos.') + '</p></div>';
    var again = el('button', 'btn subtle', 'Repasar desde el principio'); again.type = 'button';
    var self = this; again.onclick = function () { self.go(0); };
    this.body.querySelector('.lab-done').appendChild(again);
    // llamado a la acción discreto: estrella y compartir (solo si el repositorio es público), o seguir en YouTube
    var S = A.site || {}, cta = el('div', 'lab-cta');
    var btn = function (href, cls, label) { return '<a class="' + cls + '" href="' + esc(href) + '" target="_blank" rel="noopener">' + label + '</a>'; };
    if (S.repo) {
      var txt = 'He completado «' + this.cfg.title + '» en MQL Lab: lecciones interactivas de MongoDB con laboratorios sobre MongoDB real.';
      cta.innerHTML = '<p>¿Te ha servido? Una ⭐ en GitHub ayuda a que llegue a más compañeros.</p><div class="row">' + btn(S.repo, 'star', '⭐ Dar una estrella') + btn(A.shareUrl('linkedin', txt), 'li', 'Compartir en LinkedIn') + btn(A.shareUrl('x', txt), 'tw', 'Compartir en X') + '</div>';
    } else if (S.youtube) {
      cta.innerHTML = '<p>¿Quieres más contenido como este?</p><div class="row">' + btn(S.youtube, 'yt', '▶ Suscríbete en YouTube') + '</div>';
    }
    if (cta.innerHTML) this.body.querySelector('.lab-done').appendChild(cta);
    A.confettiAt(this.body, 160);
  };

  Lab.prototype.renderTask = function (b, s) {
    var self = this;
    if (s.title) b.appendChild(el('div', 'step-title', s.title));
    if (s.body) b.appendChild(el('div', 'step-body', s.body));
    if (s.kind === 'quiz') {
      var host = el('div'); b.appendChild(host);
      var q = s.q ? el('div', 'step-body', '<p><b>' + s.q + '</b></p>') : null; if (q) host.appendChild(q);
      var draw = function (options) {
        var r = A.renderOptions(host, { options: options, answer: s.answer, why: s.why, wrongWhy: s.wrongWhy, onRight: function () { if (!self.passed(self.i)) self.markPassed(); } });
        if (self.passed(self.i)) r.reveal();
      };
      if (s.live) {
        var wait = el('p', 'step-body', '<span class="spin"></span> Consultando tu base de datos…'); host.appendChild(wait);
        A.api('eval', { target: 'system', code: s.live, mode: 'docs', cap: 1 }).then(function (r) {
          wait.remove();
          var v = r.ok ? r.value.docs[0] : '?';
          var shown = typeof v === 'number' ? v.toLocaleString('es-ES') : String(v);
          var opts = s.options.map(function (o) { return o === '{{live}}' ? shown : o; });
          // si una opción incorrecta coincide con el valor real de este equipo, se sustituye
          opts = opts.map(function (o, k) {
            if (k === s.answer || o !== shown) return o;
            var ver = /^(\d+)\.(\d+)\.(\d+)$/.exec(shown);
            if (ver) return Math.max(1, +ver[1] - k - 1) + '.0.' + (10 + k);
            if (typeof v === 'number') return Math.round(v * (k + 2) / 3).toLocaleString('es-ES');
            return o + ' ';
          });
          draw(opts);
        }).catch(function () { wait.innerHTML = 'No se pudo consultar MongoDB (¿está arrancado <code>node server.js</code>?).'; });
      } else draw(s.options);
      return;
    }
    if (s.kind === 'task') {
      var bar = el('div', 'check-bar');
      var chk = el('button', 'btn primary', 'Comprobar'); chk.type = 'button';
      chk.onclick = function () { self.check(false, chk); };
      var hint = el('button', 'btn subtle', '💡 Pistas'); hint.type = 'button'; hint.onclick = function () { self.tab = 'hint'; self.render(); };
      bar.appendChild(chk); bar.appendChild(hint);
      if (s.check && s.check.type === 'query') bar.appendChild(el('span', 'muted', '<small>Se valida la última consulta que ejecutaste en la terminal activa.</small>'));
      b.appendChild(bar);
      this.checksEl = el('ul', 'checks'); b.appendChild(this.checksEl);
      if (this.passed(this.i)) b.appendChild(el('div', 'passed-banner', '✓ Paso completado. Puedes seguir con <b>Next →</b> o repetirlo para practicar.'));
    }
  };

  Lab.prototype.renderHints = function (b, s) {
    var self = this, shown = this.hints[this.i] || 0, hints = s.hints || [];
    if (!hints.length && !s.solution) { b.appendChild(el('p', 'step-body muted', 'Este paso no tiene pistas.')); return; }
    for (var k = 0; k < shown && k < hints.length; k++) b.appendChild(el('div', 'hint-card', '<div class="h">Pista ' + (k + 1) + ' de ' + hints.length + '</div><div class="step-body">' + hints[k] + '</div>'));
    if (shown < hints.length) {
      var more = el('button', 'btn subtle', 'Mostrar pista ' + (shown + 1)); more.type = 'button';
      more.onclick = function () { self.hints[self.i] = shown + 1; self.render(); };
      b.appendChild(more);
    } else if (s.solution) {
      if (shown > hints.length) {
        var card = el('div', 'hint-card sol', '<div class="h">Solución (modo estudio)</div><div class="codeblock" data-lang="js"><pre><code>' + esc(s.solution) + '</code></pre></div>' + (s.explain ? '<div class="step-body">' + s.explain + '</div>' : ''));
        b.appendChild(card);
        var put = el('button', 'btn primary', 'Pegar en la terminal'); put.type = 'button';
        put.onclick = function () { self.term.paste(s.solution); self.tab = 'task'; self.render(); A.toast('Solución pegada en la terminal: pulsa Intro y luego «Comprobar»'); };
        b.appendChild(put);
      } else {
        var sol = el('button', 'btn subtle', '🔓 Ver solución'); sol.type = 'button';
        sol.onclick = function () { self.hints[self.i] = hints.length + 1; self.render(); };
        b.appendChild(el('p', 'step-body muted', 'Ya has visto todas las pistas. Intenta una vez más antes de mirar la solución: escribirla tú es lo que fija el concepto.'));
        b.appendChild(sol);
      }
    }
  };

  // ---- validación contra MongoDB real
  Lab.prototype.check = function (silent, btn) {
    var self = this, s = this.steps[this.i], c = s.check, idx = this.i;
    var list = this.checksEl; if (!list) return;
    var show = function (items) {
      if (self.i !== idx || self.tab !== 'task') return;
      list.innerHTML = '';
      items.forEach(function (it, k) {
        var li = el('li', it.ok ? 'ok' : 'ko', '<span class="ic">' + (it.ok ? '✓' : '✕') + '</span><div>' + it.label + (it.detail ? '<small>' + esc(it.detail) + '</small>' : '') + '</div>');
        li.style.animationDelay = (k * 70) + 'ms'; list.appendChild(li);
      });
      var ok = items.every(function (x) { return x.ok; });
      if (ok && !self.passed(self.i)) { self.markPassed(btn); list.parentNode.appendChild(el('div', 'passed-banner', '✓ ¡Correcto! ' + (s.success || 'Pulsa <b>Next →</b> para continuar.'))); }
    };
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span> Comprobando…'; }
    var done = function () { if (btn) { btn.disabled = false; btn.textContent = 'Comprobar'; } };

    if (c.type === 'db') {
      var ok = this.term.db === c.db;
      if (silent && !ok) return done();
      show([{ ok: ok, label: c.label || ('La terminal activa está usando la base de datos «' + c.db + '»'), detail: ok ? '' : 'Base de datos actual: ' + this.term.db }]);
      return done();
    }
    if (c.type === 'state') {
      A.api('eval', { target: 'system', code: c.code, mode: 'docs', cap: 1 }).then(function (r) {
        var v = r.ok ? r.value.docs[0] : undefined;
        var ok = r.ok && (c.expect === undefined ? !!v : canon(v) === canon(c.expect));
        show([{ ok: ok, label: c.label, detail: ok ? '' : (r.ok ? 'Estado actual: ' + short(v) : r.error) }]);
      }).catch(function () { show([{ ok: false, label: 'No hay conexión con el servidor del tutorial' }]); }).then(done);
      return;
    }
    if (c.type === 'query') {
      var q = this.term.lastQuery;
      if (!q) { show([{ ok: false, label: 'Aún no has ejecutado ninguna consulta válida en la terminal activa', detail: 'Escribe tu consulta en la terminal, pulsa Intro y vuelve a «Comprobar».' }]); return done(); }
      var mode = c.mode || 'docs', cap = c.cap || (mode === 'ids' ? 3000 : 500);
      Promise.all([
        A.api('eval', { target: 'session', session: this.term.session, code: q, mode: mode, cap: cap }),
        A.api('eval', { target: 'system', code: c.ref, mode: mode, cap: cap })
      ]).then(function (rs) { show(compare(rs[0], rs[1], c, q)); }, function () { show([{ ok: false, label: 'No hay conexión con el servidor del tutorial' }]); })
        .catch(function (e) { console.error(e); show([{ ok: false, label: 'Error interno al comparar resultados', detail: String(e && e.message) }]); }).then(done);
    }
  };

  function compare(u, r, c, q) {
    var items = [];
    items.push({ ok: u.ok, label: 'La consulta se ejecuta sin errores', detail: u.ok ? q.replace(/\s+/g, ' ').slice(0, 160) : String(u.error).slice(0, 400) });
    if (!u.ok) return items;
    if (!r.ok) { items.push({ ok: false, label: 'Error en la solución de referencia (avísame: es un fallo del tutorial)', detail: r.error }); return items; }
    var U = u.value, R = r.value;
    items.push({ ok: U.total === R.total, label: 'Número de resultados: ' + R.total, detail: U.total === R.total ? '' : 'Tu consulta devuelve ' + U.total + '.' + (U.total > R.total ? ' Sobran resultados: ¿falta alguna condición del filtro?' : ' Faltan resultados: ¿alguna condición es demasiado estricta?') });
    var rd = R.docs, ud = U.docs;
    if ((c.mode || 'docs') === 'docs' && rd.length && rd[0] && typeof rd[0] === 'object' && !Array.isArray(rd[0]) && ud.length && ud[0] && typeof ud[0] === 'object') {
      var rk = Object.keys(rd[0]).sort().join(', '), uk = Object.keys(ud[0]).sort().join(', ');
      items.push({ ok: rk === uk, label: 'Los resultados tienen los campos esperados', detail: rk === uk ? rk : 'Esperados: ' + rk + '\nObtenidos: ' + uk });
    }
    var label = c.ordered ? 'Los resultados y su orden coinciden con lo esperado' : 'Los resultados coinciden con lo esperado';
    var ok, detail = '';
    if (c.ordered) {
      var bad = -1; for (var i = 0; i < Math.max(rd.length, ud.length); i++) if (canon(rd[i]) !== canon(ud[i])) { bad = i; break; }
      ok = bad < 0; if (!ok) detail = 'Primera diferencia en la posición ' + (bad + 1) + ':\nesperado ' + short(rd[bad]) + '\nobtenido ' + short(ud[bad]);
    } else {
      var count = {}; rd.forEach(function (d) { var k = canon(d); count[k] = (count[k] || 0) + 1; });
      var extra = []; ud.forEach(function (d) { var k = canon(d); if (count[k]) count[k]--; else extra.push(d); });
      var missing = []; Object.keys(count).forEach(function (k) { for (var j = 0; j < count[k]; j++) missing.push(k); });
      ok = !extra.length && !missing.length;
      if (!ok) detail = (missing.length ? 'Faltan ' + missing.length + ', p. ej. ' + missing[0].slice(0, 140) : '') + (extra.length ? (missing.length ? '\n' : '') + 'Sobran ' + extra.length + ', p. ej. ' + short(extra[0]) : '');
    }
    items.push({ ok: ok, label: label + (R.total > rd.length ? ' (se comparan los primeros ' + rd.length + ')' : ''), detail: detail });
    (c.extra || []).forEach(function (x) {
      var pass; try { pass = !!new Function('docs', 'total', 'return (' + x.test + ')')(ud, U.total); } catch (e) { pass = false; }
      items.push({ ok: pass, label: x.label, detail: pass ? '' : (x.hint || '') });
    });
    return items;
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.lab-mount').forEach(function (m) {
      var cfg = JSON.parse(m.querySelector('script[type="application/json"]').textContent);
      new Lab(m, cfg);
    });
  });
})();
