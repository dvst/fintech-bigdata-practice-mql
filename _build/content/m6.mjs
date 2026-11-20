// Misión M6 · Facturas extremas por tarifa
const MAP = 'function () { emit(this.contract.product.Reference, { max: this.TOTAL, maxId: this._id, min: this.TOTAL, minId: this._id }); }';
const REDUCE = 'function (key, values) {\n    var r = { max: values[0].max, maxId: values[0].maxId, min: values[0].min, minId: values[0].minId };\n    values.forEach(function (v) {\n      if (v.max > r.max || (v.max === r.max && v.maxId < r.maxId)) { r.max = v.max; r.maxId = v.maxId; }\n      if (v.min < r.min || (v.min === r.min && v.minId < r.minId)) { r.min = v.min; r.minId = v.minId; }\n    });\n    return r;\n  }';
const FIN = 'function (key, v) { v.rango = Math.round((v.max - v.min) * 100) / 100; return v; }';
const mr = (out) => 'db.__COL__.mapReduce(\n  ' + MAP + ',\n  ' + REDUCE + ',\n  { out: ' + out + ', finalize: ' + FIN + ' }\n)';
const one = (s) => s.replace(/\n\s*/g, ' ');
const PIPE = 'db.__COL__.aggregate([\n  { $group: {\n      _id: "$contract.product.Reference",\n      max: { $top: { sortBy: { TOTAL: -1, _id: 1 }, output: ["$TOTAL", "$_id"] } },\n      min: { $top: { sortBy: { TOTAL: 1, _id: 1 }, output: ["$TOTAL", "$_id"] } }\n  } },\n  { $project: {\n      max: { $arrayElemAt: ["$max", 0] }, maxId: { $arrayElemAt: ["$max", 1] },\n      min: { $arrayElemAt: ["$min", 0] }, minId: { $arrayElemAt: ["$min", 1] },\n      rango: { $round: [{ $subtract: [{ $arrayElemAt: ["$max", 0] }, { $arrayElemAt: ["$min", 0] }] }, 2] }\n  } }\n])';

export default (h) => ({
  lead: 'Finanzas mantiene un informe heredado escrito en MapReduce. Hay que reproducirlo, guardarlo y <b>validarlo contra un pipeline</b>. Un <code>reduce</code> que no suma ni cuenta: elige extremos, y tiene que hacerlo de forma determinista.',
  body: `
${h.ticket({
  key: 'DATA-106', type: 'Task', priority: 'Alta', reporter: 'Carlos Méndez', reporterColor: '#00a8ff', estimate: '30 min', labels: ['finanzas', 'mapreduce', 'migración'],
  summary: 'Reproducir el informe de facturas extremas por tarifa y validar la migración',
  description: '<p>Auditoría revisa cada trimestre la <b>factura más alta y la más baja de cada tarifa</b>. El informe se calcula con un <b>MapReduce</b> antiguo que a veces devuelve un <code>_id</code> distinto para la misma cifra. Antes de migrarlo a aggregation queremos tener ambas versiones y que den exactamente lo mismo.</p>',
  criteria: [
    'MapReduce por tarifa (<code>contract.product.Reference</code>) cuyo <code>value</code> sea <code>{ max, maxId, min, minId, rango }</code>: importe máximo y mínimo con el <code>_id</code> de su factura, y <code>rango</code> = max − min (2 decimales, en <code>finalize</code>). En empate de importe, gana el <code>_id</code> menor.',
    'Pipeline equivalente que devuelva <code>{ _id: tarifa, max, maxId, min, minId, rango }</code> con los mismos valores.',
    'El resultado del MapReduce queda guardado en <code>__SANDBOX__.informe_extremos</code>.'
  ],
  comments: [
    { who: 'Carlos Méndez', role: 'Finanzas', when: 'hace 4 h', color: '#00a8ff', text: 'Lo raro es que, ejecutando el mismo informe dos veces, a veces cambia el <code>_id</code> de la factura máxima aunque el importe sea el mismo…' },
    { who: 'Javier Molina', role: 'Data Lead', when: 'hace 2 h', color: '#4c9bff', text: 'Eso huele a empates: si hay varias facturas con el mismo importe y <code>reduce</code> se queda con «la primera que llega», el resultado depende del orden. Hay que desempatar explícitamente.' }
  ]
})}
${h.callout('tip', 'Repaso', '<p>Lecciones <a href="../lecciones/11-mapreduce.html">11</a> (reglas de <code>reduce</code>) y <a href="../lecciones/07-group-acumuladores.html">07</a> (<code>$group</code>, <code>$top</code>).</p>')}
`,
  lab: {
    id: 'm6', title: 'DATA-106 · Migración validada', minutes: 30,
    intro: 'Trabaja en la terminal de la derecha (mongosh real). Recuerda: en el laboratorio, <code>out</code> solo puede ser <code>inline</code> o la database <code>__SANDBOX__</code>.',
    done: 'Ticket <b>DATA-106</b> cerrado: dos implementaciones, mismo resultado, informe guardado. La migración está validada.',
    steps: [
      { kind: 'quiz', xp: 20, title: 'El bug del original', q: '¿Por qué el informe antiguo devolvía a veces un <code>_id</code> distinto para el mismo importe máximo?', options: ['Porque MapReduce redondea mal', 'Porque reduce puede recibir los valores en cualquier orden y en varias tandas: si ante un empate se queda con «el primero», el resultado depende del orden', 'Porque faltaba un índice', 'Porque emit no admite objetos'], answer: 1, why: 'reduce debe ser conmutativo y asociativo: el resultado no puede depender del orden. Con un criterio de desempate explícito (el <code>_id</code> menor) lo es.' },
      { kind: 'task', xp: 50, title: 'AC1 · El MapReduce', body: '<p>Escribe el MapReduce del AC1 con <code>out: { inline: 1 }</code>.</p>', hints: ['map emite, para cada factura, un objeto con la misma cifra como máximo y como mínimo: <code>{ max: this.TOTAL, maxId: this._id, min: this.TOTAL, minId: this._id }</code>.', 'reduce recorre los valores y se queda con el mayor <code>max</code> y el menor <code>min</code>; en empate, con el <code>_id</code> menor. Devuelve la misma forma que emite map.', 'finalize: <code>v.rango = Math.round((v.max - v.min) * 100) / 100; return v;</code>'], solution: mr('{ inline: 1 }'), check: { type: 'query', ref: one(mr('{ inline: 1 }')), mode: 'docs' } },
      { kind: 'task', xp: 50, title: 'AC2 · El pipeline equivalente', body: '<p>Escribe el pipeline del AC2: <code>{ _id: tarifa, max, maxId, min, minId, rango }</code>.</p>', hints: ['<code>$top</code> (MongoDB 5.2+) devuelve el primer documento de cada grupo según un orden propio, y puede devolver varios campos a la vez: <code>output: ["$TOTAL", "$_id"]</code>.', 'Usa dos <code>$top</code>: uno ordenado por importe descendente y otro ascendente, ambos con <code>_id: 1</code> para desempatar.', 'Después, <code>$arrayElemAt</code> para separar importe e <code>_id</code>, y <code>$round</code> para el rango.'], solution: PIPE, check: { type: 'query', ref: one(PIPE), mode: 'docs' }, success: 'Compara a ojo con el MapReduce: mismas cifras y mismos <code>_id</code>, distinta forma (<code>value</code> anidado frente a campos planos).' },
      { kind: 'task', xp: 40, title: 'AC3 · Guardar el informe', body: '<p>Ejecuta de nuevo el MapReduce del AC1, pero guardando el resultado en la collection <code>informe_extremos</code> de la database <code>__SANDBOX__</code>.</p>', hints: ['Solo cambia la opción <code>out</code>.', '<code>out: { replace: "informe_extremos", db: "__SANDBOX__" }</code>'], solution: mr('{ replace: "informe_extremos", db: "__SANDBOX__" }'), check: { type: 'query', ref: one(mr('{ inline: 1 }')), mode: 'docs' }, success: 'La validación ha leído <code>__SANDBOX__.informe_extremos</code> y ha comprobado que coincide con el informe esperado.' },
      { kind: 'quiz', xp: 20, title: 'Recomendación final', q: '¿Qué recomiendas a Finanzas?', options: ['Mantener MapReduce: funciona', 'Migrar al pipeline: da lo mismo (comprobado), es más rápido, no ejecuta JavaScript en el servidor y MapReduce está obsoleto desde MongoDB 5.0', 'Mantener las dos versiones en producción', 'Reescribirlo en SQL'], answer: 1, why: 'La comprobación cruzada es lo que te permite recomendar la migración con seguridad.' }
    ]
  }
});
