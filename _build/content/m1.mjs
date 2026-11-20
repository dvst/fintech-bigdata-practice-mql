// Misión M1 · Auditoría KYC
export default (h) => ({
  lead: 'Primer ticket de la semana. Compliance prepara una inspección y necesita localizar fichas de cliente incompletas. Es un trabajo de <code>find()</code>: filtros, ausencias, proyección y orden.',
  body: `
${h.ticket({
  key: 'DATA-101', type: 'Task', priority: 'Alta', reporter: 'Lucía Ferrer', reporterColor: '#a78bfa', estimate: '20 min', labels: ['compliance', 'kyc', 'find'],
  summary: 'Listado de facturas de clientes de Canadá sin teléfono registrado',
  description: '<p>El regulador ha pedido revisar los datos de contacto de los clientes canadienses. Necesitamos el listado de <b>facturas</b> de clientes de <b>Canadá</b> cuyo cliente <b>no tiene teléfono</b>, para que el equipo de atención los contacte por email.</p>',
  criteria: [
    'Solo facturas de <code>contract.country</code> = <code>"Canada"</code> sin <code>Client.Phone</code>.',
    'Cada resultado contiene <b>únicamente</b> <code>_id</code>, <code>Client.Name</code>, <code>Client.DNI</code> y <code>Client.Email</code>.',
    'Ordenado por <code>Client.DNI</code> ascendente y, a igualdad, por <code>_id</code> ascendente.'
  ],
  comments: [
    { who: 'Javier Molina', role: 'Data Lead', when: 'hace 2 h', color: '#4c9bff', text: 'Recuerda que en esta collection no todos los campos existen siempre. «Sin teléfono» significa que el campo no está: compruébalo antes de dar el número por bueno.' },
    { who: 'Lucía Ferrer', role: 'Compliance', when: 'hace 1 h', color: '#a78bfa', text: 'Para el informe también necesito saber <b>cuántos clientes distintos</b> son, no solo cuántas facturas. Un cliente tiene una factura por mes.' }
  ]
})}
${h.callout('tip', 'Repaso', '<p>Lecciones <a href="../lecciones/02-find-filtro-proyeccion.html">02</a> (proyección y orden), <a href="../lecciones/03-operadores-consulta.html">03</a> (<code>$exists</code>) y <a href="../lecciones/07-group-acumuladores.html">07</a> (valores distintos).</p>')}
`,
  lab: {
    id: 'm1', title: 'DATA-101 · Resolver el ticket', minutes: 20,
    intro: 'Trabaja en la terminal de la derecha (mongosh real). Cada paso corresponde a un criterio de aceptación o a una petición del ticket, y se valida contra tu MongoDB.',
    done: 'Ticket <b>DATA-101</b> resuelto. Compliance ya tiene su listado y el número de clientes afectados.',
    steps: [
      { kind: 'task', xp: 40, title: 'AC1 · Las facturas afectadas', body: '<p>Obtén las facturas de clientes de Canadá sin teléfono (de momento, sin proyección ni orden).</p>', hints: ['País con igualdad; teléfono con <code>$exists</code>.', '<code>{ "contract.country": "Canada", "Client.Phone": { $exists: false } }</code>'], solution: 'db.__COL__.find({ "contract.country": "Canada", "Client.Phone": { $exists: false } })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Canada", "Client.Phone": { $exists: false } })', mode: 'ids' } },
      { kind: 'task', xp: 40, title: 'AC2 + AC3 · El listado final', body: '<p>Completa la consulta: solo los campos pedidos y el orden pedido.</p>', hints: ['Proyección de inclusión con los tres campos del cliente; <code>_id</code> sale por defecto.', 'Orden con dos claves: <code>{ "Client.DNI": 1, _id: 1 }</code>.'], solution: 'db.__COL__.find(\n  { "contract.country": "Canada", "Client.Phone": { $exists: false } },\n  { "Client.Name": 1, "Client.DNI": 1, "Client.Email": 1 }\n).sort({ "Client.DNI": 1, _id: 1 })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Canada", "Client.Phone": { $exists: false } }, { "Client.Name": 1, "Client.DNI": 1, "Client.Email": 1 }).sort({ "Client.DNI": 1, _id: 1 })', mode: 'docs', ordered: true, extra: [{ label: 'Cada resultado tiene solo Name, DNI y Email dentro de Client', test: 'docs.every(function (d) { return d.Client && Object.keys(d.Client).sort().join() === "DNI,Email,Name"; })', hint: 'Revisa la proyección: ¿falta o sobra algún campo del cliente?' }] } },
      { kind: 'task', xp: 40, title: 'Petición de Lucía · Clientes distintos', body: '<p>Lucía necesita el número de <b>clientes distintos</b> afectados (identificados por <code>Client.customer code</code>). Resultado: <code>{ clientes: N }</code>.</p>', hints: ['Necesitas un pipeline: filtra igual que antes y agrupa por el código de cliente.', 'Tras agrupar, cada documento es un cliente: cuéntalos con <code>$count</code>.'], solution: 'db.__COL__.aggregate([\n  { $match: { "contract.country": "Canada", "Client.Phone": { $exists: false } } },\n  { $group: { _id: "$Client.customer code" } },\n  { $count: "clientes" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { "contract.country": "Canada", "Client.Phone": { $exists: false } } }, { $group: { _id: "$Client.customer code" } }, { $count: "clientes" }])', mode: 'docs' } },
      { kind: 'quiz', xp: 20, title: 'Antes de cerrar el ticket', q: 'Un compañero sugiere incluir también los contratos sin fecha de fin, «porque también son fichas incompletas». ¿Qué haces?', options: ['Los añado: cuantos más, mejor', 'Pregunto a Lucía si entra en el alcance antes de cambiar el resultado', 'Los añado en otra lista sin decir nada', 'Ignoro la sugerencia'], answer: 1, why: 'Un contrato sin fecha de fin puede ser simplemente indefinido: no es un dato «incompleto» por definición. Ante requisitos ambiguos, se pregunta y se documenta la decisión. Pasa lo mismo con cualquier encargo: si interpretas un requisito, déjalo escrito.' }
    ]
  }
});
