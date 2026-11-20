// Lección 09 · Expresiones de agregación
export default (h) => {
  const mini = h.data.mini.map((d) => {
    const x = { _id: d._id, TOTAL: d.TOTAL };
    if (d.Movies) x.Movies = d.Movies.map((m) => ({ Title: m.Title, 'Viewing PCT': m['Viewing PCT'] }));
    return x;
  });
  const T = (x, y, t, c = 'var(--text)', s = 12.5, w = 500) => `<text x="${x}" y="${y}" style="font:${w} ${s}px var(--mono);fill:${c}">${t}</text>`;
  const two = `
<svg viewBox="0 0 760 170" role="img" aria-label="Operador de consulta frente a expresión de agregación">
  <rect x="10" y="10" width="360" height="150" rx="12" fill="var(--accent-soft)" stroke="var(--accent)"/>
  ${T(26, 36, 'Operador de consulta', 'var(--accent)', 13, 700)}
  ${T(26, 64, '{ TOTAL: { $gt: 50 } }', 'var(--text)')}
  ${T(26, 92, 'campo  : { operador: VALOR FIJO }', 'var(--muted)', 11.5)}
  ${T(26, 120, 'Compara un campo con una constante.', 'var(--text2)', 11.5)}
  ${T(26, 140, 'find(), $match', 'var(--text2)', 11.5)}
  <rect x="390" y="10" width="360" height="150" rx="12" fill="var(--ok-soft)" stroke="var(--ok)"/>
  ${T(406, 36, 'Expresión de agregación', 'var(--ok)', 13, 700)}
  ${T(406, 64, '{ $gt: ["$TOTAL", { $multiply: ["$b", 2] }] }', 'var(--text)', 11.5)}
  ${T(406, 92, '{ operador: [ arg1, arg2 ] }', 'var(--muted)', 11.5)}
  ${T(406, 120, 'Los argumentos pueden ser campos ("$x"),', 'var(--text2)', 11.5)}
  ${T(406, 140, 'constantes u otras expresiones anidadas.', 'var(--text2)', 11.5)}
</svg>`;
  return {
    viz: true,
    lead: 'Las <b>expresiones</b> son fórmulas que se evalúan sobre cada documento: aritmética, condiciones, operaciones con arrays y textos, conversiones de tipo… Con ellas se <b>comparan dos campos del mismo documento</b>, algo que un filtro normal no puede hacer.',
    objectives: [
      'Distinguir operadores de consulta y expresiones',
      'Comparar campos entre sí con <code>$expr</code>',
      'Clasificar con <code>$cond</code> y <code>$switch</code> y protegerte de ausencias con <code>$ifNull</code>',
      'Operar dentro de arrays sin desplegarlos: <code>$size</code>, <code>$filter</code>, <code>$map</code>, <code>$in</code>'
    ],
    body: `
${h.label('① Concepto')}
<h2>Dos sintaxis que se parecen (y no son iguales)</h2>
${h.figure(two)}
<p>Las expresiones viven en <code>$project</code>, <code>$addFields</code>, <code>$group</code> (dentro de acumuladores) y, envueltas en <code>$expr</code>, en <code>$match</code>. Recorre este ejemplo:</p>
${h.viz('pipe', {
  docs: mini, inputLabel: 'facturas', inputExplain: 'Las 8 facturas, con sus películas y el porcentaje visto.',
  stages: [
    { label: '$project', code: '{ $project: {\n    peliculas: { $size: { $ifNull: ["$Movies", []] } },\n    completas: { $size: { $filter: {\n        input: { $ifNull: ["$Movies", []] }, as: "m",\n        cond: { $gte: ["$$m.Viewing PCT", 90] } } } }\n} }', stage: { $project: { peliculas: { $size: { $ifNull: ['$Movies', []] } }, completas: { $size: { $filter: { input: { $ifNull: ['$Movies', []] }, as: 'm', cond: { $gte: ['$$m.Viewing PCT', 90] } } } } } }, keepRemoved: false, explain: 'Cuenta las películas de cada factura y cuántas se vieron al menos al 90 %, sin desplegar el array. <code>$ifNull</code> evita el error en la factura sin <code>Movies</code>.' },
    { label: '$match + $expr', code: '{ $match: { $expr: { $gte: ["$completas", 3] } } }', stage: { $match: { $expr: { $gte: ['$completas', 3] } } }, explain: 'Filtra con una expresión: facturas con al menos 3 películas vistas completas.' }
  ]
})}

${h.label('② $expr')}
<h2>Comparar campos del mismo documento</h2>
${h.code(`// ¿episodio visto = último episodio de la temporada?
db.__COL__.aggregate([
  { $unwind: "$Series" },
  { $match: { $expr: { $eq: ["$Series.Episode", "$Series.Total Episodes"] } } }
])

// también funciona en find()
db.__COL__.find({ $expr: { $gt: ["$TOTAL", "$contract.product.monthly fee"] } })`)}
${h.callout('tip', 'Qué campos puede usar una expresión', '<p>Cualquiera del documento que llega a la etapa, incluidos los de subdocumentos (<code>"$contract.product.type"</code>). Dentro de <code>$filter</code> o <code>$map</code>, cada elemento del array se nombra con una variable (<code>"$$m.campo"</code>).</p>')}
${h.quiz({ id: 'l09-q1', q: '¿Por qué no funciona <code>{ $match: { "Series.Episode": "$Series.Total Episodes" } }</code>?', options: ['Porque falta $unwind', 'Porque en un filtro normal <code>"$Series.Total Episodes"</code> es un texto literal, no el valor del campo', 'Porque los dos campos son de tipos distintos', 'Sí funciona'], answer: 1, why: 'Fuera de una expresión, el valor es una constante: busca episodios cuyo número sea el texto "$Series.Total Episodes". Para usar el valor de otro campo hace falta <code>$expr</code>.' })}

${h.label('③ Condiciones')}
<h2>$cond, $switch e $ifNull</h2>
${h.code(`// dos ramas
{ $cond: [ { $gte: ["$TOTAL", 50] }, "alta", "normal" ] }

// varias ramas
{ $switch: {
    branches: [
      { case: { $gte: ["$Movies.Viewing PCT", 90] }, then: "completa" },
      { case: { $gte: ["$Movies.Viewing PCT", 50] }, then: "parcial" }
    ],
    default: "abandonada"
} }

// valor por defecto si falta (o es null)
{ $ifNull: ["$Client.Phone", "sin teléfono"] }`)}

${h.label('④ Arrays')}
<h2>Trabajar dentro del array</h2>
${h.cheat(['Expresión', 'Devuelve'], [
  ['<code>{ $size: "$Movies" }</code>', 'número de elementos. <b>Error si <code>Movies</code> no existe</b>: usa <code>{ $size: { $ifNull: ["$Movies", []] } }</code>'],
  ['<code>{ $filter: { input: "$Movies", as: "m", cond: … } }</code>', 'los elementos que cumplen <code>cond</code> (dentro, <code>"$$m.campo"</code>)'],
  ['<code>{ $map: { input: "$Movies", as: "m", in: "$$m.Title" } }</code>', 'un array transformado (aquí, solo títulos)'],
  ['<code>{ $in: ["Drama", "$Movies.Details.Genres"] }</code>', 'si un valor está en un array. <b>Error si el segundo argumento no es un array</b>'],
  ['<code>{ $arrayElemAt: ["$Movies", 0] }</code>', 'el elemento de una posición'],
  ['<code>{ $reduce: { input, initialValue, in } }</code>', 'un valor acumulado (sumas, concatenaciones…)'],
  ['<code>"$Movies.Title"</code> en una expresión', 'el array de todos los títulos']
])}
${h.callout('err', 'Un error muy frecuente', '<p><code>MongoServerError: $in requires an array as a second argument, found: missing</code>. En una collection sin esquema, algún documento no tiene el array. Protégete siempre: <code>{ $in: [x, { $ifNull: ["$arr", []] }] }</code>, o filtra antes con <code>{ arr: { $type: "array" } }</code>.</p>')}

${h.label('⑤ Tipos y textos')}
<h2>Conversiones, textos y fechas</h2>
${h.cheat(['Expresión', 'Para qué'], [
  ['<code>{ $toString: "$Client.Phone" }</code>', 'número → texto (para usar regex sobre él)'],
  ['<code>{ $regexMatch: { input: …, regex: /00$/ } }</code>', 'regex dentro de una expresión'],
  ['<code>$toInt</code>, <code>$toDouble</code>, <code>{ $convert: { input, to, onError, onNull } }</code>', 'conversiones, con valor alternativo si fallan'],
  ['<code>$concat</code>, <code>$toLower</code>, <code>$split</code>, <code>$substrCP</code>, <code>$trim</code>', 'manipular textos'],
  ['<code>{ $dateFromString: { dateString: "$Movies.Date", format: "%d/%m/%Y" } }</code>', 'las fechas del dataset son texto: así se convierten en fechas reales'],
  ['<code>$add</code>, <code>$subtract</code>, <code>$multiply</code>, <code>$divide</code>, <code>$round</code>', 'aritmética (dividir entre 0 da error: protégete con <code>$cond</code>)']
])}

${h.label('⑥ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['comparar dos campos', '<code>{ $match: { $expr: { $lt: ["$a", "$b"] } } }</code>'],
  ['un valor u otro', '<code>{ $cond: [cond, siSí, siNo] }</code>'],
  ['valor por defecto', '<code>{ $ifNull: ["$x", def] }</code>'],
  ['contar elementos sin desplegar', '<code>{ $size: { $ifNull: ["$arr", []] } }</code>'],
  ['quedarme con algunos elementos', '<code>$filter</code> con <code>"$$var"</code>'],
  ['¿está en el array?', '<code>{ $in: [x, { $ifNull: ["$arr", []] }] }</code>'],
  ['regex sobre un número', '<code>$toString</code> + <code>$regexMatch</code>']
])}
`,
    lab: {
      id: 'l09', title: 'Lab 09 · Fórmulas por documento', minutes: 40,
      done: 'Con expresiones puedes calcular casi cualquier cosa. La lección 10 añade varias listas en una sola consulta y el reparto en tramos.',
      steps: [
        { kind: 'task', title: 'Contar sin desplegar', body: '<p>Para las facturas de <b>marzo de 2025</b> de <b>España</b>, devuelve <code>_id</code>, <code>peliculas</code> (número de películas vistas) y <code>series</code> (número de episodios vistos), con <b>0</b> cuando la factura no tiene ese array.</p>', hints: ['<code>$size</code> cuenta elementos, pero falla si el campo no existe.', 'Sustituye el array ausente por uno vacío con <code>$ifNull</code>.', '<code>{ $size: { $ifNull: ["$Movies", []] } }</code>'], solution: 'db.__COL__.aggregate([\n  { $match: { billing: "March 2025", "contract.country": "Spain" } },\n  { $project: {\n      peliculas: { $size: { $ifNull: ["$Movies", []] } },\n      series: { $size: { $ifNull: ["$Series", []] } }\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { billing: "March 2025", "contract.country": "Spain" } }, { $project: { peliculas: { $size: { $ifNull: ["$Movies", []] } }, series: { $size: { $ifNull: ["$Series", []] } } } }])', mode: 'docs' } },
        { kind: 'task', title: 'La última temporada', body: '<p>¿Cuántas visualizaciones de episodios corresponden a la <b>última temporada</b> de su serie (<code>Season</code> igual a <code>Total Seasons</code>)? Resultado: <code>{ visualizaciones: N }</code>.</p>', hints: ['Despliega <code>Series</code>: cada documento es un episodio visto.', 'Compara dos campos del mismo elemento: <code>$expr</code> con <code>$eq</code>.', 'Termina con <code>$count</code>.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Series" },\n  { $match: { $expr: { $eq: ["$Series.Season", "$Series.Total Seasons"] } } },\n  { $count: "visualizaciones" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Series" }, { $match: { $expr: { $eq: ["$Series.Season", "$Series.Total Seasons"] } } }, { $count: "visualizaciones" }])', mode: 'docs' } },
        { kind: 'task', title: 'Clasificar visualizaciones', body: '<p>Clasifica cada visualización de película como <code>"completa"</code> (≥ 90 %), <code>"parcial"</code> (≥ 50 %) o <code>"abandonada"</code> (el resto) y cuenta cuántas hay de cada clase: <code>{ _id: clase, n: N }</code>.</p>', hints: ['Despliega <code>Movies</code>.', 'Puedes usar <code>$switch</code> directamente como clave de <code>$group</code>.', 'Las ramas se evalúan en orden: pon primero la de ≥ 90.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Movies" },\n  { $group: {\n      _id: { $switch: {\n          branches: [\n            { case: { $gte: ["$Movies.Viewing PCT", 90] }, then: "completa" },\n            { case: { $gte: ["$Movies.Viewing PCT", 50] }, then: "parcial" }\n          ],\n          default: "abandonada"\n      } },\n      n: { $sum: 1 }\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Movies" }, { $group: { _id: { $switch: { branches: [{ case: { $gte: ["$Movies.Viewing PCT", 90] }, then: "completa" }, { case: { $gte: ["$Movies.Viewing PCT", 50] }, then: "parcial" }], default: "abandonada" } }, n: { $sum: 1 } } }])', mode: 'docs' } },
        { kind: 'task', title: 'Filtrar dentro del array', body: '<p>¿Cuántas facturas de <b>España</b> incluyen <b>al menos 2 películas</b> con puntuación IMDB (<code>Details.IMDB score</code>) de <b>8 o más</b>? Resultado: <code>{ facturas: N }</code>. Hazlo <b>sin</b> <code>$unwind</code>.</p>', hints: ['<code>$filter</code> se queda con las películas que cumplen la condición; <code>$size</code> las cuenta.', 'Dentro de <code>$filter</code>, cada película es <code>"$$m"</code> (si usas <code>as: "m"</code>): <code>"$$m.Details.IMDB score"</code>.', 'Protege la entrada con <code>$ifNull</code> y filtra después con <code>$match</code> sobre el campo calculado.'], solution: 'db.__COL__.aggregate([\n  { $match: { "contract.country": "Spain" } },\n  { $project: { buenas: { $size: { $filter: {\n      input: { $ifNull: ["$Movies", []] }, as: "m",\n      cond: { $gte: ["$$m.Details.IMDB score", 8] }\n  } } } } },\n  { $match: { buenas: { $gte: 2 } } },\n  { $count: "facturas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { "contract.country": "Spain" } }, { $project: { buenas: { $size: { $filter: { input: { $ifNull: ["$Movies", []] }, as: "m", cond: { $gte: ["$$m.Details.IMDB score", 8] } } } } } }, { $match: { buenas: { $gte: 2 } } }, { $count: "facturas" }])', mode: 'docs' } },
        { kind: 'task', title: 'Por encima de la cuota', body: '<p>Cuenta, por tarifa, las facturas cuyo importe (<code>TOTAL</code>) supera el <b>doble de su cuota mensual</b> (<code>contract.product.monthly fee</code>): <code>{ _id: tarifa, n: N }</code>.</p>', hints: ['Compara dos campos de la misma factura: <code>$expr</code> con <code>$gt</code>.', 'El doble: <code>{ $multiply: [2, "$contract.product.monthly fee"] }</code> (el espacio del nombre va dentro de la ruta).', 'Después, <code>$group</code> por <code>"$contract.product.Reference"</code>.'], solution: 'db.__COL__.aggregate([\n  { $match: { $expr: { $gt: ["$TOTAL", { $multiply: [2, "$contract.product.monthly fee"] }] } } },\n  { $group: { _id: "$contract.product.Reference", n: { $sum: 1 } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { $expr: { $gt: ["$TOTAL", { $multiply: [2, "$contract.product.monthly fee"] }] } } }, { $group: { _id: "$contract.product.Reference", n: { $sum: 1 } } }])', mode: 'docs' } },
        { kind: 'task', title: 'Regex sobre un número', body: '<p>En la lección 05 viste que una regex no funciona sobre números. Cuenta las facturas cuyo teléfono (<code>Client.Phone</code>, numérico) <b>termina en «00»</b>: <code>{ facturas: N }</code>.</p>', hints: ['Convierte el número a texto con <code>$toString</code>.', 'Aplica la regex con <code>$regexMatch</code> dentro de <code>$expr</code>.', '<code>{ $regexMatch: { input: { $toString: "$Client.Phone" }, regex: /00$/ } }</code>'], solution: 'db.__COL__.aggregate([\n  { $match: { $expr: { $regexMatch: { input: { $toString: "$Client.Phone" }, regex: /00$/ } } } },\n  { $count: "facturas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { $expr: { $regexMatch: { input: { $toString: "$Client.Phone" }, regex: /00$/ } } } }, { $count: "facturas" }])', mode: 'docs' } },
        { kind: 'quiz', title: 'Arrays que faltan', body: '<p>Prueba esto en la terminal:</p>' + h.code('db.__COL__.aggregate([\n  { $match: { $expr: { $in: ["Mi serie", "$Series.Title"] } } },\n  { $count: "n" }\n])'), q: '¿Qué ocurre y cómo se arregla?', options: ['Funciona: devuelve cuántas facturas incluyen esa serie', 'Error: algunas facturas no tienen <code>Series</code>; se arregla con <code>{ $ifNull: ["$Series.Title", []] }</code>', 'Error: <code>$in</code> no existe en agregación', 'Devuelve 0 porque los títulos están en mayúsculas'], answer: 1, why: '<code>$in</code> como expresión exige un array, y en las facturas sin <code>Series</code> el segundo argumento no existe. Con <code>$ifNull</code> (o con un <code>$match</code> previo que exija <code>$type: "array"</code>) desaparece el error.' }
      ]
    }
  };
};
