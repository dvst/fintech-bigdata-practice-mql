// Misión M5 · Panel de facturación en una consulta
const DEC = '{ $match: { billing: "December 2025" } }';
const FIELDS = '{ $project: { TOTAL: 1, pais: "$contract.country" } }';
const TOP = 'top: [ { $sort: { TOTAL: -1, _id: 1 } }, { $limit: 5 }, ' + FIELDS + ' ]';
const BOTTOM = 'bottom: [ { $sort: { TOTAL: 1, _id: 1 } }, { $limit: 5 }, ' + FIELDS + ' ]';
const RES = 'resumen: [ { $group: { _id: null, facturas: { $sum: 1 }, media: { $avg: "$TOTAL" } } }, { $project: { facturas: 1, media: { $round: ["$media", 2] } } } ]';

export default (h) => ({
  lead: 'Producto está diseñando un panel de facturación y quiere todos los datos de un bloque en <b>una sola consulta</b>. <code>$facet</code> con varias vistas sobre la misma entrada.',
  body: `
${h.ticket({
  key: 'DATA-105', type: 'Story', priority: 'Media', reporter: 'Sara Lin', reporterColor: '#4c9bff', estimate: '25 min', labels: ['producto', 'dashboard', 'facet'],
  summary: 'Bloque «Facturas destacadas de diciembre» para el panel',
  description: '<p>El panel tendrá un bloque con las facturas <b>más altas</b> y <b>más bajas</b> de <b>diciembre de 2025</b>. El front-end hace <b>una única llamada</b>: todo tiene que salir de una consulta.</p>',
  criteria: [
    'Solo facturas con <code>billing</code> = <code>"December 2025"</code>.',
    'Un único documento con <code>top</code> (5 de mayor importe) y <code>bottom</code> (5 de menor importe); cada elemento <code>{ _id, TOTAL, pais }</code>.',
    'Orden de <code>top</code>: importe ↓; de <code>bottom</code>: importe ↑; en empate, por <code>_id</code>.'
  ],
  comments: [
    { who: 'Sara Lin', role: 'Product Manager', when: 'hace 1 h', color: '#4c9bff', text: 'Si no es mucho lío, en la misma llamada me vendría genial un tercer campo <code>resumen</code> con el número de facturas del mes y el importe medio (2 decimales).' }
  ]
})}
${h.callout('tip', 'Repaso', '<p>Lecciones <a href="../lecciones/06-aggregation-pipeline.html">06</a> (<code>$sort</code>, <code>$limit</code>, <code>$project</code>) y <a href="../lecciones/10-facet-bucket-deciles.html">10</a> (<code>$facet</code>).</p>')}
`,
  lab: {
    id: 'm5', title: 'DATA-105 · Una llamada, tres vistas', minutes: 25,
    intro: 'Trabaja en la terminal de la derecha (mongosh real). Guarda en una variable la parte común del pipeline y reutilízala.',
    done: 'Ticket <b>DATA-105</b> entregado: tres vistas en una sola llamada.',
    steps: [
      { kind: 'task', xp: 40, title: 'AC1 · Las facturas del mes', body: '<p>¿Cuántas facturas hay de diciembre de 2025? <code>{ facturas: N }</code>.</p>', hints: ['<code>$match</code> por <code>billing</code> y <code>$count</code>.'], solution: 'db.__COL__.aggregate([\n  ' + DEC + ',\n  { $count: "facturas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([' + DEC + ', { $count: "facturas" }])', mode: 'docs' } },
      { kind: 'task', xp: 50, title: 'AC2 + AC3 · Top y bottom', body: '<p>Devuelve el documento con <code>top</code> y <code>bottom</code>.</p>', hints: ['Tras el <code>$match</code>, una etapa <code>$facet</code> con dos ramas.', 'Cada rama: <code>$sort</code> con su orden, <code>$limit: 5</code> y un <code>$project</code> con <code>TOTAL</code> y <code>pais: "$contract.country"</code>.', 'Limita <b>antes</b> de proyectar: así la rama trabaja con menos datos.'], solution: 'db.__COL__.aggregate([\n  ' + DEC + ',\n  { $facet: {\n      ' + TOP + ',\n      ' + BOTTOM + '\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([' + DEC + ', { $facet: { ' + TOP + ', ' + BOTTOM + ' } }])', mode: 'docs' } },
      { kind: 'task', xp: 40, title: 'Petición de Sara · Resumen', body: '<p>Añade una tercera rama <code>resumen</code> con un único elemento <code>{ _id: null, facturas: N, media: X }</code>, con la media de <code>TOTAL</code> redondeada a 2 decimales.</p>', hints: ['Tercera rama del mismo <code>$facet</code>.', '<code>$group</code> con <code>_id: null</code>, <code>$sum: 1</code> y <code>$avg</code>; después <code>$round</code> en un <code>$project</code>.'], solution: 'db.__COL__.aggregate([\n  ' + DEC + ',\n  { $facet: {\n      ' + TOP + ',\n      ' + BOTTOM + ',\n      ' + RES + '\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([' + DEC + ', { $facet: { ' + TOP + ', ' + BOTTOM + ', ' + RES + ' } }])', mode: 'docs' } },
      { kind: 'quiz', xp: 20, title: 'Límites de una sola llamada', q: 'Sara pide añadir una cuarta rama con <b>todas</b> las facturas del año. ¿Qué le adviertes?', options: ['Nada: $facet admite cualquier tamaño', 'El resultado de $facet es un único documento y no puede superar 16 MB: una lista enorme puede romper la consulta; mejor paginarla aparte', 'Que $facet solo admite tres ramas', 'Que hay que repetir el $match en cada rama'], answer: 1, why: 'Los paneles con varias vistas en una llamada son cómodos, pero cada vista debe ser pequeña: <code>$facet</code> devuelve un solo documento.' }
    ]
  }
});
