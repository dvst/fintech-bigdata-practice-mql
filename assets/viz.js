/* MQL Lab — visualizaciones interactivas (se ejecutan en el navegador con mingo sobre mini-documentos)
   .viz-doctree  explorador de un documento: ruta con puntos, tipo y consulta de ejemplo
   .viz-play     playground de filtros: qué documentos cumplen un filtro
   .viz-pipe     etapas paso a paso (find encadenado o pipeline de agregación)
   .viz-regex    probador de expresiones regulares                                                   */
(function () {
  'use strict';
  var A = window.MQLApp, esc = A.esc, hl = A.highlight;
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function cfgOf(node) { return JSON.parse(node.getAttribute('data-cfg')); }
  var ident = /^[A-Za-z_$][\w$]*$/;
  function q(s) { return "'" + String(s).replace(/'/g, "\\'") + "'"; }
  // formato tipo mongosh, compacto
  function fmt(v, ind, width) {
    ind = ind || 0; width = width || 56;
    if (v === null) return 'null'; if (v === undefined) return 'undefined';
    if (typeof v === 'string') return q(v);
    if (typeof v !== 'object') return String(v);
    var arr = Array.isArray(v), keys = arr ? null : Object.keys(v);
    if (arr ? !v.length : !keys.length) return arr ? '[]' : '{}';
    var items = arr ? v.map(function (x) { return fmt(x, ind + 2, width); }) : keys.map(function (k) { return (ident.test(k) ? k : q(k)) + ': ' + fmt(v[k], ind + 2, width); });
    var one = (arr ? '[ ' : '{ ') + items.join(', ') + (arr ? ' ]' : ' }');
    if (one.length + ind <= width && one.indexOf('\n') < 0) return one;
    var pad = new Array(ind + 3).join(' ');
    return (arr ? '[' : '{') + '\n' + items.map(function (i) { return pad + i; }).join(',\n') + '\n' + new Array(ind + 1).join(' ') + (arr ? ']' : '}');
  }
  function parseExpr(txt) { return new Function('return (' + txt + '\n)')(); }
  function keyOf(d) { return d && d._id !== undefined ? String(d._id) : JSON.stringify(d); }
  function typeName(v) { if (v === null) return 'null'; if (Array.isArray(v)) return 'array'; if (typeof v === 'number') return Number.isInteger(v) ? 'int' : 'double'; if (typeof v === 'object') return 'object'; return typeof v; }
  var mingoOpts = function () { var o = {}; if (mingo.ProcessingMode && mingo.ProcessingMode.CLONE_INPUT !== undefined) o.processingMode = mingo.ProcessingMode.CLONE_INPUT; return o; };

  // ---------------------------------------------------------------- explorador de documento
  function doctree(node) {
    var cfg = cfgOf(node), doc = cfg.doc, col = (window.MQL_CFG || {}).col || 'facturas';
    node.innerHTML = '';
    var wrap = el('div', 'dt-wrap'), tree = el('div', 'dt-tree'), info = el('div', 'dt-info', '<div class="dt-empty">👆 Pulsa cualquier campo del documento para ver su <b>ruta</b>, su <b>tipo</b> y cómo se consulta.</div>');
    wrap.appendChild(tree); wrap.appendChild(info); node.appendChild(wrap);
    var selected = null;
    function select(row, qpath, ppath, v) {
      if (selected) selected.classList.remove('on'); selected = row; row.classList.add('on');
      var t = typeName(v), sample = (t === 'object' || t === 'array') ? null : v;
      var html = '<div class="dt-k">Ruta para consultar</div><div class="dt-path">' + esc(qpath) + '</div>';
      if (ppath !== qpath) html += '<div class="dt-k">Ruta posicional (este elemento concreto)</div><div class="dt-path dim">' + esc(ppath) + '</div>';
      html += '<div class="dt-k">Tipo BSON</div><span class="dt-type t-' + t + '">' + t + '</span>';
      if (t === 'array') html += '<p class="dt-note">Un <b>array</b>: si consultas un campo de sus elementos (<code>' + esc(qpath) + '.X</code>), MongoDB mira <b>todos</b> los elementos.</p>';
      if (t === 'object') html += '<p class="dt-note">Un <b>subdocumento</b>: sus campos se alcanzan añadiendo <code>.campo</code> a la ruta.</p>';
      if (/ /.test(qpath)) html += '<p class="dt-note">⚠️ La ruta tiene espacios: siempre entre comillas.</p>';
      if (sample !== null) html += '<div class="dt-k">Consulta de ejemplo</div><div class="codeblock" data-lang="js"><pre><code>' + esc('db.' + col + '.find({ "' + qpath + '": ' + JSON.stringify(sample) + ' })') + '</code></pre></div>';
      info.innerHTML = html; A.enhanceCode(info);
    }
    function render(v, key, qpath, ppath, depth, parent, inArray) {
      var t = typeName(v), row = el('div', 'dt-row');
      row.style.paddingLeft = (depth * 16 + 8) + 'px';
      var label = key === null ? '' : '<span class="dt-key' + (inArray ? ' idx' : '') + '">' + esc(inArray ? '[' + key + ']' : key) + '</span>: ';
      var container = t === 'object' || t === 'array';
      if (container) {
        var n = t === 'array' ? v.length : Object.keys(v).length;
        row.innerHTML = '<span class="dt-tog">▸</span>' + label + '<span class="dt-sum">' + (t === 'array' ? '[ ' + n + ' elementos ]' : '{ ' + n + ' campos }') + '</span>';
        var kids = el('div', 'dt-kids'); kids.hidden = depth >= 1;
        if (!kids.hidden) row.querySelector('.dt-tog').textContent = '▾';
        parent.appendChild(row); parent.appendChild(kids);
        var built = false;
        var build = function () {
          if (built) return; built = true;
          if (t === 'array') v.forEach(function (x, i) { render(x, i, qpath, ppath + '.' + i, depth + 1, kids, true); });
          else Object.keys(v).forEach(function (k) { var qp = qpath ? qpath + '.' + k : k; render(v[k], k, qp, ppath ? ppath + '.' + k : k, depth + 1, kids, false); });
        };
        if (!kids.hidden) build();
        row.onclick = function (e) { if (e.target.classList.contains('dt-tog') || kids.hidden) { build(); kids.hidden = !kids.hidden; row.querySelector('.dt-tog').textContent = kids.hidden ? '▸' : '▾'; } if (qpath) select(row, qpath, ppath, v); };
      } else {
        row.innerHTML = '<span class="dt-tog"></span>' + label + '<span class="dt-val">' + hl(fmt(v)) + '</span>';
        row.onclick = function () { select(row, qpath, ppath, v); };
        parent.appendChild(row);
      }
    }
    render(doc, null, '', '', 0, tree, false);
  }

  // ---------------------------------------------------------------- tarjetas de documentos
  function cards(host, docs, opts) {
    opts = opts || {};
    host.innerHTML = '';
    docs.forEach(function (d, i) {
      var c = el('div', 'vcard ' + (opts.cls ? opts.cls(d, i) : ''));
      c.innerHTML = (opts.badge ? opts.badge(d, i) : '') + '<pre>' + hl(fmt(d, 0, opts.width || 46)) + '</pre>';
      c.style.animationDelay = Math.min(i * 40, 400) + 'ms';
      host.appendChild(c);
    });
    if (!docs.length) host.appendChild(el('div', 'vempty', 'Ningún documento'));
  }

  // ---------------------------------------------------------------- playground de filtros
  function play(node) {
    var cfg = cfgOf(node);
    node.innerHTML = '';
    var top = el('div', 'vp-top');
    var ed = el('textarea', 'vp-ed'); ed.value = cfg.filter || '{}'; ed.spellcheck = false; ed.rows = 2;
    var label = el('div', 'vp-label', '<code>db.' + ((window.MQL_CFG || {}).col || 'facturas') + '.find(</code> filtro <code>)</code> · edítalo y mira qué documentos cumplen');
    top.appendChild(label); top.appendChild(ed);
    var pres = el('div', 'vp-presets');
    (cfg.presets || []).forEach(function (p) {
      var b = el('button', 'chip', esc(p.label)); b.type = 'button';
      b.onclick = function () { ed.value = p.code; pres.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); run(); if (p.note) note.innerHTML = p.note; };
      pres.appendChild(b);
    });
    var status = el('div', 'vp-status'), note = el('div', 'vp-note', cfg.note || ''), grid = el('div', 'vgrid');
    node.appendChild(top); if (cfg.presets) node.appendChild(pres); node.appendChild(status); node.appendChild(note); node.appendChild(grid);
    function run() {
      var f;
      try { f = parseExpr(ed.value || '{}'); var qq = new mingo.Query(f); var hits = cfg.docs.map(function (d) { return qq.test(d); }); }
      catch (e) { status.className = 'vp-status err'; status.textContent = '⚠ ' + e.message; return; }
      var n = hits.filter(Boolean).length;
      status.className = 'vp-status'; status.innerHTML = '<b>' + n + '</b> de ' + cfg.docs.length + ' documentos cumplen el filtro';
      cards(grid, cfg.docs, { cls: function (d, i) { return hits[i] ? 'hit' : 'miss'; }, badge: function (d, i) { return '<span class="vbadge">' + (hits[i] ? '✓' : '✕') + '</span>'; } });
    }
    var t; ed.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 250); });
    ed.addEventListener('keydown', function (e) { if (e.key === 'Tab') { e.preventDefault(); var s = ed.selectionStart; ed.value = ed.value.slice(0, s) + '  ' + ed.value.slice(ed.selectionEnd); ed.selectionStart = ed.selectionEnd = s + 2; } });
    run();
  }

  // ---------------------------------------------------------------- etapas paso a paso
  function pipe(node) {
    var cfg = cfgOf(node);
    node.innerHTML = '';
    var bar = el('div', 'vpipe-bar'), grid = el('div', 'vgrid'), cap = el('div', 'vpipe-cap');
    var steps = [{ label: cfg.inputLabel || 'Colección', code: '', explain: cfg.inputExplain || 'Documentos de partida.' }].concat(cfg.stages);
    var btns = steps.map(function (s, i) {
      var b = el('button', 'vstage', '<span class="n">' + (i === 0 ? '◉' : i) + '</span><span>' + esc(s.label) + '</span>'); b.type = 'button';
      b.onclick = function () { show(i); };
      bar.appendChild(b); if (i < steps.length - 1) bar.appendChild(el('span', 'varrow', '→'));
      return b;
    });
    var ctl = el('div', 'vpipe-ctl');
    var prev = el('button', 'btn subtle', '◀'), next = el('button', 'btn primary', 'Siguiente etapa ▶'), playB = el('button', 'btn subtle', '▶ Reproducir');
    [prev, next, playB].forEach(function (b) { b.type = 'button'; ctl.appendChild(b); });
    node.appendChild(bar); node.appendChild(cap); node.appendChild(ctl); node.appendChild(grid);
    var cur = 0, last = null, timer = null;
    function result(i) {
      if (i === 0) return cfg.docs;
      var stages = cfg.stages.slice(0, i).map(function (s) { return s.stage; });
      return new mingo.Aggregator(stages, mingoOpts()).run(cfg.docs);
    }
    function show(i) {
      cur = i;
      btns.forEach(function (b, j) { b.classList.toggle('on', j === i); b.classList.toggle('past', j < i); });
      var s = steps[i], docs;
      try { docs = result(i); } catch (e) { cap.innerHTML = '<span class="err">⚠ ' + esc(e.message) + '</span>'; return; }
      cap.innerHTML = (s.code ? '<div class="codeblock" data-lang="js"><pre><code>' + esc(s.code) + '</code></pre></div>' : '') + '<p>' + s.explain + ' <span class="muted">→ ' + docs.length + ' documento' + (docs.length === 1 ? '' : 's') + '</span></p>';
      A.enhanceCode(cap);
      var before = last ? last.map(keyOf) : [], now = docs.map(keyOf);
      var removed = last && i > 0 && steps[i].keepRemoved !== false ? last.filter(function (d) { return now.indexOf(keyOf(d)) < 0; }) : [];
      var showDocs = docs.concat(cfg.showRemoved === false ? [] : removed);
      cards(grid, showDocs, { width: cfg.width, cls: function (d, k) { return k >= docs.length ? 'out' : before.indexOf(keyOf(d)) < 0 && last ? 'new' : ''; } });
      last = docs;
      prev.disabled = i === 0; next.disabled = i === steps.length - 1;
    }
    prev.onclick = function () { stop(); show(Math.max(0, cur - 1)); };
    next.onclick = function () { stop(); show(Math.min(steps.length - 1, cur + 1)); };
    function stop() { clearInterval(timer); timer = null; playB.textContent = '▶ Reproducir'; }
    playB.onclick = function () {
      if (timer) return stop();
      last = null; show(0); playB.textContent = '■ Parar';
      timer = setInterval(function () { if (cur >= steps.length - 1) return stop(); show(cur + 1); }, 1900);
    };
    show(0);
  }

  // ---------------------------------------------------------------- probador de regex
  function regex(node) {
    var cfg = cfgOf(node);
    node.innerHTML = '';
    var row = el('div', 'rx-row');
    row.innerHTML = '<span class="rx-sl">/</span>';
    var pat = el('input', 'rx-pat'); pat.value = cfg.pattern || ''; pat.spellcheck = false; pat.setAttribute('aria-label', 'Patrón');
    var fl = el('input', 'rx-fl'); fl.value = cfg.flags || ''; fl.spellcheck = false; fl.setAttribute('aria-label', 'Opciones');
    row.appendChild(pat); row.appendChild(el('span', 'rx-sl', '/')); row.appendChild(fl);
    var pres = el('div', 'vp-presets');
    (cfg.presets || []).forEach(function (p) {
      var b = el('button', 'chip', esc(p.label)); b.type = 'button';
      b.onclick = function () { pat.value = p.pattern; fl.value = p.flags || ''; pres.querySelectorAll('.chip').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); note.innerHTML = p.note || ''; run(); };
      pres.appendChild(b);
    });
    var status = el('div', 'vp-status'), note = el('div', 'vp-note'), list = el('div', 'rx-list');
    node.appendChild(row); node.appendChild(pres); node.appendChild(status); node.appendChild(note); node.appendChild(list);
    function run() {
      var re;
      try { re = new RegExp(pat.value, fl.value.replace(/[^imsx]/g, '').replace('x', '')); } catch (e) { status.className = 'vp-status err'; status.textContent = '⚠ ' + e.message; return; }
      var n = 0; list.innerHTML = '';
      cfg.samples.forEach(function (s) {
        var m = re.exec(s), li = el('div', 'rx-item ' + (m ? 'hit' : 'miss'));
        if (m) { n++; li.innerHTML = '<span class="vbadge">✓</span>' + esc(s.slice(0, m.index)) + '<mark>' + esc(m[0] || '​') + '</mark>' + esc(s.slice(m.index + m[0].length)); }
        else li.innerHTML = '<span class="vbadge">✕</span>' + esc(s);
        list.appendChild(li);
      });
      status.className = 'vp-status'; status.innerHTML = '<b>' + n + '</b> de ' + cfg.samples.length + ' valores coinciden · en mongosh: <code>{ campo: /' + esc(pat.value) + '/' + esc(fl.value) + ' }</code>';
    }
    pat.addEventListener('input', run); fl.addEventListener('input', run);
    run();
  }


  // ---------------------------------------------------------------- MapReduce paso a paso
  function mr(node) {
    var cfg = cfgOf(node);
    node.innerHTML = '';
    var mapFn = new Function('emit', 'return (' + cfg.map + ')');
    var reduceFn = new Function('return (' + cfg.reduce + ')')();
    var finFn = cfg.finalize ? new Function('return (' + cfg.finalize + ')')() : null;
    // fase map
    var emits = [];
    cfg.docs.forEach(function (d) {
      var mine = [];
      mapFn(function (k, v) { mine.push({ k: k === undefined ? null : k, v: v }); }).call(d);
      emits.push({ doc: d, pairs: mine });
    });
    var groups = {}, order = [];
    emits.forEach(function (e) { e.pairs.forEach(function (p) { var key = JSON.stringify(p.k); if (!groups[key]) { groups[key] = { k: p.k, vs: [] }; order.push(key); } groups[key].vs.push(p.v); }); });
    order.sort();
    var phases = [
      { label: 'map', explain: 'Cada documento ejecuta la función <code>map</code>, que puede llamar a <code>emit(clave, valor)</code> cero, una o muchas veces.' },
      { label: 'shuffle', explain: 'MongoDB agrupa todos los valores emitidos <b>por clave</b>. Tú no escribes esta fase.' },
      { label: 'reduce', explain: '<code>reduce(clave, valores)</code> combina los valores de cada clave en uno solo. Si una clave tiene un único valor, <b>reduce no se ejecuta</b>.' }
    ];
    if (finFn) phases.push({ label: 'finalize', explain: '<code>finalize(clave, valor)</code> retoca el resultado final de cada clave (por ejemplo, para calcular una media).' });
    var bar = el('div', 'vpipe-bar'), cap = el('div', 'vpipe-cap'), stage = el('div', 'mr-stage');
    var btns = phases.map(function (ph, i) {
      var b = el('button', 'vstage', '<span class="n">' + (i + 1) + '</span><span>' + ph.label + '</span>'); b.type = 'button';
      b.onclick = function () { show(i); }; bar.appendChild(b); if (i < phases.length - 1) bar.appendChild(el('span', 'varrow', '→'));
      return b;
    });
    var code = el('div', 'mr-code', '<div class="codeblock" data-lang="js"><pre><code>' + esc('map = ' + cfg.map + '\n\nreduce = ' + cfg.reduce + (cfg.finalize ? '\n\nfinalize = ' + cfg.finalize : '')) + '</code></pre></div>');
    node.appendChild(code); node.appendChild(bar); node.appendChild(cap); node.appendChild(stage);
    A.enhanceCode(code);
    var chip = function (k, v, cls) { return '<span class="mr-chip ' + (cls || '') + '"><b>' + esc(fmt(k)) + '</b> → ' + esc(fmt(v, 0, 999)) + '</span>'; };
    function show(i) {
      btns.forEach(function (b, j) { b.classList.toggle('on', j === i); b.classList.toggle('past', j < i); });
      cap.innerHTML = '<p>' + phases[i].explain + '</p>';
      stage.innerHTML = '';
      if (i === 0) {
        emits.forEach(function (e, n) {
          var row = el('div', 'mr-row');
          row.innerHTML = '<div class="mr-doc">' + esc(e.doc._id) + '</div><div class="mr-arrow">emit ×' + e.pairs.length + '</div><div class="mr-chips">' + (e.pairs.length ? e.pairs.map(function (p) { return chip(p.k, p.v); }).join('') : '<span class="muted">(no emite nada)</span>') + '</div>';
          row.style.animationDelay = n * 80 + 'ms'; stage.appendChild(row);
        });
      } else {
        var grid = el('div', 'mr-groups');
        order.forEach(function (key, n) {
          var g = groups[key], box = el('div', 'mr-group');
          var html = '<div class="mr-key">' + esc(fmt(g.k)) + '</div>';
          if (i === 1) html += '<div class="mr-vals">' + g.vs.map(function (v) { return '<span class="mr-chip">' + esc(fmt(v, 0, 999)) + '</span>'; }).join('') + '</div>';
          else {
            var red = g.vs.length > 1 ? reduceFn(g.k, g.vs.slice()) : g.vs[0];
            var note = g.vs.length > 1 ? 'reduce(' + g.vs.length + ' valores)' : 'un solo valor: sin reduce';
            if (i === 3) { red = finFn(g.k, JSON.parse(JSON.stringify(red))); note = 'finalize'; }
            html += '<div class="mr-res">' + esc(fmt({ _id: g.k, value: red }, 0, 999)) + '</div><div class="mr-note">' + note + '</div>';
          }
          box.innerHTML = html; box.style.animationDelay = n * 60 + 'ms'; grid.appendChild(box);
        });
        stage.appendChild(grid);
      }
    }
    show(0);
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.viz-doctree').forEach(doctree);
    document.querySelectorAll('.viz-play').forEach(play);
    document.querySelectorAll('.viz-pipe').forEach(pipe);
    document.querySelectorAll('.viz-regex').forEach(regex);
    document.querySelectorAll('.viz-mr').forEach(mr);
  });
  window.MQLViz = { fmt: fmt };
})();
