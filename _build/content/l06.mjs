// Lección 06 · Aggregation pipeline
export default (h) => {
  const mini = h.data.mini.map((d) => ({ _id: d._id, billing: d.billing, TOTAL: d.TOTAL, Client: { Name: d.Client.Name }, contract: { country: d.contract.country, product: { Reference: d.contract.product.Reference, type: d.contract.product.type } } }));
  const box = (x, label, color, sub) => `<rect x="${x}" y="40" width="118" height="56" rx="10" fill="${color}" fill-opacity=".13" stroke="${color}"/><text x="${x + 59}" y="66" text-anchor="middle" style="font:700 14px var(--mono);fill:${color}">${label}</text><text x="${x + 59}" y="85" text-anchor="middle" style="font:11px var(--sans);fill:var(--muted)">${sub}</text>`;
  const arrow = (x) => `<path d="M${x} 68h22" stroke="var(--muted)" stroke-width="2" marker-end="url(#a6)"/>`;
  const flow = `
<svg viewBox="0 0 760 150" role="img" aria-label="Un pipeline: la salida de cada etapa es la entrada de la siguiente">
  <defs><marker id="a6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker></defs>
  <text x="44" y="64" text-anchor="middle" style="font:700 22px var(--mono);fill:var(--text)">▤</text><text x="44" y="86" text-anchor="middle" style="font:11px var(--sans);fill:var(--muted)">collection</text>
  ${arrow(74)}${box(100, '$match', 'var(--accent)', 'filtra')}${arrow(222)}${box(248, '$project', 'var(--ok)', 'da forma')}${arrow(370)}${box(396, '$group', 'var(--violet)', 'agrupa')}${arrow(518)}${box(544, '$sort', 'var(--warn)', 'ordena')}${arrow(666)}
  <text x="716" y="64" text-anchor="middle" style="font:700 22px var(--mono);fill:var(--text)">⇶</text><text x="716" y="86" text-anchor="middle" style="font:11px var(--sans);fill:var(--muted)">resultado</text>
  <circle r="5" fill="var(--mongo)"><animateMotion dur="3.2s" repeatCount="indefinite" path="M74 68H690"/></circle>
  <text x="380" y="132" text-anchor="middle" style="font:12.5px var(--sans);fill:var(--text2)">db.__COL__.aggregate([ { etapa 1 }, { etapa 2 }, … ])  ·  cada etapa recibe los documentos que produce la anterior</text>
</svg>`;
  return {
    viz: true,
    lead: 'El <b>aggregation pipeline</b> es una cadena de etapas por la que pasan los documentos: cada una los filtra, los transforma, los agrupa o los ordena, y entrega el resultado a la siguiente.',
    objectives: [
      'Entender el modelo de etapas y por qué su orden importa',
      'Traducir <code>find()</code> a <code>$match</code>, <code>$project</code>, <code>$sort</code>, <code>$limit</code>',
      'Crear, renombrar y calcular campos con <code>"$campo"</code>',
      'Construir y depurar un pipeline etapa a etapa'
    ],
    body: `
${h.label('① Concepto')}
<h2>Una cadena de montaje para documentos</h2>
${h.figure(flow)}
<p>Recorre este pipeline con las 8 facturas de ejemplo. Fíjate en cómo cambia la <b>forma</b> de los documentos en <code>$project</code>:</p>
${h.viz('pipe', {
  docs: mini, inputLabel: 'collection', inputExplain: 'Las 8 facturas de partida.',
  stages: [
    { label: '$match', code: '{ $match: { "contract.product.type": "pay per content" } }', stage: { $match: { 'contract.product.type': 'pay per content' } }, explain: 'Igual que el filtro de <code>find()</code>.' },
    { label: '$project', code: '{ $project: { _id: 0, cliente: "$Client.Name", pais: "$contract.country", TOTAL: 1 } }', stage: { $project: { _id: 0, cliente: '$Client.Name', pais: '$contract.country', TOTAL: 1 } }, keepRemoved: false, explain: '<code>"$Client.Name"</code> (con <b>$</b>) significa «el valor de ese campo». Así se renombran y aplanan campos.' },
    { label: '$sort', code: '{ $sort: { TOTAL: -1 } }', stage: { $sort: { TOTAL: -1 } }, explain: 'Ordena por importe descendente.' },
    { label: '$limit', code: '{ $limit: 3 }', stage: { $limit: 3 }, explain: 'Se queda con los 3 primeros <b>en este punto</b> del pipeline.' }
  ]
})}

${h.label('② De find() a aggregate()')}
<h2>Lo que ya sabes, en forma de etapas</h2>
${h.cheat(['find()', 'aggregate()'], [
  ['<code>find({ filtro })</code>', '<code>{ $match: { filtro } }</code> (mismos operadores: lecciones 02–05)'],
  ['<code>find({}, { a: 1, _id: 0 })</code>', '<code>{ $project: { a: 1, _id: 0 } }</code>'],
  ['<code>.sort({ a: -1 })</code>', '<code>{ $sort: { a: -1 } }</code>'],
  ['<code>.skip(10)</code> · <code>.limit(5)</code>', '<code>{ $skip: 10 }</code> · <code>{ $limit: 5 }</code>'],
  ['<code>countDocuments(filtro)</code>', '<code>{ $match: … }, { $count: "nombre" }</code>'],
  ['— (imposible con find)', '<code>$group</code>, <code>$unwind</code>, <code>$facet</code>, campos calculados…']
])}
${h.callout('err', 'El orden de las etapas importa', '<p>En <code>find()</code> el servidor siempre ordena antes de limitar. En un pipeline, <b>cada etapa se aplica en el orden en que la escribes</b>: <code>[{ $limit: 5 }, { $sort: { TOTAL: -1 } }]</code> toma 5 documentos cualesquiera y luego los ordena. Casi nunca es lo que quieres.</p>')}
${h.quiz({ id: 'l06-q1', q: '¿Qué devuelve <code>[{ $sort: { TOTAL: -1 } }, { $limit: 5 }, { $match: { "contract.country": "Spain" } }]</code>?', options: ['Las 5 facturas españolas con mayor importe', 'Las facturas españolas que estén entre las 5 de mayor importe de toda la collection (puede que ninguna)', 'Error: $match debe ir primero', '5 facturas españolas cualesquiera'], answer: 1, why: 'Primero se queda con las 5 mayores de toda la collection y después filtra por país. Para «las 5 mayores de España», <code>$match</code> va antes.' })}

${h.label('③ Dar forma')}
<h2>$project, $addFields y la sintaxis <code>"$campo"</code></h2>
${h.code(`db.__COL__.aggregate([
  { $match: { "contract.country": "Spain", billing: "March 2025" } },
  { $project: {
      _id: 0,
      cliente: "$Client.Name",                    // renombrar / aplanar
      tarifa: "$contract.product.Reference",
      importe: "$TOTAL",
      iva: { $round: [ { $multiply: ["$TOTAL", 0.21] }, 2 ] },   // calcular
      moneda: { $literal: "EUR" }                 // valor fijo
  } }
])`)}
${h.cheat(['Etapa', 'Qué hace'], [
  ['<code>$project</code>', 'Define la forma completa de salida: solo quedan los campos que nombres (más <code>_id</code> si no lo quitas).'],
  ['<code>$addFields</code> / <code>$set</code>', 'Añade o sustituye campos y conserva <b>todos los demás</b>.'],
  ['<code>$unset</code>', 'Quita campos: <code>{ $unset: ["Movies", "Series"] }</code>.'],
  ['<code>$replaceRoot</code> / <code>$replaceWith</code>', 'Convierte un subdocumento en el documento entero.']
])}
${h.callout('warn', '"$campo" frente a "campo"', '<p>A la derecha de los dos puntos, <code>"$TOTAL"</code> es el <b>valor</b> del campo y <code>"TOTAL"</code> es el <b>texto</b> «TOTAL». A la izquierda (nombres de campo de salida o claves de <code>$match</code>) nunca se pone <code>$</code>.</p>')}
${h.quiz({ id: 'l06-q2', q: 'En <code>{ $project: { pais: "contract.country" } }</code>, ¿qué vale <code>pais</code>?', options: ['El país de cada factura', 'El texto literal "contract.country" en todas', 'null', 'Error de sintaxis'], answer: 1, why: 'Sin <code>$</code> es un string normal. Debe ser <code>"$contract.country"</code>.' })}

${h.label('④ Construir y depurar')}
<h2>Método de trabajo</h2>
<ol>
  <li><b>Empieza por <code>$match</code></b>: reduce cuanto antes los documentos (y puede usar índices).</li>
  <li><b>Añade una etapa cada vez</b> y mira la salida antes de seguir.</li>
  <li>Mientras desarrollas, pon <b><code>{ $limit: 3 }</code></b> detrás de la etapa que estás probando, o trabaja con <code>{ $match: { _id: "…" } }</code> sobre un documento que conozcas.</li>
  <li>Guarda el pipeline en una <b>variable</b> y añádele etapas: <code>var p = [ … ]; db.__COL__.aggregate(p)</code>.</li>
  <li>Cuenta documentos entre etapas con <code>{ $count: "n" }</code> para detectar pérdidas inesperadas.</li>
</ol>
${h.code(`var p = [
  { $match: { "contract.country": "Spain" } },
  { $project: { _id: 0, importe: "$TOTAL", mes: "$billing" } }
]
db.__COL__.aggregate(p.concat([{ $limit: 3 }]))   // probar con 3
db.__COL__.aggregate(p.concat([{ $count: "n" }]))  // ¿cuántos quedan?`)}
${h.callout('tip', 'Límites', '<p>Cada etapa puede usar hasta 100 MB de memoria; si una agrupación u ordenación grande lo supera, pasa <code>{ allowDiskUse: true }</code> como segundo argumento de <code>aggregate()</code> (en MongoDB 6.0+ ya es el comportamiento por defecto).</p>')}

${h.label('⑤ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Etapa', 'Ejemplo'], [
  ['<code>$match</code>', '<code>{ $match: { TOTAL: { $gt: 50 } } }</code>'],
  ['<code>$project</code>', '<code>{ $project: { _id: 0, pais: "$contract.country" } }</code>'],
  ['<code>$addFields</code>', '<code>{ $addFields: { doble: { $multiply: ["$TOTAL", 2] } } }</code>'],
  ['<code>$sort</code> · <code>$skip</code> · <code>$limit</code>', '<code>{ $sort: { TOTAL: -1, _id: 1 } }</code>'],
  ['<code>$count</code>', '<code>{ $count: "facturas" }</code> → <code>{ facturas: N }</code>']
])}
`,
    lab: {
      id: 'l06', title: 'Lab 06 · Tu primer pipeline', minutes: 30,
      done: 'Ya piensas en etapas. La siguiente lección añade la etapa más potente: <code>$group</code>.',
      steps: [
        { kind: 'task', title: 'Filtrar y contar', body: '<p>Con <code>aggregate()</code>, cuenta las facturas de <b>diciembre de 2025</b> con importe <b>superior a 100</b>. El resultado debe ser <code>{ facturas: N }</code>.</p>', hints: ['Dos etapas: filtrar y contar.', '<code>$match</code> usa los mismos operadores que <code>find()</code>.', '<code>{ $count: "facturas" }</code> produce un documento con ese nombre de campo.'], solution: 'db.__COL__.aggregate([\n  { $match: { billing: "December 2025", TOTAL: { $gt: 100 } } },\n  { $count: "facturas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { billing: "December 2025", TOTAL: { $gt: 100 } } }, { $count: "facturas" }])', mode: 'docs' } },
        { kind: 'task', title: 'Renombrar y aplanar', body: '<p>Para las facturas de <b>marzo de 2025</b> de <b>España</b>, devuelve documentos con exactamente estos campos: <code>cliente</code> (nombre del cliente), <code>tarifa</code> (<code>contract.product.Reference</code>) e <code>importe</code> (<code>TOTAL</code>). Sin <code>_id</code>.</p>', hints: ['<code>$match</code> y después <code>$project</code>.', 'Para tomar el valor de un campo: <code>"$Client.Name"</code>, con <b>$</b>.'], solution: 'db.__COL__.aggregate([\n  { $match: { billing: "March 2025", "contract.country": "Spain" } },\n  { $project: { _id: 0, cliente: "$Client.Name", tarifa: "$contract.product.Reference", importe: "$TOTAL" } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { billing: "March 2025", "contract.country": "Spain" } }, { $project: { _id: 0, cliente: "$Client.Name", tarifa: "$contract.product.Reference", importe: "$TOTAL" } }])', mode: 'docs' } },
        { kind: 'task', title: 'Los 3 mayores', body: '<p>Amplía el pipeline anterior para quedarte con las <b>3 facturas de mayor importe</b>, de mayor a menor.</p>', hints: ['Necesitas dos etapas más al final.', 'Puedes ordenar por <code>importe</code>: después de <code>$project</code>, ese es el nombre del campo.'], solution: 'db.__COL__.aggregate([\n  { $match: { billing: "March 2025", "contract.country": "Spain" } },\n  { $project: { _id: 0, cliente: "$Client.Name", tarifa: "$contract.product.Reference", importe: "$TOTAL" } },\n  { $sort: { importe: -1 } },\n  { $limit: 3 }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { billing: "March 2025", "contract.country": "Spain" } }, { $project: { _id: 0, cliente: "$Client.Name", tarifa: "$contract.product.Reference", importe: "$TOTAL" } }, { $sort: { importe: -1 } }, { $limit: 3 }])', mode: 'docs', ordered: true }, success: 'Truco: si guardas el pipeline en una variable (<code>var p = [...]</code>), solo tienes que añadir etapas con <code>p.concat([...])</code>.' },
        { kind: 'quiz', title: 'El orden importa', q: 'Cambias el orden a <code>$limit</code> → <code>$sort</code>. ¿Qué ocurre?', options: ['Nada, el resultado es el mismo', 'Obtienes 3 facturas cualesquiera ordenadas entre sí', 'Error', 'Obtienes las 3 de menor importe'], answer: 1, why: 'En un pipeline cada etapa trabaja sobre lo que le llega: primero coge 3 documentos (los primeros en el orden de almacenamiento) y después los ordena.' },
        { kind: 'task', title: 'Campo calculado', body: '<p>Para las mismas facturas (marzo 2025, España), añade a cada una un campo <code>iva</code> con el 21 % del importe <b>redondeado a 2 decimales</b>, y devuelve solo <code>_id</code>, <code>TOTAL</code> e <code>iva</code>.</p>', hints: ['Multiplicar: <code>{ $multiply: ["$TOTAL", 0.21] }</code>.', 'Redondear: <code>{ $round: [ expresión, 2 ] }</code>.', 'En <code>$project</code>, <code>TOTAL: 1</code> conserva el campo y <code>_id</code> sale solo.'], solution: 'db.__COL__.aggregate([\n  { $match: { billing: "March 2025", "contract.country": "Spain" } },\n  { $project: { TOTAL: 1, iva: { $round: [ { $multiply: ["$TOTAL", 0.21] }, 2 ] } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { billing: "March 2025", "contract.country": "Spain" } }, { $project: { TOTAL: 1, iva: { $round: [{ $multiply: ["$TOTAL", 0.21] }, 2] } } }])', mode: 'docs' } },
        { kind: 'task', title: 'Filtrar por un campo nuevo', body: '<p>Sobre <b>todas</b> las facturas de <b>España</b>, proyecta <code>importe</code> (<code>TOTAL</code>) y <code>mes</code> (<code>billing</code>) y, <b>en una etapa posterior</b>, quédate con las de importe mayor que 200.</p>', hints: ['Tras <code>$project</code> el campo ya se llama <code>importe</code>: el siguiente <code>$match</code> debe usar ese nombre.', 'Orden: <code>$match</code> (país) → <code>$project</code> → <code>$match</code> (importe).'], solution: 'db.__COL__.aggregate([\n  { $match: { "contract.country": "Spain" } },\n  { $project: { importe: "$TOTAL", mes: "$billing" } },\n  { $match: { importe: { $gt: 200 } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { "contract.country": "Spain" } }, { $project: { importe: "$TOTAL", mes: "$billing" } }, { $match: { importe: { $gt: 200 } } }])', mode: 'docs' }, success: 'Cada etapa solo ve lo que produce la anterior: tras el <code>$project</code>, <code>TOTAL</code> ya no existe.' }
      ]
    }
  };
};
