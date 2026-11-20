// Lección 04 · Arrays y subdocumentos
export default (h) => {
  const mini = h.data.mini.map((d) => {
    const x = { _id: d._id, contract: { country: d.contract.country } };
    if (d.Movies) x.Movies = d.Movies;
    if (d.Series) x.Series = d.Series.map((s) => ({ Title: s.Title, Season: s.Season }));
    return x;
  });
  const T = (x, y, t, s = 'var(--text)', w = 600, size = 13) => `<text x="${x}" y="${y}" style="font:${w} ${size}px var(--mono);fill:${s}">${t}</text>`;
  const ok = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="var(--ok)"/><text x="${x}" y="${y + 4}" text-anchor="middle" style="font:800 12px var(--sans);fill:#05150b">✓</text>`;
  const ko = (x, y) => `<circle cx="${x}" cy="${y}" r="10" fill="var(--line2)"/><text x="${x}" y="${y + 4}" text-anchor="middle" style="font:800 12px var(--sans);fill:var(--muted)">✕</text>`;
  const elem = `
<svg viewBox="0 0 760 270" role="img" aria-label="Sin $elemMatch las condiciones pueden cumplirlas elementos distintos; con $elemMatch debe cumplirlas el mismo elemento">
  <rect x="10" y="10" width="420" height="190" rx="12" fill="var(--term)" stroke="var(--term-line)"/>
  ${T(26, 36, '_id: "ES10005/05/2/2025"', '#8d96a8', 500, 12)}
  ${T(26, 60, 'Movies:', '#8ab4ff')}
  ${T(316, 60, 'Drama?', '#8d96a8', 600, 11)}${T(372, 60, 'PCT&lt;10?', '#8d96a8', 600, 11)}
  ${T(26, 92, '{ Dawn Banners, [Drama, History], 98 }', '#e6e8ee', 500, 11)}${ok(337, 88)}${ko(398, 88)}
  ${T(26, 126, '{ Silver Falcon, [Action, Adventure], 1 }', '#e6e8ee', 500, 11)}${ko(337, 122)}${ok(398, 122)}
  ${T(26, 160, '{ My Dog Pepper, [Drama, Family], 100 }', '#e6e8ee', 500, 11)}${ok(337, 156)}${ko(398, 156)}
  ${T(26, 188, 'Ninguna película cumple las dos a la vez', '#ffcf7a', 600, 12)}
  <rect x="450" y="10" width="300" height="88" rx="12" fill="var(--ok-soft)" stroke="var(--ok)"/>
  ${T(466, 36, 'SIN $elemMatch → coincide', 'var(--ok)', 700, 13)}
  ${T(466, 60, '"Movies.Genres": "Drama"', 'var(--text)', 500, 11.5)}
  ${T(466, 80, '"Movies.Viewing PCT": {$lt:10}', 'var(--text)', 500, 11.5)}
  <rect x="450" y="112" width="300" height="88" rx="12" fill="var(--err-soft)" stroke="var(--err)"/>
  ${T(466, 138, 'CON $elemMatch → no coincide', 'var(--err)', 700, 13)}
  ${T(466, 162, 'Movies: { $elemMatch: {', 'var(--text)', 500, 11.5)}
  ${T(466, 182, '  Genres: "Drama", PCT: {$lt:10} } }', 'var(--text)', 500, 11.5)}
  ${T(10, 232, 'Sin $elemMatch, cada condición mira TODO el array: una película aporta "Drama" y otra el 1 %.', 'var(--text2)', 500, 11)}
  ${T(10, 254, 'Con $elemMatch, las condiciones se evalúan juntas sobre cada elemento.', 'var(--text2)', 500, 11)}
</svg>`;
  return {
    viz: true,
    lead: 'En este dataset lo interesante vive dentro de arrays: <code>Movies</code>, <code>Series</code>, <code>Genres</code>, <code>Keywords</code>, <code>Stars</code>… Consultar arrays tiene reglas propias, y la más traicionera es que <b>varias condiciones sobre un array no tienen por qué cumplirse en el mismo elemento</b>.',
    objectives: [
      'Buscar por elementos de un array y por arrays de subdocumentos',
      'Contar elementos: <code>$size</code> y el truco del índice',
      'Exigir varias condiciones al mismo elemento con <code>$elemMatch</code>',
      'Proyectar partes de un array'
    ],
    body: `
${h.label('① Concepto')}
<h2>¿El mismo elemento o cualquiera?</h2>
${h.figure(elem, 'Factura de ejemplo (inventada y simplificada). Es el error más frecuente con arrays.')}
<p>Compruébalo tú: en este playground están las 8 facturas de ejemplo con sus películas (simplificadas: aquí los géneros están en <code>Movies.Genres</code>; en tu collection están en <code>Movies.Details.Genres</code>).</p>
${h.viz('play', {
  docs: mini, filter: '{ "Movies.Genres": "Drama", "Movies.Viewing PCT": { $lt: 10 } }',
  presets: [
    { label: 'sin $elemMatch', code: '{ "Movies.Genres": "Drama", "Movies.Viewing PCT": { $lt: 10 } }', note: 'Coinciden 2: en una de ellas el drama y el 1 % son películas distintas.' },
    { label: 'con $elemMatch', code: '{ Movies: { $elemMatch: { Genres: "Drama", "Viewing PCT": { $lt: 10 } } } }', note: 'Solo 1: The Quiet Cellar es un drama visto al 5 %. Dentro de <code>$elemMatch</code> las rutas son relativas al elemento.' },
    { label: 'un elemento', code: '{ "Movies.Genres": "Documentary" }', note: 'Algún género de alguna película.' },
    { label: '$all', code: '{ $and: [ { "Movies.Genres": "Action" }, { "Movies.Genres": "Crime" } ] }', note: 'Equivale a <code>{ "Movies.Genres": { $all: ["Action", "Crime"] } }</code>: tiene los dos géneros… aunque sea en películas distintas. (Este playground no admite <code>$all</code> sobre arrays anidados; en tu MongoDB, sí.)' },
    { label: '$size', code: '{ Movies: { $size: 2 } }', note: 'Exactamente 2 películas.' },
    { label: 'al menos 3', code: '{ "Movies.2": { $exists: true } }', note: 'Existe el elemento de índice 2, luego hay 3 o más.' },
    { label: 'posición', code: '{ "Movies.0.Title": "Dawn Banners" }', note: 'La primera película (índice 0) es Dawn Banners.' },
    { label: 'array exacto', code: '{ "Movies.Genres": ["Action", "Comedy"] }', note: 'Algún <code>Genres</code> es exactamente ese array, en ese orden.' }
  ]
})}

${h.label('② Buscar en arrays')}
<h2>Reglas básicas</h2>
${h.cheat(['Filtro', 'Coincide cuando…'], [
  ['<code>{ "Series.Title": "Six Roommates" }</code>', 'algún elemento de <code>Series</code> tiene ese <code>Title</code>'],
  ['<code>{ "Movies.Details.Genres": "Drama" }</code>', 'algún género de alguna película es Drama (arrays dentro de arrays se «aplanan»)'],
  ['<code>{ "Movies.Viewing PCT": { $lt: 10 } }</code>', 'alguna película se vio menos del 10 %'],
  ['<code>{ arr: ["a", "b"] }</code>', 'el array es exactamente <code>["a", "b"]</code> (mismo orden), o contiene ese array como elemento'],
  ['<code>{ arr: { $all: ["a", "b"] } }</code>', 'contiene a y b, en cualquier orden y posición'],
  ['<code>{ arr: { $in: ["a", "b"] } }</code>', 'contiene a o b']
])}

${h.label('③ Tamaño y posición')}
<h2>Contar elementos</h2>
${h.code(`{ Series: { $size: 3 } }               // exactamente 3 series
{ Series: { $size: 0 } }               // array vacío (no coincide si Series no existe)
{ "Movies.4": { $exists: true } }      // existe el 5.º elemento → 5 o más películas
{ "Movies.4": { $exists: false } }     // menos de 5 (incluye facturas sin Movies)
{ "Movies.0.Title": "Dawn Banners" }    // la primera película es Dawn Banners`)}
${h.callout('warn', '$size no admite rangos', '<p><code>{ $size: { $gt: 3 } }</code> da error. Para «al menos N» usa el índice <code>N-1</code> con <code>$exists</code>; para comparaciones más complejas, <code>$expr</code> con el operador de agregación <code>$size</code> (lección 09).</p>')}
${h.callout('tip', 'Campos que unas veces son array y otras no', '<p>En una collection sin esquema, un campo puede ser un array en unos documentos y un valor simple en otros. <code>$size</code> y los índices posicionales solo coinciden con arrays; <code>{ campo: { $type: "array" } }</code> te dice cuáles lo son. Comprueba siempre el tipo antes de decidir (receta de la lección 01).</p>')}

${h.label('④ $elemMatch')}
<h2>Varias condiciones sobre el mismo elemento</h2>
${h.code(`// alguna película que sea Drama Y se viera menos del 10 % (la misma)
db.__COL__.find({
  Movies: { $elemMatch: { "Details.Genres": "Drama", "Viewing PCT": { $lt: 10 } } }
})

// alguna película que tenga a la vez los géneros Action y Comedy
db.__COL__.find({
  Movies: { $elemMatch: { "Details.Genres": { $all: ["Action", "Comedy"] } } }
})`)}
${h.callout('tip', '¿Cuándo hace falta?', '<p>Solo cuando hay <b>dos o más condiciones</b> sobre campos de los elementos de un mismo array y deben cumplirse <b>juntas</b>. Con una sola condición, <code>"Movies.X": …</code> y <code>$elemMatch</code> dan lo mismo.</p>')}
${h.quiz({ id: 'l04-q1', q: '<code>{ "Movies.Details.Genres": { $all: ["Action", "Comedy"] } }</code>, ¿qué garantiza?', options: ['Que alguna película sea de acción y comedia a la vez', 'Que entre todas las películas de la factura aparezcan ambos géneros', 'Que todas las películas sean de acción y comedia', 'Que la primera película tenga esos géneros'], answer: 1, why: 'La ruta aplana todos los géneros de todas las películas en una sola lista. Para exigirlo en la misma película, envuelve en <code>$elemMatch</code>.' })}

${h.label('⑤ Proyectar arrays')}
<h2>Devolver solo parte de un array</h2>
${h.cheat(['Proyección', 'Devuelve'], [
  ['<code>{ "Movies.Title": 1 }</code>', 'el array <code>Movies</code> con solo el <code>Title</code> de cada película'],
  ['<code>{ Movies: { $slice: 2 } }</code>', 'las 2 primeras películas (y el resto de campos del documento)'],
  ['<code>{ Movies: { $slice: -1 } }</code>', 'la última película'],
  ['<code>{ Movies: { $elemMatch: { "Viewing PCT": { $lt: 10 } } } }</code>', 'solo la <b>primera</b> película que cumple la condición'],
  ['<code>find({ "Movies.Title": "Titanic" }, { "Movies.$": 1 })</code>', 'solo el elemento que hizo coincidir el filtro (operador posicional <code>$</code>)']
])}

${h.label('⑥ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['algún elemento = valor', '<code>{ "arr.campo": valor }</code>'],
  ['contiene todos estos valores', '<code>{ arr: { $all: [a, b] } }</code>'],
  ['exactamente N elementos', '<code>{ arr: { $size: N } }</code>'],
  ['al menos N elementos', '<code>{ "arr.(N-1)": { $exists: true } }</code>'],
  ['es un array', '<code>{ campo: { $type: "array" } }</code>'],
  ['varias condiciones, mismo elemento', '<code>{ arr: { $elemMatch: { c1, c2 } } }</code>'],
  ['solo un campo de cada elemento', 'proyección <code>{ "arr.campo": 1 }</code>']
])}
`,
    lab: {
      id: 'l04', title: 'Lab 04 · Dentro de los arrays', minutes: 30,
      done: 'Ya controlas los arrays. En la lección 05 llegan las expresiones regulares.',
      steps: [
        { kind: 'task', title: 'Exactamente tres', body: '<p>Facturas de <b>España</b> en las que el cliente vio <b>exactamente 3 episodios de series</b> (3 elementos en <code>Series</code>).</p>', hints: ['Hay un operador que compara la longitud de un array.', '<code>{ Series: { $size: … } }</code>'], solution: 'db.__COL__.find({ "contract.country": "Spain", Series: { $size: 3 } })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", Series: { $size: 3 } })', mode: 'ids' } },
        { kind: 'task', title: 'Al menos cinco', body: '<p>Facturas de <b>España</b> con <b>5 o más películas</b> vistas.</p>', hints: ['<code>$size</code> no acepta <code>$gte</code>.', 'Si hay 5 o más películas, existe el elemento de índice 4.', '<code>{ "Movies.4": { $exists: true } }</code>'], solution: 'db.__COL__.find({ "contract.country": "Spain", "Movies.4": { $exists: true } })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", "Movies.4": { $exists: true } })', mode: 'ids' } },
        { kind: 'task', title: 'El mismo elemento', body: '<p>Facturas de <b>España</b> en las que alguna película de género <b>Drama</b> se vio <b>menos del 10 %</b> (la <b>misma</b> película debe cumplir las dos cosas).</p>', hints: ['Dos condiciones sobre el mismo elemento: <code>$elemMatch</code>.', 'Dentro de <code>$elemMatch</code> las rutas son relativas a cada película: <code>"Details.Genres"</code> y <code>"Viewing PCT"</code>.'], solution: 'db.__COL__.find({\n  "contract.country": "Spain",\n  Movies: { $elemMatch: { "Details.Genres": "Drama", "Viewing PCT": { $lt: 10 } } }\n})', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", Movies: { $elemMatch: { "Details.Genres": "Drama", "Viewing PCT": { $lt: 10 } } } })', mode: 'ids' } },
        { kind: 'quiz', title: '¿Y sin $elemMatch?', body: '<p>Ejecuta la misma consulta sin <code>$elemMatch</code> y compara cuántas salen:</p>' + h.code('db.__COL__.countDocuments({\n  "contract.country": "Spain",\n  "Movies.Details.Genres": "Drama",\n  "Movies.Viewing PCT": { $lt: 10 }\n})'), q: 'Sin <code>$elemMatch</code>, ¿cuántas facturas salen comparado con el paso anterior?', options: ['Menos', 'Las mismas', 'Más (o igual), nunca menos', 'Depende del orden de las películas'], answer: 2, why: 'Sin <code>$elemMatch</code> basta con que alguna película sea drama y alguna (otra o la misma) baje del 10 %: es una condición más débil, así que el resultado es un superconjunto.' },
        { kind: 'task', title: 'Dos géneros en una película', body: '<p>Facturas de <b>España</b> en las que alguna película sea, <b>a la vez</b>, de los géneros <b>Action</b> y <b>Comedy</b>.</p>', hints: ['«Contiene ambos valores» es <code>$all</code>.', '«En la misma película» exige <code>$elemMatch</code> sobre <code>Movies</code>.', '<code>Movies: { $elemMatch: { "Details.Genres": { $all: [ … ] } } }</code>'], solution: 'db.__COL__.find({\n  "contract.country": "Spain",\n  Movies: { $elemMatch: { "Details.Genres": { $all: ["Action", "Comedy"] } } }\n})', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", Movies: { $elemMatch: { "Details.Genres": { $all: ["Action", "Comedy"] } } } })', mode: 'ids' } },
        { kind: 'task', title: 'Solo los títulos', body: '<p>Para las facturas de <b>marzo de 2025</b> de <b>España</b>, devuelve <b>únicamente los títulos</b> de las películas vistas, sin <code>_id</code>.</p>', hints: ['La proyección puede entrar en un array con notación de puntos.', '<code>{ _id: 0, "Movies.Title": 1 }</code>'], solution: 'db.__COL__.find(\n  { billing: "March 2025", "contract.country": "Spain" },\n  { _id: 0, "Movies.Title": 1 }\n)', check: { type: 'query', ref: 'db.__COL__.find({ billing: "March 2025", "contract.country": "Spain" }, { _id: 0, "Movies.Title": 1 })', mode: 'docs' }, success: '¿Por qué algunos resultados salen como <code>{}</code>? Son facturas sin <code>Movies</code>: la proyección no inventa campos.' }
      ]
    }
  };
};
