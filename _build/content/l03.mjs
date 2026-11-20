// Lección 03 · Operadores de consulta
export default (h) => {
  const mini = h.data.mini.map((d) => {
    const x = { _id: d._id, TOTAL: d.TOTAL, Client: { Name: d.Client.Name }, contract: { country: d.contract.country, product: { Reference: d.contract.product.Reference } } };
    if (d.Client.Phone !== undefined) x.Client.Phone = d.Client.Phone;
    if (d.Movies) x.Movies = d.Movies.map((m) => m.Title);
    if (d.Series) x.Series = d.Series.map((s) => s.Title);
    return x;
  });
  const venn = (x, title, fillA, fillB, fillAB, fillOut, code) => `
  <g transform="translate(${x},0)">
    <rect x="0" y="10" width="220" height="140" rx="12" fill="${fillOut}" stroke="var(--line2)"/>
    <circle cx="85" cy="80" r="48" fill="${fillA}" stroke="var(--accent)" stroke-width="1.5"/>
    <circle cx="135" cy="80" r="48" fill="${fillB}" stroke="var(--violet)" stroke-width="1.5"/>
    <path d="M110 39 A48 48 0 0 1 110 121 A48 48 0 0 1 110 39 Z" fill="${fillAB}"/>
    <text x="60" y="84" style="font:700 14px var(--mono);fill:var(--text)">A</text><text x="152" y="84" style="font:700 14px var(--mono);fill:var(--text)">B</text>
    <text x="110" y="176" text-anchor="middle" style="font:700 14px var(--mono);fill:var(--text)">${title}</text>
    <text x="110" y="196" text-anchor="middle" style="font:12px var(--mono);fill:var(--muted)">${code}</text>
  </g>`;
  const onS = 'rgba(43,212,107,.45)', off = 'transparent';
  const vennSvg = `<svg viewBox="0 0 740 205" role="img" aria-label="Diagramas de Venn de $and, $or y $nor">
    ${venn(10, '$and', off, off, onS, off, '{ A, B }')}
    ${venn(260, '$or', onS, onS, onS, off, '{ $or: [A, B] }')}
    ${venn(510, '$nor', 'var(--panel)', 'var(--panel)', 'var(--panel)', onS, '{ $nor: [A, B] }')}
  </svg>`;
  return {
    viz: true,
    lead: 'La igualdad no basta para casi nada. Los <b>operadores</b> (siempre empiezan por <code>$</code>) permiten rangos, listas de valores, combinaciones con OR y, sobre todo en este dataset, preguntar si un campo <b>existe</b> o de qué <b>tipo</b> es.',
    objectives: [
      'Comparar con <code>$gt</code>, <code>$lte</code>, <code>$ne</code>, <code>$in</code>…',
      'Combinar condiciones con <code>$and</code>, <code>$or</code>, <code>$nor</code>, <code>$not</code>',
      'Distinguir campo ausente, <code>null</code> y vacío',
      'Filtrar por tipo con <code>$type</code>'
    ],
    body: `
${h.label('① Concepto')}
<h2>Un operador sustituye al valor</h2>
<p>En vez de <code>campo: valor</code> escribes <code>campo: { $operador: valor }</code>. Edita el filtro o pulsa los ejemplos:</p>
${h.viz('play', {
  docs: mini, filter: '{ TOTAL: { $gt: 30 } }',
  presets: [
    { label: '$gt', code: '{ TOTAL: { $gt: 30 } }', note: 'Mayor que 30.' },
    { label: 'rango', code: '{ TOTAL: { $gte: 15, $lt: 25 } }', note: 'Dos operadores sobre el mismo campo = rango (AND).' },
    { label: '$in', code: '{ "contract.country": { $in: ["Spain", "Japan"] } }', note: 'El valor está en la lista.' },
    { label: '$ne', code: '{ "contract.country": { $ne: "Portugal" } }', note: 'Distinto de. Ojo: también coincide si el campo no existe.' },
    { label: '$or', code: '{ $or: [ { TOTAL: { $gt: 50 } }, { "contract.country": "France" } ] }', note: '<code>$or</code> recibe un array de filtros completos.' },
    { label: '$exists', code: '{ "Client.Phone": { $exists: false } }', note: 'Facturas cuyo cliente no tiene teléfono.' },
    { label: 'null', code: '{ "Client.Phone": null }', note: '<code>null</code> coincide con valores null <b>y</b> con campos ausentes.' },
    { label: '$type', code: '{ Movies: { $type: "array" } }', note: 'Tiene <code>Movies</code> y es un array.' },
    { label: '$nin', code: '{ "contract.product.Reference": { $nin: ["Free Rider", "Premium Rider"] } }', note: 'No está en la lista (ni existe el campo).' }
  ]
}, 'Las 8 facturas son de ejemplo (inventadas); las películas y series se muestran solo por título.')}

${h.label('② Comparación')}
<h2>Operadores de comparación</h2>
${h.cheat(['Operador', 'Significa', 'Ejemplo'], [
  ['<code>$eq</code>', 'igual (es lo que hace <code>campo: valor</code>)', '<code>{ TOTAL: { $eq: 50 } }</code>'],
  ['<code>$ne</code>', 'distinto', '<code>{ billing: { $ne: "January 2025" } }</code>'],
  ['<code>$gt</code> · <code>$gte</code>', 'mayor · mayor o igual', '<code>{ TOTAL: { $gt: 100 } }</code>'],
  ['<code>$lt</code> · <code>$lte</code>', 'menor · menor o igual', '<code>{ "Movies.Viewing PCT": { $lt: 10 } }</code>'],
  ['<code>$in</code>', 'está en la lista', '<code>{ billing: { $in: ["May 2025", "June 2025"] } }</code>'],
  ['<code>$nin</code>', 'no está en la lista', '<code>{ "contract.country": { $nin: ["Spain"] } }</code>']
])}
${h.callout('warn', 'Comparar tipos distintos', '<p>Las comparaciones de rango solo encajan entre valores del mismo «tipo de comparación»: <code>{ TOTAL: { $gt: "50" } }</code> (con comillas) no devuelve nada porque <code>"50"</code> es texto y <code>TOTAL</code> es número. Y recuerda que las fechas del dataset son texto (lección 01).</p>')}

${h.label('③ Lógica')}
<h2>Combinar condiciones</h2>
${h.figure(vennSvg, 'Zona verde = documentos que pasan el filtro. <code>$not</code> niega la condición de un único campo.')}
${h.code(`// AND implícito: varias claves en el mismo filtro
{ "contract.country": "Spain", TOTAL: { $gt: 50 } }

// $and explícito: necesario cuando repites clave (p. ej. dos $or)
{ $and: [
    { $or: [ { billing: "May 2025" }, { billing: "June 2025" } ] },
    { $or: [ { Movies: { $exists: false } }, { Series: { $exists: false } } ] }
] }

// $or: al menos una
{ $or: [ { TOTAL: { $gt: 100 } }, { "contract.country": "Japan" } ] }

// $nor: ninguna
{ $nor: [ { Movies: { $exists: true } }, { Series: { $exists: true } } ] }

// $not: niega el operador de UN campo
{ TOTAL: { $not: { $gt: 50 } } }   // ≤ 50 o sin TOTAL`)}
${h.callout('err', 'Error clásico: clave repetida', '<p>En un objeto JavaScript una clave repetida <b>sustituye</b> a la anterior: <code>{ TOTAL: { $gt: 10 }, TOTAL: { $lt: 20 } }</code> se queda solo con <code>$lt: 20</code>, sin avisar. Escribe <code>{ TOTAL: { $gt: 10, $lt: 20 } }</code> o usa <code>$and</code>.</p>')}
${h.quiz({ id: 'l03-q1', q: '¿Qué devuelve <code>{ "contract.country": "Spain", "contract.country": "France" }</code>?', options: ['Facturas de España o de Francia', 'Ninguna: un país no puede ser los dos', 'Solo las de Francia', 'Error de sintaxis'], answer: 2, why: 'La segunda clave pisa a la primera antes de que la consulta llegue al servidor. Para «España o Francia» usa <code>$in</code>.' })}

${h.label('④ Ausencias')}
<h2>Campo ausente, null, vacío</h2>
<p>Como no todas las facturas tienen los mismos campos, este cuadro es de los más útiles del tutorial:</p>
${h.cheat(['Filtro', 'Coincide si el campo…'], [
  ['<code>{ f: { $exists: false } }</code>', 'no existe'],
  ['<code>{ f: { $exists: true } }</code>', 'existe (con cualquier valor, incluido null)'],
  ['<code>{ f: null }</code>', 'vale null <b>o no existe</b>'],
  ['<code>{ f: { $type: "null" } }</code>', 'vale null (y existe)'],
  ['<code>{ f: { $ne: null } }</code>', 'existe y no es null'],
  ['<code>{ f: { $type: "array" } }</code>', 'es un array'],
  ['<code>{ f: { $size: 0 } }</code>', 'es un array vacío (lección 04)'],
  ['<code>{ f: { $ne: "x" } }</code>', 'vale otra cosa <b>o no existe</b>']
])}
<p><code>$type</code> acepta alias: <code>"string"</code>, <code>"int"</code>, <code>"long"</code>, <code>"double"</code>, <code>"number"</code> (cualquiera de los numéricos), <code>"object"</code>, <code>"array"</code>, <code>"bool"</code>, <code>"null"</code>, <code>"date"</code>. Y una lista: <code>{ $type: ["int", "double"] }</code>.</p>
${h.quiz({ id: 'l03-q2', q: 'Filtras <code>{ "contract.end date": { $ne: "07/01/17" } }</code>. ¿Salen los contratos <b>sin</b> fecha de fin?', options: ['No, solo los que tienen otra fecha', 'Sí: <code>$ne</code> también coincide cuando el campo no existe', 'Da error si el campo falta', 'Solo si se añade <code>$exists</code>'], answer: 1, why: 'Para quedarte solo con los que tienen otra fecha: <code>{ "contract.end date": { $exists: true, $ne: "07/01/17" } }</code>.' })}

${h.label('⑤ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['un rango', '<code>{ x: { $gte: a, $lt: b } }</code>'],
  ['uno de varios valores', '<code>{ x: { $in: [a, b, c] } }</code>'],
  ['A o B', '<code>{ $or: [ {A}, {B} ] }</code>'],
  ['ni A ni B', '<code>{ $nor: [ {A}, {B} ] }</code>'],
  ['negar un operador', '<code>{ x: { $not: { $gt: 5 } } }</code>'],
  ['que el campo exista / no exista', '<code>{ x: { $exists: true | false } }</code>'],
  ['un tipo concreto', '<code>{ x: { $type: "array" } }</code>']
])}
`,
    lab: {
      id: 'l03', title: 'Lab 03 · Operadores en acción', minutes: 30,
      done: 'Ya combinas rangos, listas, OR y ausencias. En la lección 04 te metes de lleno en los arrays.',
      steps: [
        { kind: 'task', title: 'Rango + igualdad', body: '<p>Facturas de <b>diciembre de 2025</b> con un importe (<code>TOTAL</code>) <b>superior a 50</b>.</p>', hints: ['Igualdad para el mes, operador para el importe.', '«Superior a» es estrictamente mayor: <code>$gt</code>.'], solution: 'db.__COL__.find({ billing: "December 2025", TOTAL: { $gt: 50 } })', check: { type: 'query', ref: 'db.__COL__.find({ billing: "December 2025", TOTAL: { $gt: 50 } })', mode: 'ids' } },
        { kind: 'task', title: 'Lista de valores', body: '<p>Facturas de clientes de <b>Portugal o Italia</b> cuyo producto sea de tipo <b>«pay per view»</b> (<code>contract.product.type</code>).</p>', hints: ['Para «uno de estos países» no hace falta <code>$or</code>.', '<code>$in</code> recibe un array de valores posibles.'], solution: 'db.__COL__.find({\n  "contract.country": { $in: ["Portugal", "Italy"] },\n  "contract.product.type": "pay per view"\n})', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": { $in: ["Portugal", "Italy"] }, "contract.product.type": "pay per view" })', mode: 'ids' } },
        { kind: 'task', title: 'OR con ausencias', body: '<p>Facturas de <b>España</b> en las que el cliente <b>no vio películas o no vio series</b> (le falta <code>Movies</code>, o le falta <code>Series</code>, o ambos).</p>', hints: ['La condición de país va fuera del <code>$or</code> (AND implícito).', 'Dentro del <code>$or</code>, dos filtros con <code>$exists: false</code>.'], solution: 'db.__COL__.find({\n  "contract.country": "Spain",\n  $or: [ { Movies: { $exists: false } }, { Series: { $exists: false } } ]\n})', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", $or: [ { Movies: { $exists: false } }, { Series: { $exists: false } } ] })', mode: 'ids' } },
        { kind: 'task', title: 'Clientes sin teléfono', body: '<p>Facturas de clientes de <b>Norway</b> que <b>no tienen teléfono</b> registrado.</p>', hints: ['El teléfono está en <code>Client.Phone</code>.', 'Que no exista: <code>$exists: false</code>.'], solution: 'db.__COL__.find({ "contract.country": "Norway", "Client.Phone": { $exists: false } })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Norway", "Client.Phone": { $exists: false } })', mode: 'ids' } },
        { kind: 'quiz', title: 'null frente a $exists', body: '<p>Compara estas dos cuentas en la terminal:</p>' + h.code('db.__COL__.countDocuments({ "Client.Phone": null })\ndb.__COL__.countDocuments({ "Client.Phone": { $exists: false } })'), q: '¿Cuánto da <code>{ "Client.Phone": null }</code>?', live: 'db.__COL__.countDocuments({ "Client.Phone": null })', options: ['0, porque ningún teléfono vale null', '{{live}}', '54.145', 'Error'], answer: 1, wrongWhy: { 0: 'Pruébalo: <code>null</code> también coincide con los campos ausentes.' }, why: 'Salen las mismas que con <code>$exists: false</code> porque en este dataset el teléfono nunca vale <code>null</code>: o es un número o no está. Si hubiera nulls, <code>null</code> los contaría y <code>$exists: false</code> no.' },
        { kind: 'task', title: 'Excluir una lista', body: '<p>Facturas de <b>España</b> cuya tarifa (<code>contract.product.Reference</code>) <b>no</b> sea ni «Free Rider» ni «Premium Rider».</p>', hints: ['Lo contrario de <code>$in</code>.', '<code>$nin</code> con un array de dos valores.'], solution: 'db.__COL__.find({\n  "contract.country": "Spain",\n  "contract.product.Reference": { $nin: ["Free Rider", "Premium Rider"] }\n})', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", "contract.product.Reference": { $nin: ["Free Rider", "Premium Rider"] } })', mode: 'ids' } }
      ]
    }
  };
};
