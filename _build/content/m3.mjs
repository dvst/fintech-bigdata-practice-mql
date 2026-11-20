// Misión M3 · Los géneros que más tiempo consumen
const MIN = '{ $set: { min: { $multiply: ["$Movies.Details.Duration", { $divide: ["$Movies.Viewing PCT", 100] }] } } }';
const BASE = '{ $unwind: "$Movies" }, { $match: { "Movies.Details.Duration": { $type: "number" } } }, ' + MIN + ', { $unwind: "$Movies.Details.Genres" }';
const TAIL = '{ $group: { _id: "$Movies.Details.Genres", minutos: { $sum: "$min" }, titulos: { $addToSet: "$Movies.Title" } } }, { $project: { minutos: { $round: ["$minutos", 0] }, titulos: { $size: "$titulos" } } }, { $sort: { minutos: -1, _id: 1 } }, { $limit: 5 }';

export default (h) => ({
  lead: 'Marketing quiere orientar la campaña de primavera a los géneros en los que más tiempo pasan los clientes. Despliegue de arrays a dos niveles, un campo calculado y valores distintos.',
  body: `
${h.ticket({
  key: 'DATA-103', type: 'Story', priority: 'Media', reporter: 'Marta Ruiz', reporterColor: '#2bd46b', estimate: '25 min', labels: ['marketing', 'aggregation', 'unwind'],
  summary: 'Top 5 de géneros por minutos vistos',
  description: '<p>Para la campaña de primavera queremos saber qué <b>géneros de película</b> acumulan más <b>minutos vistos</b>. No nos vale contar visualizaciones: una película abandonada a los 2 minutos no pesa lo mismo que una vista entera. También queremos saber cuántos títulos distintos hay detrás de cada género.</p>',
  criteria: [
    'Minutos vistos de una visualización = <code>Details.Duration × Viewing PCT / 100</code>. Las películas sin duración numérica no cuentan.',
    'Una película con varios géneros suma sus minutos a cada uno de ellos.',
    'Resultado: los 5 géneros con más minutos, <code>{ _id: género, minutos, titulos }</code>, con <code>minutos</code> redondeado a entero y <code>titulos</code> = número de títulos distintos.',
    'Orden: minutos de mayor a menor; en empate, por género.'
  ],
  comments: [
    { who: 'Marta Ruiz', role: 'Marketing', when: 'hace 3 h', color: '#2bd46b', text: 'Sospecho que Drama va a arrasar… Si es así, ¿me sacas también el mismo top <b>sin contar Drama</b>? Así tengo opciones para varias campañas.' }
  ]
})}
${h.callout('tip', 'Repaso', '<p>Lecciones <a href="../lecciones/07-group-acumuladores.html">07</a> (<code>$addToSet</code>), <a href="../lecciones/08-unwind-arrays-embebidos.html">08</a> (dos niveles de <code>$unwind</code>) y <a href="../lecciones/09-expresiones-agregacion.html">09</a> (aritmética).</p>')}
`,
  lab: {
    id: 'm3', title: 'DATA-103 · Construir el informe', minutes: 25,
    intro: 'Trabaja en la terminal de la derecha (mongosh real). Consejo: guarda el pipeline en una variable y ve añadiendo etapas.',
    done: 'Ticket <b>DATA-103</b> entregado, con la segunda versión que pidió Marta.',
    steps: [
      { kind: 'task', xp: 40, title: 'Calentamiento · Minutos totales', body: '<p>Calcula los <b>minutos vistos en total</b> en todas las visualizaciones de películas (AC1), redondeados a entero: <code>{ _id: null, minutos: N }</code>.</p>', hints: ['Despliega <code>Movies</code> y filtra las que tienen duración numérica (<code>$type: "number"</code>).', 'Minutos: <code>{ $multiply: ["$Movies.Details.Duration", { $divide: ["$Movies.Viewing PCT", 100] }] }</code>.', 'Suma con <code>$group: { _id: null, … }</code> y redondea después con <code>$round</code> en un <code>$project</code>.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Movies" },\n  { $match: { "Movies.Details.Duration": { $type: "number" } } },\n  { $group: { _id: null, minutos: { $sum: { $multiply: ["$Movies.Details.Duration", { $divide: ["$Movies.Viewing PCT", 100] }] } } } },\n  { $project: { minutos: { $round: ["$minutos", 0] } } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $unwind: "$Movies" }, { $match: { "Movies.Details.Duration": { $type: "number" } } }, { $group: { _id: null, minutos: { $sum: { $multiply: ["$Movies.Details.Duration", { $divide: ["$Movies.Viewing PCT", 100] }] } } } }, { $project: { minutos: { $round: ["$minutos", 0] } } }])', mode: 'docs' } },
      { kind: 'task', xp: 50, title: 'AC1–AC4 · El top 5', body: '<p>Construye el informe completo del ticket.</p>', hints: ['Calcula los minutos de cada visualización con <code>$set</code> <b>antes</b> de desplegar los géneros.', 'Segundo <code>$unwind</code> sobre <code>"$Movies.Details.Genres"</code>; después <code>$group</code> por género sumando minutos y reuniendo títulos con <code>$addToSet</code>.', 'En un <code>$project</code>: <code>$round</code> para los minutos y <code>$size</code> para los títulos. Luego <code>$sort</code> y <code>$limit</code>.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Movies" },\n  { $match: { "Movies.Details.Duration": { $type: "number" } } },\n  ' + MIN + ',\n  { $unwind: "$Movies.Details.Genres" },\n  { $group: { _id: "$Movies.Details.Genres", minutos: { $sum: "$min" }, titulos: { $addToSet: "$Movies.Title" } } },\n  { $project: { minutos: { $round: ["$minutos", 0] }, titulos: { $size: "$titulos" } } },\n  { $sort: { minutos: -1, _id: 1 } },\n  { $limit: 5 }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([' + BASE + ', ' + TAIL + '])', mode: 'docs', ordered: true } },
      { kind: 'task', xp: 40, title: 'Petición de Marta · Sin Drama', body: '<p>Marta tenía razón. Repite el top 5 <b>excluyendo el género Drama</b> (mismo formato de salida).</p>', hints: ['Basta con un <code>$match</code> más.', 'Ponlo <b>después</b> del segundo <code>$unwind</code>: antes eliminaría películas enteras que, además de Drama, tienen otros géneros.'], solution: 'db.__COL__.aggregate([\n  { $unwind: "$Movies" },\n  { $match: { "Movies.Details.Duration": { $type: "number" } } },\n  ' + MIN + ',\n  { $unwind: "$Movies.Details.Genres" },\n  { $match: { "Movies.Details.Genres": { $ne: "Drama" } } },\n  { $group: { _id: "$Movies.Details.Genres", minutos: { $sum: "$min" }, titulos: { $addToSet: "$Movies.Title" } } },\n  { $project: { minutos: { $round: ["$minutos", 0] }, titulos: { $size: "$titulos" } } },\n  { $sort: { minutos: -1, _id: 1 } },\n  { $limit: 5 }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([' + BASE + ', { $match: { "Movies.Details.Genres": { $ne: "Drama" } } }, ' + TAIL + '])', mode: 'docs', ordered: true } },
      { kind: 'quiz', xp: 20, title: 'Revisión de código', q: 'Un compañero te pregunta qué pasaría si quitaras el <code>$match</code> de duración numérica. ¿Qué respondes?', options: ['Daría error al multiplicar', 'Los minutos serían los mismos: <code>$multiply</code> con un campo ausente da <code>null</code> y <code>$sum</code> ignora los <code>null</code>; aun así, el filtro deja explícita la decisión', 'Los minutos se duplicarían', 'Saldrían más géneros'], answer: 1, why: 'Conocer cómo se propagan los <code>null</code> te evita sorpresas, pero no sustituye a documentar la decisión: un filtro explícito se lee y se revisa mejor. Ojo: <code>titulos</code> sí podría cambiar, porque <code>$addToSet</code> no ignora esas películas.' }
    ]
  }
});
