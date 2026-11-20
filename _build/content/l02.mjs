// Lección 02 · find(): filtro y proyección
export default (h) => {
  const mini = h.data.mini.map((d) => ({ _id: d._id, billing: d.billing, TOTAL: d.TOTAL, Client: { Name: d.Client.Name }, contract: { country: d.contract.country, product: { type: d.contract.product.type } } }));
  const miniM = h.data.mini.map((d) => ({ _id: d._id, contract: { country: d.contract.country }, TOTAL: d.TOTAL, ...(d.Movies ? { Movies: d.Movies.map((m) => ({ Title: m.Title })) } : {}) }));
  const anatomy = `
<svg viewBox="0 0 760 150" role="img" aria-label="Anatomía de find: filtro, proyección y modificadores del cursor">
  <style>.a2 { font: 600 15px var(--mono); } .l2 { font: 12px var(--sans); fill: var(--muted); }</style>
  <text x="10" y="58" class="a2" style="fill:var(--text)">db.__COL__.find(</text>
  <rect x="150" y="34" width="188" height="34" rx="7" fill="var(--accent-soft)" stroke="var(--accent)"/>
  <text x="160" y="57" class="a2" style="fill:var(--accent)">{ filtro }</text>
  <text x="344" y="58" class="a2" style="fill:var(--text)">,</text>
  <rect x="356" y="34" width="168" height="34" rx="7" fill="var(--ok-soft)" stroke="var(--ok)"/>
  <text x="366" y="57" class="a2" style="fill:var(--ok)">{ proyección }</text>
  <text x="530" y="58" class="a2" style="fill:var(--text)">)</text>
  <rect x="546" y="34" width="206" height="34" rx="7" fill="var(--warn-soft)" stroke="var(--warn)"/>
  <text x="556" y="57" class="a2" style="fill:var(--warn)">.sort().skip().limit()</text>
  <text x="244" y="96" text-anchor="middle" class="l2">¿QUÉ documentos?</text>
  <text x="244" y="114" text-anchor="middle" class="l2">(como el WHERE de SQL)</text>
  <text x="440" y="96" text-anchor="middle" class="l2">¿QUÉ campos de cada uno?</text>
  <text x="440" y="114" text-anchor="middle" class="l2">(como el SELECT de SQL)</text>
  <text x="649" y="96" text-anchor="middle" class="l2">¿en qué ORDEN y cuántos?</text>
  <text x="649" y="114" text-anchor="middle" class="l2">(ORDER BY, OFFSET, LIMIT)</text>
</svg>`;
  return {
    viz: true,
    lead: '<code>find()</code> es la consulta básica de MongoDB. Responde a tres preguntas: <b>qué documentos</b> (filtro), <b>qué campos</b> (proyección) y <b>en qué orden y cuántos</b> (modificadores del cursor).',
    objectives: [
      'Escribir filtros de igualdad, también sobre campos anidados',
      'Combinar varias condiciones (AND implícito)',
      'Proyectar solo los campos necesarios',
      'Ordenar, paginar y limitar resultados'
    ],
    body: `
${h.label('① Concepto')}
<h2>Anatomía de una consulta</h2>
${h.figure(anatomy)}
<p>Pulsa las etapas para ver qué le pasa a cada documento. Son 8 facturas de ejemplo (inventadas, con la misma estructura que las de tu dataset), recortadas para que quepan:</p>
${h.viz('pipe', {
  docs: mini, inputLabel: 'collection', inputExplain: 'Las 8 facturas de partida.',
  stages: [
    { label: 'filtro', code: 'find({ "contract.product.type": "pay per content" })', stage: { $match: { 'contract.product.type': 'pay per content' } }, explain: 'El <b>filtro</b> descarta las facturas cuya tarifa no es de pago por contenido.' },
    { label: 'sort', code: '.sort({ TOTAL: -1 })', stage: { $sort: { TOTAL: -1 } }, explain: '<b>sort</b> ordena por importe, de mayor a menor (<code>-1</code>).' },
    { label: 'skip', code: '.skip(1)', stage: { $skip: 1 }, explain: '<b>skip</b> se salta el primero (paginación).' },
    { label: 'limit', code: '.limit(2)', stage: { $limit: 2 }, explain: '<b>limit</b> se queda con los 2 siguientes.' },
    { label: 'proyección', code: 'find(…, { _id: 0, "Client.Name": 1, TOTAL: 1 })', stage: { $project: { _id: 0, 'Client.Name': 1, TOTAL: 1 } }, keepRemoved: false, explain: 'La <b>proyección</b> recorta cada documento a los campos pedidos. Fíjate en que <code>Client.Name</code> conserva su estructura anidada.' }
  ]
}, 'Aunque escribas <code>.limit(2).sort(…)</code>, el servidor aplica siempre el mismo orden: filtro → sort → skip → limit → proyección.')}

${h.label('② Filtro')}
<h2>Filtrar por igualdad</h2>
<p>El filtro es un documento con pares <code>campo: valor</code>. Un documento pasa si <b>todos</b> los pares se cumplen (AND implícito):</p>
${h.code(`// una condición
db.__COL__.find({ billing: "March 2025" })

// dos condiciones (AND): marzo Y España
db.__COL__.find({ billing: "March 2025", "contract.country": "Spain" })

// campo anidado: notación de puntos entre comillas
db.__COL__.find({ "contract.product.Reference": "Free Rider" })

// campo con espacios: también entre comillas
db.__COL__.find({ "contract.product.monthly fee": 10 })`)}
${h.callout('tip', 'Igualdad sobre arrays', '<p>Si la ruta pasa por un array, la igualdad se cumple cuando <b>algún elemento</b> coincide: <code>{ "Movies.Title": "Titanic" }</code> encuentra las facturas en las que, entre todas las películas vistas, hay una llamada Titanic.</p>')}
${h.callout('warn', 'Igualdad exacta', '<p><code>"Spain"</code> no es <code>"spain"</code> ni <code>"Spain "</code>. Y un subdocumento completo solo es igual si coinciden todos sus campos <b>en el mismo orden</b>: por eso casi siempre se filtra por campos concretos con puntos, no por subdocumentos enteros.</p>')}
<p>Practica con este playground (son las mismas 8 facturas, con sus películas):</p>
${h.viz('play', {
  docs: miniM, filter: '{ "contract.country": "Portugal" }',
  presets: [
    { label: 'País', code: '{ "contract.country": "Portugal" }' },
    { label: 'Dos condiciones', code: '{ "contract.country": "Spain", TOTAL: 50 }' },
    { label: 'Dentro de un array', code: '{ "Movies.Title": "Chrome Chase 9" }', note: 'Basta con que <b>una</b> de las películas se llame así.' },
    { label: 'Campo que no existe', code: '{ "Movies.Title": "Harbor General" }', note: 'Harbor General es una serie: ninguna factura la tiene en <code>Movies</code>.' },
    { label: 'Filtro vacío', code: '{}', note: '<code>{}</code> (o nada) devuelve todos los documentos.' }
  ]
})}

${h.label('③ Proyección')}
<h2>Elegir los campos</h2>
<p>El segundo argumento indica qué campos devolver. Hay dos modos, <b>que no se pueden mezclar</b>:</p>
${h.cheat(['Modo', 'Ejemplo', 'Resultado'], [
  ['Inclusión (<code>1</code>)', '<code>{ "Client.Name": 1, TOTAL: 1 }</code>', 'Solo esos campos <b>y</b> <code>_id</code> (que va incluido por defecto).'],
  ['Exclusión (<code>0</code>)', '<code>{ Movies: 0, Series: 0 }</code>', 'Todo menos esos campos.'],
  ['Única mezcla válida', '<code>{ _id: 0, TOTAL: 1 }</code>', '<code>_id</code> es la excepción: se puede excluir en una proyección de inclusión.'],
  ['Campos de un array', '<code>{ "Movies.Title": 1 }</code>', 'Un array con solo los títulos: <code>Movies: [ { Title: … }, … ]</code>']
])}
${h.quiz({ id: 'l02-q1', q: '¿Qué ocurre con <code>db.__COL__.find({}, { "Client.Name": 1, TOTAL: 0 })</code>?', options: ['Devuelve el nombre y todo menos TOTAL', 'Devuelve solo el nombre', 'Error: no se puede mezclar inclusión y exclusión', 'Devuelve el nombre y TOTAL'], answer: 2, why: 'MongoDB responde <code>Cannot do exclusion on field TOTAL in inclusion projection</code>. En una proyección de inclusión, lo que no nombras ya queda fuera: no hace falta excluirlo.' })}

${h.label('④ Cursor')}
<h2>Ordenar, paginar y contar</h2>
${h.code(`db.__COL__.find({ "contract.country": "Spain" })
  .sort({ TOTAL: -1, _id: 1 })   // TOTAL descendente; en empate, _id ascendente
  .skip(20)                      // saltar 2 páginas de 10
  .limit(10)                     // página de 10

db.__COL__.countDocuments({ "contract.country": "Spain" })   // contar`)}
${h.callout('tip', 'Desempates', '<p>Si dos documentos tienen el mismo valor en el campo de ordenación, su orden relativo no está garantizado. Añade un segundo criterio único (<code>_id: 1</code>) cuando el orden importe, por ejemplo al paginar.</p>')}
${h.callout('', '¿<code>count()</code> o <code>countDocuments()</code>?', '<p><code>cursor.count()</code> está obsoleto en mongosh (muestra un aviso). Usa <code>db.col.countDocuments(filtro)</code>.</p>')}
${h.quiz({ id: 'l02-q2', q: 'Escribes <code>find(f).limit(5).sort({ TOTAL: -1 })</code>. ¿Qué obtienes?', options: ['5 documentos cualesquiera, ordenados entre sí', 'Los 5 con mayor TOTAL', 'Error: sort debe ir antes que limit', 'Todos los documentos ordenados'], answer: 1, why: 'Los modificadores del cursor se envían juntos al servidor, que siempre ordena antes de limitar. (En el aggregation pipeline, en cambio, el orden de las etapas sí importa: lección 06.)' })}

${h.label('⑤ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['documentos con campo = valor', '<code>find({ campo: valor })</code>'],
  ['varias condiciones a la vez', '<code>find({ a: 1, "b.c": "x" })</code>'],
  ['solo algunos campos', '<code>find(filtro, { _id: 0, campo: 1 })</code>'],
  ['todo menos algunos campos', '<code>find(filtro, { campo: 0 })</code>'],
  ['los N mayores', '<code>find(filtro).sort({ campo: -1 }).limit(N)</code>'],
  ['la página k (tamaño N)', '<code>.sort({ _id: 1 }).skip((k - 1) * N).limit(N)</code>'],
  ['cuántos hay', '<code>countDocuments(filtro)</code>']
])}
`,
    lab: {
      id: 'l02', title: 'Lab 02 · Consultas con find()', minutes: 30,
      done: 'Dominas la consulta básica. En la lección 03 aparecen los operadores: rangos, listas, OR, campos que no existen…',
      steps: [
        { kind: 'task', title: 'Dos condiciones', body: '<p>Obtén las facturas de <b>marzo de 2025</b> (<code>billing</code>) de clientes de <b>España</b> (<code>contract.country</code>).</p>', hints: ['Un filtro con dos pares <code>campo: valor</code> exige que se cumplan los dos.', 'El país está dentro de <code>contract</code>: la ruta va entre comillas, <code>"contract.country"</code>.', 'Los valores exactos son <code>"March 2025"</code> y <code>"Spain"</code>.'], solution: 'db.__COL__.find({ billing: "March 2025", "contract.country": "Spain" })', check: { type: 'query', ref: 'db.__COL__.find({ billing: "March 2025", "contract.country": "Spain" })', mode: 'ids' } },
        { kind: 'task', title: 'Solo lo necesario', body: '<p>Repite la consulta anterior pero devuelve <b>solo</b> el nombre del cliente, su email y el importe (<code>TOTAL</code>), <b>sin</b> <code>_id</code>.</p>', hints: ['La proyección es el segundo argumento de <code>find()</code>.', 'Proyección de inclusión: <code>1</code> en los campos que quieres. Los del cliente van con puntos.', '<code>_id</code> sale por defecto: exclúyelo con <code>_id: 0</code>.'], solution: 'db.__COL__.find(\n  { billing: "March 2025", "contract.country": "Spain" },\n  { _id: 0, "Client.Name": 1, "Client.Email": 1, TOTAL: 1 }\n)', check: { type: 'query', ref: 'db.__COL__.find({ billing: "March 2025", "contract.country": "Spain" }, { _id: 0, "Client.Name": 1, "Client.Email": 1, TOTAL: 1 })', mode: 'docs', extra: [{ label: 'Ningún resultado incluye _id', test: 'docs.every(function (d) { return !("_id" in d); })', hint: 'Añade _id: 0 a la proyección.' }] } },
        { kind: 'task', title: 'Las 5 facturas más altas', body: '<p>De todas las facturas de España (de cualquier mes), muestra las <b>5 con mayor importe</b>, de mayor a menor. Devuelve solo <code>_id</code> y <code>TOTAL</code>.</p>', hints: ['Ordena con <code>.sort()</code>: <code>-1</code> es descendente.', 'Después <code>.limit(5)</code>.', 'La proyección <code>{ TOTAL: 1 }</code> ya incluye <code>_id</code>.'], solution: 'db.__COL__.find({ "contract.country": "Spain" }, { TOTAL: 1 })\n  .sort({ TOTAL: -1 })\n  .limit(5)', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain" }, { TOTAL: 1 }).sort({ TOTAL: -1 }).limit(5)', mode: 'docs', ordered: true }, success: '¿Ves que los mismos clientes aparecen varias veces? Son distintas facturas mensuales del mismo contrato.' },
        { kind: 'task', title: 'Buscar dentro de un array', body: '<p>¿En qué facturas se vio la película <b>Titanic</b>? Devuelve esas facturas.</p>', hints: ['Los títulos están en cada elemento del array <code>Movies</code>.', 'La notación de puntos atraviesa el array: no necesitas índices.', 'Ruta: <code>"Movies.Title"</code>.'], solution: 'db.__COL__.find({ "Movies.Title": "Titanic" })', check: { type: 'query', ref: 'db.__COL__.find({ "Movies.Title": "Titanic" })', mode: 'ids' } },
        { kind: 'quiz', title: 'Proyecciones', q: 'Quieres todos los campos <b>menos</b> <code>Movies</code> y <code>Series</code>. ¿Qué proyección usas?', options: ['<code>{ Movies: 1, Series: 1 }</code>', '<code>{ Movies: 0, Series: 0 }</code>', '<code>{ _id: 1, Movies: 0, Series: 0 }</code>', '<code>{ "Movies, Series": 0 }</code>'], answer: 1, wrongWhy: { 2: 'Eso mezcla inclusión (_id: 1) y exclusión: da error. _id ya sale por defecto.' }, why: 'Proyección de exclusión: todo menos lo marcado con 0.' },
        { kind: 'task', title: 'Paginación', body: '<p>Ordena las facturas de España por <code>_id</code> ascendente y devuelve la <b>segunda página</b> de 10 resultados.</p>', hints: ['Página 2 de tamaño 10 = saltarse 10 y quedarse con 10.', '<code>.sort({ _id: 1 }).skip(…).limit(…)</code>'], solution: 'db.__COL__.find({ "contract.country": "Spain" })\n  .sort({ _id: 1 })\n  .skip(10)\n  .limit(10)', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain" }).sort({ _id: 1 }).skip(10).limit(10)', mode: 'ids', ordered: true } }
      ]
    }
  };
};
