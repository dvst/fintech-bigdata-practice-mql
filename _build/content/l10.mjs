// Lección 10 · $facet, $bucket y deciles
export default (h) => {
  const mini = h.data.mini.map((d) => ({ _id: d._id, TOTAL: d.TOTAL, contract: { country: d.contract.country } }));
  const T = (x, y, t, c = 'var(--text)', s = 12, w = 500, a = 'start') => `<text x="${x}" y="${y}" text-anchor="${a}" style="font:${w} ${s}px var(--mono);fill:${c}">${t}</text>`;
  const facet = `
<svg viewBox="0 0 760 210" role="img" aria-label="$facet ejecuta varios sub-pipelines sobre la misma entrada y devuelve un único documento">
  <defs><marker id="a10" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
  <rect x="10" y="70" width="110" height="60" rx="10" fill="var(--panel2)" stroke="var(--line2)"/>${T(65, 96, 'entrada', 'var(--text)', 12, 700, 'middle')}${T(65, 114, 'N docs', 'var(--muted)', 11, 500, 'middle')}
  <path d="M120 100C170 100 170 45 220 45" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#a10)"/>
  <path d="M120 100C170 100 170 155 220 155" fill="none" stroke="var(--violet)" stroke-width="2" marker-end="url(#a10)"/>
  <rect x="226" y="20" width="270" height="50" rx="10" fill="var(--accent-soft)" stroke="var(--accent)"/>${T(240, 42, 'porTipo:', 'var(--accent)', 12, 700)}${T(240, 60, '[ $group, $sort ]', 'var(--text)', 11.5)}
  <rect x="226" y="130" width="270" height="50" rx="10" fill="rgba(167,139,250,.14)" stroke="var(--violet)"/>${T(240, 152, 'top3:', 'var(--violet)', 12, 700)}${T(240, 170, '[ $group, $sort, $limit ]', 'var(--text)', 11.5)}
  <path d="M496 45C540 45 540 100 580 100" fill="none" stroke="var(--accent)" stroke-width="2"/>
  <path d="M496 155C540 155 540 100 580 100" fill="none" stroke="var(--violet)" stroke-width="2" marker-end="url(#a10)"/>
  <rect x="586" y="60" width="164" height="80" rx="10" fill="var(--term)" stroke="var(--term-line)"/>
  ${T(598, 86, '{ porTipo: [ … ],', '#e6e8ee', 11.5)}${T(598, 106, '  top3: [ … ] }', '#e6e8ee', 11.5)}${T(668, 128, '1 documento', '#8d96a8', 10.5, 500, 'middle')}
  ${T(10, 202, 'Cada rama recibe TODOS los documentos de entrada. El resultado es un único documento con un array por rama.', 'var(--text2)', 11.5, 500)}
</svg>`;
  // histograma ilustrativo de tramos fijos frente a tramos de igual tamaño
  const bars = (x0, vals, color, label) => vals.map((v, i) => `<rect x="${x0 + i * 30}" y="${150 - v}" width="24" height="${v}" rx="3" fill="${color}" fill-opacity=".7"/>`).join('') + T(x0, 175, label, 'var(--text2)', 11.5, 600);
  const hist = `
<svg viewBox="0 0 760 190" role="img" aria-label="Comparación entre tramos fijos y tramos de igual tamaño">
  ${T(10, 20, '$bucket: límites que eliges tú', 'var(--accent)', 12, 700)}
  ${bars(10, [20, 95, 120, 60, 25, 10, 6, 3], 'var(--accent)', 'tramos de igual ANCHO → cantidades muy distintas')}
  ${T(400, 20, '$bucketAuto / deciles: igual CANTIDAD', 'var(--ok)', 12, 700)}
  ${bars(400, [60, 60, 60, 60, 60, 60, 60, 60, 60, 60], 'var(--ok)', 'mismos documentos por tramo → límites distintos')}
  <line x1="10" y1="150" x2="250" y2="150" stroke="var(--line2)"/><line x1="400" y1="150" x2="700" y2="150" stroke="var(--line2)"/>
</svg>`;
  return {
    viz: true,
    lead: 'Dos herramientas para informes: <code>$facet</code> calcula <b>varios resultados a la vez</b> sobre la misma entrada, y <code>$bucket</code> / <code>$bucketAuto</code> reparten los documentos en <b>tramos</b>. Con ellas, y con las funciones de ventana, se calculan percentiles y <b>deciles</b>.',
    objectives: [
      'Devolver varias listas en una sola consulta con <code>$facet</code>',
      'Repartir en tramos fijos (<code>$bucket</code>) o equilibrados (<code>$bucketAuto</code>)',
      'Calcular el decil de cada documento con <code>$setWindowFields</code>',
      'Decidir y documentar: ¿deciles de qué?, ¿qué pasa con los empates?'
    ],
    body: `
${h.label('① Concepto')}
<h2>$facet: varias consultas en una</h2>
${h.figure(facet)}
${h.code(`db.__COL__.aggregate([
  { $match: { billing: "March 2025" } },          // las etapas previas son comunes
  { $facet: {
      porTipo: [ { $group: { _id: "$contract.product.type", n: { $sum: 1 } } }, { $sort: { _id: 1 } } ],
      top3:    [ { $group: { _id: "$contract.country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 3 } ]
  } }
])`)}
${h.callout('warn', 'Límites de $facet', '<p>El resultado es <b>un único documento</b>, que no puede superar 16 MB: no metas listas enormes. Dentro de una rama no puedes usar <code>$facet</code>, <code>$out</code> ni <code>$merge</code>. Si luego quieres procesar cada lista, usa <code>$project</code> / <code>$unwind</code> sobre sus arrays.</p>')}

${h.label('② Tramos')}
<h2>$bucket y $bucketAuto</h2>
${h.figure(hist, 'Ilustrativo.')}
<p>Prueba ambos con las 8 facturas de ejemplo:</p>
${h.viz('pipe', {
  docs: mini, inputLabel: 'facturas', inputExplain: 'Importes: 14.75, 15.7, 17.6, 20.9, 24.25, 39, 50, 53.47.',
  stages: [
    { label: '$bucket', code: '{ $bucket: {\n    groupBy: "$TOTAL",\n    boundaries: [0, 20, 40, 100],\n    default: "otros",\n    output: { n: { $sum: 1 }, facturas: { $push: "$_id" } }\n} }', stage: { $bucket: { groupBy: '$TOTAL', boundaries: [0, 20, 40, 100], default: 'otros', output: { n: { $sum: 1 }, facturas: { $push: '$_id' } } } }, keepRemoved: false, explain: 'Tramos <b>[0, 20)</b>, <b>[20, 40)</b> y <b>[40, 100)</b>: el límite inferior se incluye y el superior no. <code>_id</code> es el límite inferior.' }
  ]
})}
${h.viz('pipe', {
  docs: mini, inputLabel: 'facturas', inputExplain: 'Las mismas 8 facturas.',
  stages: [
    { label: '$bucketAuto', code: '{ $bucketAuto: { groupBy: "$TOTAL", buckets: 4 } }', stage: { $bucketAuto: { groupBy: '$TOTAL', buckets: 4 } }, keepRemoved: false, explain: '4 tramos con (aproximadamente) el mismo número de documentos. MongoDB elige los límites: <code>_id: { min, max }</code>.' }
  ]
})}
${h.cheat(['', '<code>$bucket</code>', '<code>$bucketAuto</code>'], [
  ['Límites', 'los fijas tú (<code>boundaries</code>)', 'los calcula MongoDB'],
  ['Documentos por tramo', 'los que caigan', 'parecidos (los empates nunca se separan)'],
  ['Fuera de rango', 'error, salvo que pongas <code>default</code>', '—'],
  ['Clave de salida', '<code>_id</code> = límite inferior', '<code>_id: { min, max }</code>']
])}

${h.label('③ Deciles')}
<h2>¿En qué decil está cada documento?</h2>
<p>Un <b>decil</b> divide los valores ordenados en 10 grupos con el mismo número de elementos: el decil 1 es el 10 % más bajo y el 10, el 10 % más alto. Hay varias formas de calcularlo en MongoDB:</p>
${h.cheat(['Método', 'Idea', 'Ojo con'], [
  ['<code>$bucketAuto</code> con <code>buckets: 10</code>', 'te da los 10 tramos y sus límites', 'puede salir con menos tramos o tamaños desiguales si hay muchos empates'],
  ['<code>$setWindowFields</code> + <code>$rank</code>', 'posición de cada documento en el orden → decil = ⌈10 · posición / total⌉', 'los empates comparten posición (resultado determinista)'],
  ['<code>$percentile</code> (MongoDB 7.0+)', 'calcula el valor del percentil 10, 90… y luego filtras', 'en 7.x solo existe el método <code>approximate</code>'],
  ['Dos consultas', 'primero calculas el umbral, luego filtras con él', 'menos elegante, pero muy fácil de documentar y comprobar']
])}
${h.code(`db.__COL__.aggregate([
  // 1) población: las facturas con importe numérico (sin dato no hay decil)
  { $match: { TOTAL: { $type: "number" } } },
  // 2) posición y total
  { $setWindowFields: {
      sortBy: { TOTAL: 1 },
      output: {
        pos:   { $rank: {} },
        total: { $count: {}, window: { documents: ["unbounded", "unbounded"] } }
      }
  } },
  // 3) decil
  { $set: { decil: { $ceil: { $multiply: [10, { $divide: ["$pos", "$total"] }] } } } }
])`)}
${h.callout('exam', 'Decisiones que debes documentar', '<p>Antes de calcular un decil responde, y déjalo escrito: <b>¿deciles de qué población?</b> (todas las facturas, un mes, un país…), <b>¿qué haces con los documentos sin el dato?</b>, <b>¿cómo tratas los empates?</b> y <b>¿qué método usas?</b> Dos métodos razonables pueden dar listas ligeramente distintas en los bordes: explicar por qué es parte de un buen análisis.</p>')}
${h.quiz({ id: 'l10-q1', q: 'Calculas deciles de <code>TOTAL</code> sobre todas las facturas. Un cliente con 12 meses de alta aporta 12 facturas. ¿Qué implica?', options: ['Nada', 'Son deciles de facturas, no de clientes: quien lleva más meses pesa más', '<code>$setWindowFields</code> da error con clientes repetidos', 'Los deciles salen al revés'], answer: 1, why: 'No es necesariamente un error, pero es otra pregunta. Decide qué población quieres (facturas o clientes) y dilo.' })}

${h.label('④ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['varias listas a la vez', '<code>{ $facet: { a: [ … ], b: [ … ] } }</code>'],
  ['tramos fijos', '<code>{ $bucket: { groupBy, boundaries, default, output } }</code>'],
  ['N tramos equilibrados', '<code>{ $bucketAuto: { groupBy, buckets: N } }</code>'],
  ['posición en un orden', '<code>$setWindowFields</code> con <code>$rank</code> / <code>$documentNumber</code>'],
  ['total en cada documento', '<code>{ $count: {}, window: { documents: ["unbounded", "unbounded"] } }</code>'],
  ['decil', '<code>{ $ceil: { $multiply: [10, { $divide: ["$pos", "$total"] }] } }</code>']
])}
`,
    lab: {
      id: 'l10', title: 'Lab 10 · Informes y tramos', minutes: 40,
      done: 'Ya sabes construir informes con varias vistas y repartos por tramos. Solo te queda MapReduce.',
      steps: [
        { kind: 'task', title: 'Dos listas en una consulta', body: '<p>En <b>una sola consulta</b> devuelve un documento con dos campos: <code>porTipo</code> (número de facturas por tipo de producto, <code>{ _id, n }</code>, ordenado por <code>_id</code>) y <code>top3</code> (los 3 países con más facturas, <code>{ _id, n }</code>, de más a menos y en empate por <code>_id</code>).</p>', hints: ['Una sola etapa <code>$facet</code> con dos ramas.', 'Cada rama es un pipeline completo: <code>[ { $group … }, { $sort … } ]</code>.', 'Fíjate en los nombres exactos: <code>porTipo</code>, <code>top3</code>, <code>n</code>.'], solution: 'db.__COL__.aggregate([\n  { $facet: {\n      porTipo: [ { $group: { _id: "$contract.product.type", n: { $sum: 1 } } }, { $sort: { _id: 1 } } ],\n      top3: [ { $group: { _id: "$contract.country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 3 } ]\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $facet: { porTipo: [{ $group: { _id: "$contract.product.type", n: { $sum: 1 } } }, { $sort: { _id: 1 } }], top3: [{ $group: { _id: "$contract.country", n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 3 }] } }])', mode: 'docs' } },
        { kind: 'task', title: 'Tramos de importe', body: '<p>Reparte las facturas por importe en los tramos <b>[0, 20)</b>, <b>[20, 50)</b>, <b>[50, 100)</b> y <b>[100, 1000)</b>, con un tramo <code>"otros"</code> para lo que quede fuera. Para cada tramo devuelve <code>facturas</code> (número).</p>', hints: ['<code>$bucket</code> con <code>groupBy: "$TOTAL"</code>.', '<code>boundaries: [0, 20, 50, 100, 1000]</code> y <code>default: "otros"</code>.', '<code>output: { facturas: { $sum: 1 } }</code>'], solution: 'db.__COL__.aggregate([\n  { $bucket: {\n      groupBy: "$TOTAL",\n      boundaries: [0, 20, 50, 100, 1000],\n      default: "otros",\n      output: { facturas: { $sum: 1 } }\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $bucket: { groupBy: "$TOTAL", boundaries: [0, 20, 50, 100, 1000], default: "otros", output: { facturas: { $sum: 1 } } } }])', mode: 'docs' } },
        { kind: 'task', title: 'El catálogo', body: '<p>¿Cuántas <b>películas distintas</b> (por título) se han visto? Resultado: <code>{ peliculas: N }</code>.</p>', hints: ['Despliega <code>Movies</code> y agrupa por título: una fila por película.', 'Después, <code>$count</code>.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Movies" },\n  { $group: { _id: "$Movies.Title" } },\n  { $count: "peliculas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Movies" }, { $group: { _id: "$Movies.Title" } }, { $count: "peliculas" }])', mode: 'docs' } },
        { kind: 'task', title: 'Cuatro tramos equilibrados', body: '<p>Reparte las facturas por importe (<code>TOTAL</code>) en <b>4 tramos</b> con aproximadamente el mismo número de facturas.</p>', hints: ['No necesitas fijar los límites: hay una etapa que los calcula.', '<code>$bucketAuto</code> con <code>groupBy: "$TOTAL"</code> y <code>buckets: 4</code>.'], solution: 'db.__COL__.aggregate([\n  { $bucketAuto: { groupBy: "$TOTAL", buckets: 4 } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $bucketAuto: { groupBy: "$TOTAL", buckets: 4 } }])', mode: 'docs' }, success: '¿Por qué los tramos no tienen exactamente el mismo tamaño? Mira los límites: hay importes repetidos y <code>$bucketAuto</code> no separa empates.' },
        { kind: 'task', title: 'El decil más alto', body: '<p>Con el método <code>$setWindowFields</code> + <code>$rank</code> de la teoría, cuenta cuántas facturas están en el <b>decil 10</b> de importe (las más caras). Resultado: <code>{ facturas: N }</code>.</p>', hints: ['Parte del pipeline de la teoría: <code>$match</code> de tipo numérico → <code>$setWindowFields</code> → <code>$set</code> del decil.', 'Añade <code>{ $match: { decil: 10 } }</code> y <code>{ $count: "facturas" }</code>.', 'Ordena por importe ascendente para que el decil 10 sea el de las más caras.'], solution: 'db.__COL__.aggregate([\n  { $match: { TOTAL: { $type: "number" } } },\n  { $setWindowFields: {\n      sortBy: { TOTAL: 1 },\n      output: {\n        pos: { $rank: {} },\n        total: { $count: {}, window: { documents: ["unbounded", "unbounded"] } }\n      }\n  } },\n  { $set: { decil: { $ceil: { $multiply: [10, { $divide: ["$pos", "$total"] }] } } } },\n  { $match: { decil: 10 } },\n  { $count: "facturas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { TOTAL: { $type: "number" } } }, { $setWindowFields: { sortBy: { TOTAL: 1 }, output: { pos: { $rank: {} }, total: { $count: {}, window: { documents: ["unbounded", "unbounded"] } } } } }, { $set: { decil: { $ceil: { $multiply: [10, { $divide: ["$pos", "$total"] }] } } } }, { $match: { decil: 10 } }, { $count: "facturas" }])', mode: 'docs' } },
        { kind: 'quiz', title: 'Comparar métodos', body: '<p>Prueba el último tramo de <code>$bucketAuto</code> con <code>buckets: 10</code> sobre las mismas facturas y compáralo con tu decil 10.</p>', q: 'Si el número de facturas no coincide exactamente, ¿cuál es la explicación más probable?', options: ['Uno de los dos métodos está mal implementado en MongoDB', 'Los empates en el importe: cada método los coloca de forma distinta en los bordes de los tramos', 'Que <code>$rank</code> ignora las facturas baratas', 'El orden de las etapas'], answer: 1, why: 'Con valores repetidos no existe un corte perfecto en el 10 %. Cualquier método válido es aceptable si explicas cuál usas y cómo trata los empates.' }
      ]
    }
  };
};
