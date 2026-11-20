// Lección 08 · $unwind y arrays embebidos
export default (h) => {
  const pick = ['ES10001/01/3/2025', 'PT10002/02/2/2025', 'JP10007/07/6/2025'];
  const mini = h.data.mini.filter((d) => pick.includes(d._id)).map((d) => {
    const x = { _id: d._id, contract: { country: d.contract.country } };
    if (d.Movies) x.Movies = d.Movies.map((m) => ({ Title: m.Title, Genres: m.Genres }));
    return x;
  });
  const T = (x, y, t, c = 'var(--text)', s = 12, w = 500) => `<text x="${x}" y="${y}" style="font:${w} ${s}px var(--mono);fill:${c}">${t}</text>`;
  const unwindSvg = `
<svg viewBox="0 0 760 210" role="img" aria-label="$unwind convierte un documento con un array de 3 elementos en 3 documentos">
  <defs><marker id="a8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
  <rect x="10" y="40" width="300" height="120" rx="10" fill="var(--term)" stroke="var(--term-line)"/>
  ${T(24, 66, '{ _id: "JP10007…",', '#e6e8ee')}
  ${T(24, 88, '  Movies: [', '#8ab4ff')}
  ${T(40, 108, 'Dinner Table Chaos,', '#ffc66d')}
  ${T(40, 126, 'Wild Numbers,', '#7ee0a3')}
  ${T(40, 144, 'Chrome Chase 9 ] }', '#c4a7ff')}
  <path d="M320 100h70" stroke="var(--muted)" stroke-width="2" marker-end="url(#a8)"/>
  ${T(326, 90, '$unwind', 'var(--mongo)', 13, 700)}
  <g><rect x="400" y="20" width="350" height="44" rx="9" fill="var(--term)" stroke="#ffc66d"/>${T(412, 47, '{ _id: "JP10007…", Movies: Dinner Table… }', '#e6e8ee', 11.5)}</g>
  <g><rect x="400" y="78" width="350" height="44" rx="9" fill="var(--term)" stroke="#7ee0a3"/>${T(412, 105, '{ _id: "JP10007…", Movies: Wild Numbers }', '#e6e8ee', 11.5)}</g>
  <g><rect x="400" y="136" width="350" height="44" rx="9" fill="var(--term)" stroke="#c4a7ff"/>${T(412, 163, '{ _id: "JP10007…", Movies: Chrome Chase 9 }', '#e6e8ee', 11.5)}</g>
  ${T(10, 200, 'Un documento por elemento. El resto de campos (y el _id) se copian en cada uno.', 'var(--text2)', 12, 500)}
</svg>`;
  return {
    viz: true,
    lead: 'En este dataset cada factura contiene <b>arrays</b> de visualizaciones. Para contar, agrupar u ordenar <b>visualizaciones</b> (no facturas) hay que desplegar esos arrays: <code>$unwind</code> convierte cada elemento en un documento propio.',
    objectives: [
      'Desplegar un array con <code>$unwind</code> y combinarlo con <code>$group</code>',
      'Desplegar arrays anidados (<code>Movies</code> → <code>Genres</code>)',
      'Controlar qué pasa con los documentos sin array',
      'Elegir la granularidad correcta: factura, visualización o título'
    ],
    body: `
${h.label('① Concepto')}
<h2>Un documento por elemento</h2>
${h.figure(unwindSvg)}
<p>Recórrelo con tres facturas de ejemplo (géneros simplificados). Observa qué le pasa a la factura de Portugal, que <b>no tiene</b> <code>Movies</code>:</p>
${h.viz('pipe', {
  docs: mini, inputLabel: 'facturas', inputExplain: '3 facturas: una con 2 películas, una sin películas y una con 3.',
  stages: [
    { label: '$unwind Movies', code: '{ $unwind: "$Movies" }', stage: { $unwind: '$Movies' }, keepRemoved: false, explain: 'De 3 facturas salen 5 documentos, uno por película. <b>La factura sin <code>Movies</code> desaparece.</b>' },
    { label: '$unwind Genres', code: '{ $unwind: "$Movies.Genres" }', stage: { $unwind: '$Movies.Genres' }, keepRemoved: false, explain: 'Segundo nivel: un documento por cada género de cada película.' },
    { label: '$group', code: '{ $group: { _id: "$Movies.Genres", vistas: { $sum: 1 } } }', stage: { $group: { _id: '$Movies.Genres', vistas: { $sum: 1 } } }, keepRemoved: false, explain: 'Ahora sí: cuántas visualizaciones hay de cada género.' },
    { label: '$sort', code: '{ $sort: { vistas: -1, _id: 1 } }', stage: { $sort: { vistas: -1, _id: 1 } }, explain: 'Ranking de géneros.' }
  ]
})}

${h.label('② Sintaxis')}
<h2>Formas de $unwind</h2>
${h.code(`{ $unwind: "$Movies" }                         // forma corta

{ $unwind: {
    path: "$Movies",
    preserveNullAndEmptyArrays: true,          // conserva facturas sin Movies (Movies queda ausente)
    includeArrayIndex: "posicion"              // añade la posición del elemento (0, 1, 2…)
} }`)}
${h.cheat(['Documento de entrada', '<code>$unwind</code> normal', 'con <code>preserveNullAndEmptyArrays</code>'], [
  ['<code>Movies: [a, b, c]</code>', '3 documentos', '3 documentos'],
  ['<code>Movies: []</code>', '<b>ninguno</b>', '1 (sin <code>Movies</code>)'],
  ['sin <code>Movies</code> o <code>null</code>', '<b>ninguno</b>', '1 (tal cual)'],
  ['<code>Movies: "x"</code> (no array)', '1 (se trata como <code>["x"]</code>)', '1']
])}
${h.callout('warn', 'Desaparecer también es un resultado', '<p>Si cuentas «facturas por país» <b>después</b> de <code>$unwind: "$Movies"</code>, las facturas sin películas ya no están, y además cada factura cuenta tantas veces como películas tenga. Decide qué necesitas antes de desplegar.</p>')}

${h.label('③ Granularidad')}
<h2>¿Qué es una «fila» en tu resultado?</h2>
<p>Antes de escribir un pipeline, pregúntate qué representa cada documento en cada punto:</p>
${h.cheat(['Tras…', 'Cada documento es…', 'Cuántos hay'], [
  ['la collection', 'una factura (cliente × mes)', 'una por cliente y mes'],
  ['<code>$unwind: "$Movies"</code>', 'una visualización de una película', 'varias por factura (y ninguna de las facturas sin películas)'],
  ['<code>$unwind: "$Series"</code>', 'una visualización de un episodio', 'varias por factura'],
  ['<code>$unwind</code> + <code>$group</code> por título', 'una película del catálogo', 'una por título distinto']
])}
${h.callout('tip', 'La misma película aparece muchas veces', '<p>Cada visualización trae copiados los <code>Details</code> de la película (duración, idioma, géneros…). Si haces una media de duraciones <b>después</b> de <code>$unwind</code>, las películas muy vistas pesan más. Si lo que quieres es el catálogo, agrupa antes por título para tener una fila por película.</p>')}
${h.quiz({ id: 'l08-q1', q: 'Quieres la duración media de las películas <b>distintas</b> que se han visto. ¿Qué pipeline es correcto?', options: ['<code>$unwind Movies</code> → <code>$group _id: null, $avg Duration</code>', '<code>$unwind Movies</code> → <code>$group por título ($first Duration)</code> → <code>$group _id: null, $avg</code>', '<code>$group _id: null, $avg "$Movies.Details.Duration"</code>', 'Cualquiera: dan lo mismo'], answer: 1, why: 'La primera pondera por número de visualizaciones. La segunda deduplica el catálogo y luego hace la media. La tercera ni siquiera despliega el array.' })}

${h.label('④ Rendimiento')}
<h2>Desplegar con cabeza</h2>
<ul>
  <li><b><code>$match</code> antes de <code>$unwind</code></b> siempre que puedas filtrar por campos de la factura: desplegas menos.</li>
  <li><b><code>$match</code> justo después</b> si el filtro es sobre los elementos (<code>"Movies.Viewing PCT"</code>): reduce la cantidad que llega a <code>$group</code>.</li>
  <li>Si solo necesitas <b>contar</b> o <b>filtrar</b> elementos dentro de cada factura, no hace falta desplegar: <code>$size</code> y <code>$filter</code> (lección 09) trabajan dentro del documento.</li>
  <li>Para volver a juntar lo desplegado: <code>{ $group: { _id: "$_id", Movies: { $push: "$Movies" } } }</code>.</li>
</ul>

${h.label('⑤ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['una fila por elemento', '<code>{ $unwind: "$arr" }</code>'],
  ['conservar documentos sin array', '<code>{ $unwind: { path: "$arr", preserveNullAndEmptyArrays: true } }</code>'],
  ['arrays dentro de arrays', 'dos <code>$unwind</code>: <code>"$Movies"</code> y luego <code>"$Movies.Details.Genres"</code>'],
  ['contar elementos por valor', '<code>$unwind</code> → <code>$group: { _id: "$arr.x", n: { $sum: 1 } }</code>'],
  ['ranking estable', '<code>{ $sort: { n: -1, _id: 1 } }</code>'],
  ['reconstruir', '<code>$group</code> por <code>_id</code> + <code>$push</code>']
])}
`,
    lab: {
      id: 'l08', title: 'Lab 08 · Desplegar visualizaciones', minutes: 35,
      done: 'Ya trabajas a nivel de visualización. En la lección 09 aprendes a calcular y comparar campos dentro de cada documento.',
      steps: [
        { kind: 'task', title: '¿Cuántas películas se han visto?', body: '<p>Cuenta el número total de <b>visualizaciones de películas</b> de toda la collection. Resultado: <code>{ visualizaciones: N }</code>.</p>', hints: ['Cada elemento de <code>Movies</code> es una visualización.', 'Despliega y cuenta: <code>$unwind</code> + <code>$count</code>.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Movies" },\n  { $count: "visualizaciones" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Movies" }, { $count: "visualizaciones" }])', mode: 'docs' } },
        { kind: 'task', title: 'Las series más vistas', body: '<p>Las <b>10 series con más visualizaciones de episodios</b>: <code>{ _id: título, vistas: N }</code>, de más a menos y, en empate, por título.</p>', hints: ['Despliega <code>Series</code>.', 'Agrupa por <code>"$Series.Title"</code> contando con <code>$sum: 1</code>.', 'Ordena por <code>{ vistas: -1, _id: 1 }</code> y limita a 10.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Series" },\n  { $group: { _id: "$Series.Title", vistas: { $sum: 1 } } },\n  { $sort: { vistas: -1, _id: 1 } },\n  { $limit: 10 }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Series" }, { $group: { _id: "$Series.Title", vistas: { $sum: 1 } } }, { $sort: { vistas: -1, _id: 1 } }, { $limit: 10 }])', mode: 'docs', ordered: true } },
        { kind: 'task', title: 'Dos niveles', body: '<p>Los <b>5 géneros de película más vistos</b> (cada visualización cuenta una vez por cada género de la película): <code>{ _id: género, vistas: N }</code>, ordenados igual que antes.</p>', hints: ['Los géneros son un array dentro de cada película: hacen falta dos <code>$unwind</code>.', 'Segundo <code>$unwind</code>: <code>"$Movies.Details.Genres"</code>.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Movies" },\n  { $unwind: "$Movies.Details.Genres" },\n  { $group: { _id: "$Movies.Details.Genres", vistas: { $sum: 1 } } },\n  { $sort: { vistas: -1, _id: 1 } },\n  { $limit: 5 }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Movies" }, { $unwind: "$Movies.Details.Genres" }, { $group: { _id: "$Movies.Details.Genres", vistas: { $sum: 1 } } }, { $sort: { vistas: -1, _id: 1 } }, { $limit: 5 }])', mode: 'docs', ordered: true } },
        { kind: 'task', title: 'No perder facturas', body: '<p>Para las facturas de <b>España</b>, despliega <code>Movies</code> <b>conservando</b> las facturas sin películas y cuenta cuántos documentos salen: <code>{ filas: N }</code>.</p>', hints: ['Filtra por país antes de desplegar.', 'Forma larga de <code>$unwind</code> con <code>preserveNullAndEmptyArrays: true</code>.'], solution: 'db.__COL__.aggregate([\n  { $match: { "contract.country": "Spain" } },\n  { $unwind: { path: "$Movies", preserveNullAndEmptyArrays: true } },\n  { $count: "filas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { "contract.country": "Spain" } }, { $unwind: { path: "$Movies", preserveNullAndEmptyArrays: true } }, { $count: "filas" }])', mode: 'docs' } },
        { kind: 'quiz', title: '¿De dónde sale la diferencia?', body: '<p>Repite el conteo con <code>{ $unwind: "$Movies" }</code> (forma corta) y compara.</p>', q: 'Con la forma corta salen menos filas. ¿Cuántas menos?', options: ['Tantas como películas sin título', 'Tantas como facturas de España sin películas', 'Tantas como facturas de España', 'Ninguna: deberían coincidir'], answer: 1, why: 'Cada factura sin <code>Movies</code> aporta exactamente una fila con <code>preserveNullAndEmptyArrays</code> y ninguna sin él.' },
        { kind: 'task', title: 'Variedad por país', body: '<p>Para cada país, ¿cuántas <b>series distintas</b> se han visto? Devuelve <code>{ _id: país, series: N }</code>.</p>', hints: ['Despliega <code>Series</code>: cada documento es un episodio visto.', 'Reúne los títulos distintos de cada país con <code>$addToSet</code>.', 'Cuéntalos con <code>$size</code> en un <code>$project</code>.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Series" },\n  { $group: { _id: "$contract.country", titulos: { $addToSet: "$Series.Title" } } },\n  { $project: { series: { $size: "$titulos" } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Series" }, { $group: { _id: "$contract.country", titulos: { $addToSet: "$Series.Title" } } }, { $project: { series: { $size: "$titulos" } } }])', mode: 'docs' } }
      ]
    }
  };
};
