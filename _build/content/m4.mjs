// Misión M4 · Cine por país de producción
const CAT = '{ $unwind: "$Movies" }, { $group: { _id: "$Movies.Title", pais: { $first: "$Movies.Details.Country" }, imdb: { $first: "$Movies.Details.IMDB score" }, duracion: { $first: "$Movies.Details.Duration" } } }';
const BY = '{ $match: { pais: { $type: "string" } } }, { $group: { _id: "$pais", peliculas: { $sum: 1 }, imdb_medio: { $avg: "$imdb" }, duracion_media: { $avg: "$duracion" } } }';
const OUT = '{ $project: { peliculas: 1, imdb_medio: { $round: ["$imdb_medio", 2] }, duracion_media: { $round: ["$duracion_media", 0] } } }, { $sort: { imdb_medio: -1, _id: 1 } }';
const pretty = (s) => 'db.__COL__.aggregate([\n  ' + s.replace(/\}, \{ \$/g, '},\n  { $') + '\n])';

export default (h) => ({
  lead: 'Contenidos quiere saber cómo es el catálogo que ven los clientes según el país donde se produjo cada película. Catálogo deduplicado, medias por grupo y, sobre todo, <b>desconfiar de los promedios</b> que se apoyan en muy pocos datos.',
  body: `
${h.ticket({
  key: 'DATA-104', type: 'Story', priority: 'Baja', reporter: 'Iván Soto', reporterColor: '#ffb547', estimate: '25 min', labels: ['contenidos', 'catalogo', 'group'],
  summary: 'Calidad del catálogo visto por país de producción',
  description: '<p>Queremos comparar las películas <b>vistas por nuestros clientes</b> según su <b>país de producción</b> (<code>Details.Country</code>): cuántas películas distintas hay de cada país, su puntuación IMDB media y su duración media. Es para decidir qué cinematografías reforzar.</p>',
  criteria: [
    'Una fila por película (por título) antes de calcular nada, con su país, su puntuación (<code>Details.IMDB score</code>) y su duración.',
    'Por país de producción: <code>peliculas</code> (número de títulos), <code>imdb_medio</code> (2 decimales) y <code>duracion_media</code> (minutos, sin decimales). Solo películas con país conocido.',
    'Orden: <code>imdb_medio</code> de mayor a menor; en empate, por país.'
  ],
  comments: [
    { who: 'Nora Vidal', role: 'Analista de datos', when: 'hace 30 min', color: '#ff9ecf', text: 'Ojo: cada película aparece <b>una vez por cada visualización</b>. Si haces las medias sin deduplicar antes, las películas muy vistas pesan más que las demás.' },
    { who: 'Iván Soto', role: 'Contenidos', when: 'hace 10 min', color: '#ffb547', text: 'He visto países con una sola película y una media de 8,5… Con tan pocas no me fío. ¿Puedes dejar solo los países con <b>al menos 5 películas</b>?' }
  ]
})}
${h.callout('tip', 'Repaso', '<p>Lecciones <a href="../lecciones/07-group-acumuladores.html">07</a> (<code>$group</code>, <code>$avg</code>) y <a href="../lecciones/08-unwind-arrays-embebidos.html">08</a> (catálogo deduplicado).</p>')}
`,
  lab: {
    id: 'm4', title: 'DATA-104 · Comparar el catálogo', minutes: 25,
    intro: 'Trabaja en la terminal de la derecha (mongosh real). Lee los comentarios antes de dar el informe por bueno.',
    done: 'Ticket <b>DATA-104</b> entregado, con el criterio de representatividad documentado. Eso es lo que diferencia un buen análisis.',
    steps: [
      { kind: 'task', xp: 40, title: 'AC1 · ¿Cuántos países hay?', body: '<p>Construye el catálogo (una fila por título, con <code>$first</code> del país) y cuenta cuántos <b>países de producción distintos</b> aparecen, sin contar las películas sin país: <code>{ paises: N }</code>.</p>', hints: ['Catálogo: <code>$unwind</code> de <code>Movies</code> → <code>$group</code> por <code>"$Movies.Title"</code> con <code>$first</code> de <code>Details.Country</code>.', 'Descarta las películas sin país con <code>$match</code> y <code>$type: "string"</code>.', 'Agrupa por país y cuenta los grupos con <code>$count</code>.'], solution: pretty(CAT + ', { $match: { pais: { $type: "string" } } }, { $group: { _id: "$pais" } }, { $count: "paises" }'), check: { type: 'query', ref: 'db.__COL__.aggregate([' + CAT + ', { $match: { pais: { $type: "string" } } }, { $group: { _id: "$pais" } }, { $count: "paises" }])', mode: 'docs' } },
      { kind: 'quiz', xp: 20, title: 'El aviso de Nora', q: 'Si calculas <code>imdb_medio</code> justo después de <code>$unwind</code>, sin agrupar antes por título, ¿qué obtienes?', options: ['Lo mismo', 'Una media ponderada por visualizaciones: las películas más vistas cuentan más veces', 'Un error', 'La media solo de las películas sin país'], answer: 1, why: 'No es necesariamente un error, pero responde a otra pregunta («qué calidad tiene lo que se ve», no «qué calidad tiene el catálogo»). El ticket pide la segunda.' },
      { kind: 'task', xp: 50, title: 'AC2 + AC3 · El informe', body: '<p>Construye el informe completo del ticket (todos los países con país conocido).</p>', hints: ['Añade al catálogo la puntuación y la duración (<code>$first</code>).', 'Después, <code>$group</code> por país con <code>$sum: 1</code> y dos <code>$avg</code>.', 'Redondea en un <code>$project</code> y ordena por <code>{ imdb_medio: -1, _id: 1 }</code>.'], solution: pretty(CAT + ', ' + BY + ', ' + OUT), check: { type: 'query', ref: 'db.__COL__.aggregate([' + CAT + ', ' + BY + ', ' + OUT + '])', mode: 'docs', ordered: true } },
      { kind: 'task', xp: 40, title: 'Petición de Iván · Al menos 5 películas', body: '<p>Repite el informe dejando solo los países con <b>5 películas o más</b>.</p>', hints: ['Un <code>$match</code> sobre el campo calculado <code>peliculas</code>.', 'Ponlo después del <code>$group</code>: antes, ese campo todavía no existe.'], solution: pretty(CAT + ', ' + BY + ', { $match: { peliculas: { $gte: 5 } } }, ' + OUT), check: { type: 'query', ref: 'db.__COL__.aggregate([' + CAT + ', ' + BY + ', { $match: { peliculas: { $gte: 5 } } }, ' + OUT + '])', mode: 'docs', ordered: true } },
      { kind: 'quiz', xp: 20, title: 'Qué escribir en el ticket', q: '¿Qué nota acompaña mejor a la entrega?', options: ['Ninguna: el informe habla solo', '«Las medias se calculan sobre títulos distintos (no sobre visualizaciones) y solo para países con 5 películas o más, porque con menos el promedio no es representativo.»', '«Se han filtrado algunos países.»', '«Los datos están mal.»'], answer: 1, why: 'Explica qué población usas, qué excluyes y por qué. Así quien lea el informe puede juzgar si las conclusiones se sostienen.' }
    ]
  }
});
