// Lección 07 · $group y acumuladores
export default (h) => {
  const mini = h.data.mini.map((d) => ({ _id: d._id, TOTAL: d.TOTAL, contract: { country: d.contract.country, product: { Reference: d.contract.product.Reference, type: d.contract.product.type } } }));
  const card = (x, y, w, txt, color) => `<rect x="${x}" y="${y}" width="${w}" height="26" rx="6" fill="${color}" fill-opacity=".14" stroke="${color}"/><text x="${x + 8}" y="${y + 17}" style="font:11.5px var(--mono);fill:var(--text)">${txt}</text>`;
  const pattern = `
<svg viewBox="0 0 760 250" role="img" aria-label="Patrón el más frecuente por grupo: contar por pareja, ordenar y quedarse con el primero de cada grupo">
  <defs><marker id="a7" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
  <text x="10" y="18" style="font:700 12px var(--sans);fill:var(--accent)">1 · $group por (país, tarifa)</text>
  ${card(10, 30, 220, 'Spain · Free Rider · 120', 'var(--accent)')}${card(10, 62, 220, 'Spain · Premium Rider · 80', 'var(--accent)')}${card(10, 94, 220, 'Japan · Short Timer · 40', 'var(--accent)')}${card(10, 126, 220, 'Japan · Free Rider · 65', 'var(--accent)')}
  <path d="M240 95h30" stroke="var(--muted)" stroke-width="2" marker-end="url(#a7)"/>
  <text x="280" y="18" style="font:700 12px var(--sans);fill:var(--warn)">2 · $sort país ↑, n ↓</text>
  ${card(280, 30, 220, 'Japan · Free Rider · 65', 'var(--ok)')}${card(280, 62, 220, 'Japan · Short Timer · 40', 'var(--line2)')}${card(280, 94, 220, 'Spain · Free Rider · 120', 'var(--ok)')}${card(280, 126, 220, 'Spain · Premium Rider · 80', 'var(--line2)')}
  <path d="M510 95h30" stroke="var(--muted)" stroke-width="2" marker-end="url(#a7)"/>
  <text x="550" y="18" style="font:700 12px var(--sans);fill:var(--violet)">3 · $group por país, $first</text>
  ${card(550, 62, 200, 'Japan → Free Rider (65)', 'var(--violet)')}${card(550, 94, 200, 'Spain → Free Rider (120)', 'var(--violet)')}
  <text x="10" y="186" style="font:12.5px var(--sans);fill:var(--text2)">Tras ordenar, el primer documento de cada país es el de mayor recuento: $first lo recoge.</text>
  <text x="10" y="208" style="font:12.5px var(--sans);fill:var(--text2)">Añade un segundo criterio de orden (p. ej. el nombre) para que los empates den siempre el mismo resultado.</text>
  <text x="10" y="236" style="font:11px var(--sans);fill:var(--muted)">(cifras ilustrativas)</text>
</svg>`;
  return {
    viz: true,
    lead: '<code>$group</code> convierte muchos documentos en uno por cada valor de una <b>clave</b>, y calcula sobre cada grupo sumas, medias, máximos, listas… Es el <code>GROUP BY</code> de MongoDB y el corazón de casi cualquier análisis.',
    objectives: [
      'Agrupar por un campo, por varios o por toda la collection',
      'Usar los acumuladores: <code>$sum</code>, <code>$avg</code>, <code>$min</code>, <code>$max</code>, <code>$push</code>, <code>$addToSet</code>, <code>$first</code>',
      'Contar valores distintos',
      'Aplicar el patrón «el más frecuente de cada grupo»'
    ],
    body: `
${h.label('① Concepto')}
<h2>De muchos documentos a uno por grupo</h2>
${h.viz('pipe', {
  docs: mini, inputLabel: 'collection', inputExplain: 'Las 8 facturas de partida.',
  stages: [
    { label: '$group', code: '{ $group: {\n    _id: "$contract.product.type",\n    facturas: { $sum: 1 },\n    importe: { $sum: "$TOTAL" },\n    paises: { $addToSet: "$contract.country" }\n} }', stage: { $group: { _id: '$contract.product.type', facturas: { $sum: 1 }, importe: { $sum: '$TOTAL' }, paises: { $addToSet: '$contract.country' } } }, keepRemoved: false, explain: 'Un documento por cada tipo de producto. <code>_id</code> es la clave del grupo; el resto son <b>acumuladores</b> calculados sobre las facturas de ese grupo.' },
    { label: '$sort', code: '{ $sort: { importe: -1 } }', stage: { $sort: { importe: -1 } }, explain: 'Ordena los grupos por importe total.' }
  ]
}, 'El orden de los elementos de <code>$addToSet</code> no está garantizado.')}

${h.label('② Anatomía')}
<h2>La etapa $group</h2>
${h.code(`{ $group: {
    _id: <clave>,                       // obligatorio: por qué se agrupa
    <campo>: { <acumulador>: <expresión> },
    …
} }`)}
${h.cheat(['Clave (_id)', 'Grupos'], [
  ['<code>"$contract.country"</code>', 'uno por país'],
  ['<code>{ pais: "$contract.country", mes: "$billing" }</code>', 'uno por cada combinación país + mes (clave compuesta)'],
  ['<code>null</code>', 'uno solo con toda la collection (totales globales)']
])}
${h.cheat(['Acumulador', 'Calcula'], [
  ['<code>{ $sum: 1 }</code>', 'número de documentos del grupo'],
  ['<code>{ $sum: "$TOTAL" }</code>', 'suma de un campo'],
  ['<code>{ $avg: "$TOTAL" }</code>', 'media (ignora los documentos sin ese campo)'],
  ['<code>$min</code> · <code>$max</code>', 'mínimo · máximo'],
  ['<code>{ $push: "$x" }</code>', 'array con todos los valores (con repetidos)'],
  ['<code>{ $addToSet: "$x" }</code>', 'array de valores distintos'],
  ['<code>$first</code> · <code>$last</code>', 'el valor del primer / último documento del grupo (según el orden de entrada: ordena antes)'],
  ['<code>{ $top: { sortBy: {…}, output: … } }</code>', 'el primero según un orden propio (MongoDB 5.2+)']
])}
${h.callout('err', 'Tras $group solo queda lo que calculas', '<p>La salida de <code>$group</code> tiene <b>únicamente</b> <code>_id</code> y los acumuladores. Si después necesitas el nombre del cliente, inclúyelo en la clave o recógelo con un acumulador (<code>$first</code>). Y con clave compuesta, sus partes se leen como <code>"$_id.pais"</code>.</p>')}
${h.quiz({ id: 'l07-q1', q: 'Tras <code>{ $group: { _id: "$billing", n: { $sum: 1 } } }</code>, ¿qué campos tienen los documentos?', options: ['Todos los de la factura, más n', '<code>_id</code> y <code>n</code>', '<code>billing</code> y <code>n</code>', 'Solo <code>n</code>'], answer: 1, why: 'El valor de la clave queda en <code>_id</code> (no en <code>billing</code>). Puedes renombrarlo después con <code>$project: { mes: "$_id", n: 1, _id: 0 }</code>.' })}

${h.label('③ Recetas')}
<h2>Patrones que vas a reutilizar</h2>
<h3>Totales globales</h3>
${h.code(`{ $group: { _id: null, facturas: { $sum: 1 }, ingresos: { $sum: "$TOTAL" } } }`)}
<h3>Contar valores distintos</h3>
${h.code(`{ $group: { _id: "$contract.country", clientes: { $addToSet: "$Client.customer code" } } },
{ $project: { clientes: { $size: "$clientes" } } }`)}
${h.callout('tip', 'Un cliente, varias facturas', '<p>Cada cliente aparece una vez por mes facturado. Si cuentas facturas, cuentas meses; si quieres <b>clientes</b>, cuenta valores distintos de un identificador del cliente (<code>customer code</code> o <code>DNI</code>).</p>')}
<h3>Contar y ordenar en un paso</h3>
${h.code(`{ $sortByCount: "$contract.product.Reference" }
// equivale a: { $group: { _id: "$…", count: { $sum: 1 } } }, { $sort: { count: -1 } }`)}
<h3>El más frecuente de cada grupo</h3>
${h.figure(pattern)}
${h.code(`db.__COL__.aggregate([
  { $group: { _id: { pais: "$contract.country", tarifa: "$contract.product.Reference" }, n: { $sum: 1 } } },
  { $sort: { "_id.pais": 1, n: -1, "_id.tarifa": 1 } },
  { $group: { _id: "$_id.pais", tarifa: { $first: "$_id.tarifa" }, n: { $first: "$n" } } }
])`)}
<p>Con MongoDB 5.2 o superior, el segundo y tercer paso caben en uno: <code>{ $group: { _id: "$_id.pais", top: { $top: { sortBy: { n: -1, "_id.tarifa": 1 }, output: ["$_id.tarifa", "$n"] } } } }</code>.</p>
${h.quiz({ id: 'l07-q2', q: 'En el patrón anterior quitas el <code>$sort</code>. ¿Qué devuelve <code>$first</code>?', options: ['Igualmente la tarifa más frecuente', 'La tarifa del primer documento que llegó a cada grupo, sin relación con el recuento', 'Error: $first exige $sort', 'La tarifa alfabéticamente primera'], answer: 1, why: '<code>$first</code> no busca nada: toma el primero en el orden en que llegan los documentos. Sin <code>$sort</code> ese orden es arbitrario.' })}

${h.label('④ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['contar por grupo', '<code>{ $group: { _id: "$k", n: { $sum: 1 } } }</code>'],
  ['sumar / media por grupo', '<code>{ $sum: "$x" }</code> · <code>{ $avg: "$x" }</code>'],
  ['agrupar por dos campos', '<code>_id: { a: "$a", b: "$b" }</code>'],
  ['totales de todo', '<code>_id: null</code>'],
  ['valores distintos', '<code>$addToSet</code> + <code>$size</code>'],
  ['el más frecuente por grupo', '<code>$group</code> (pareja) → <code>$sort</code> → <code>$group</code> + <code>$first</code>'],
  ['aplanar la clave', '<code>{ $project: { _id: 0, pais: "$_id.pais", n: 1 } }</code>']
])}
`,
    lab: {
      id: 'l07', title: 'Lab 07 · Agrupar y resumir', minutes: 35,
      done: 'Dominas <code>$group</code>. Pero casi todo lo interesante del dataset está dentro de arrays: la lección 08 te enseña a desplegarlos.',
      steps: [
        { kind: 'task', title: 'Facturación mensual', body: '<p>Para cada mes (<code>billing</code>) calcula la <b>facturación total</b> (campo <code>facturacion</code>, suma de <code>TOTAL</code>) y el <b>número de facturas</b> (campo <code>facturas</code>).</p>', hints: ['La clave del grupo es el mes: <code>_id: "$billing"</code>.', 'Suma de un campo: <code>{ $sum: "$TOTAL" }</code>; contar: <code>{ $sum: 1 }</code>.'], solution: 'db.__COL__.aggregate([\n  { $group: { _id: "$billing", facturacion: { $sum: "$TOTAL" }, facturas: { $sum: 1 } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $group: { _id: "$billing", facturacion: { $sum: "$TOTAL" }, facturas: { $sum: 1 } } }])', mode: 'docs' } },
        { kind: 'task', title: 'Estadísticas por tarifa', body: '<p>Para cada tarifa (<code>contract.product.Reference</code>) calcula el importe medio (<code>ticket_medio</code>), el mínimo (<code>minimo</code>) y el máximo (<code>maximo</code>).</p>', hints: ['Tres acumuladores en el mismo <code>$group</code>.', '<code>$avg</code>, <code>$min</code>, <code>$max</code> sobre <code>"$TOTAL"</code>.'], solution: 'db.__COL__.aggregate([\n  { $group: {\n      _id: "$contract.product.Reference",\n      ticket_medio: { $avg: "$TOTAL" },\n      minimo: { $min: "$TOTAL" },\n      maximo: { $max: "$TOTAL" }\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $group: { _id: "$contract.product.Reference", ticket_medio: { $avg: "$TOTAL" }, minimo: { $min: "$TOTAL" }, maximo: { $max: "$TOTAL" } } }])', mode: 'docs' } },
        { kind: 'task', title: 'Clave compuesta', body: '<p>Solo para <b>España y Francia</b>: número de facturas (<code>n</code>) por cada combinación de <b>país</b> y <b>tipo de producto</b>. La clave debe ser <code>{ pais: …, tipo: … }</code>.</p>', hints: ['Filtra primero con <code>$match</code> y <code>$in</code>.', '<code>_id: { pais: "$contract.country", tipo: "$contract.product.type" }</code>'], solution: 'db.__COL__.aggregate([\n  { $match: { "contract.country": { $in: ["Spain", "France"] } } },\n  { $group: { _id: { pais: "$contract.country", tipo: "$contract.product.type" }, n: { $sum: 1 } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { "contract.country": { $in: ["Spain", "France"] } } }, { $group: { _id: { pais: "$contract.country", tipo: "$contract.product.type" }, n: { $sum: 1 } } }])', mode: 'docs' } },
        { kind: 'task', title: 'Clientes distintos', body: '<p>Los <b>5 países con más clientes distintos</b> (identificados por <code>Client.customer code</code>). Devuelve <code>{ _id: país, clientes: N }</code>, de más a menos y, en caso de empate, por país alfabéticamente.</p>', hints: ['Primero reúne los códigos distintos de cada país con <code>$addToSet</code>.', 'Luego cuenta el array con <code>$size</code> en un <code>$project</code>.', 'Orden: <code>{ clientes: -1, _id: 1 }</code> y <code>$limit: 5</code>.'], solution: 'db.__COL__.aggregate([\n  { $group: { _id: "$contract.country", codigos: { $addToSet: "$Client.customer code" } } },\n  { $project: { clientes: { $size: "$codigos" } } },\n  { $sort: { clientes: -1, _id: 1 } },\n  { $limit: 5 }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $group: { _id: "$contract.country", codigos: { $addToSet: "$Client.customer code" } } }, { $project: { clientes: { $size: "$codigos" } } }, { $sort: { clientes: -1, _id: 1 } }, { $limit: 5 }])', mode: 'docs', ordered: true } },
        { kind: 'task', title: 'La tarifa favorita de cada país', body: '<p>Para cada país, la <b>tarifa con más facturas</b>. Devuelve <code>{ _id: país, tarifa: …, facturas: N }</code>. Si hay empate, gana la tarifa alfabéticamente primera.</p>', hints: ['Patrón en tres pasos: contar por pareja (país, tarifa), ordenar, quedarse con el primero de cada país.', 'Orden: país ascendente, recuento descendente y tarifa ascendente (para los empates).', 'En el segundo <code>$group</code>: <code>_id: "$_id.pais"</code> y <code>$first</code> para la tarifa y el recuento.'], solution: 'db.__COL__.aggregate([\n  { $group: { _id: { pais: "$contract.country", tarifa: "$contract.product.Reference" }, n: { $sum: 1 } } },\n  { $sort: { "_id.pais": 1, n: -1, "_id.tarifa": 1 } },\n  { $group: { _id: "$_id.pais", tarifa: { $first: "$_id.tarifa" }, facturas: { $first: "$n" } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $group: { _id: { pais: "$contract.country", tarifa: "$contract.product.Reference" }, n: { $sum: 1 } } }, { $sort: { "_id.pais": 1, n: -1, "_id.tarifa": 1 } }, { $group: { _id: "$_id.pais", tarifa: { $first: "$_id.tarifa" }, facturas: { $first: "$n" } } }])', mode: 'docs' }, success: 'Este patrón (contar por pareja → ordenar → primero de cada grupo) sirve para cualquier «el X más frecuente de cada Y».' },
        { kind: 'quiz', title: 'Medias y ausencias', q: 'Calculas <code>{ $avg: "$Client.Phone" }</code> por país y en algunos documentos no existe <code>Phone</code>. ¿Qué hace <code>$avg</code>?', options: ['Cuenta los ausentes como 0', 'Ignora los documentos sin ese campo', 'Devuelve null para todo el grupo', 'Da error'], answer: 1, why: '<code>$avg</code>, <code>$sum</code>, <code>$min</code> y <code>$max</code> ignoran valores ausentes o no numéricos. Si quieres que cuenten como 0, conviértelos antes (<code>$ifNull</code>, lección 09).' }
      ]
    }
  };
};
