// Lección 12 · Estrategia y documentación
export default (h) => {
  const step = (x, n, title, sub, color) => `<g><circle cx="${x + 50}" cy="46" r="20" fill="${color}" fill-opacity=".18" stroke="${color}"/><text x="${x + 50}" y="52" text-anchor="middle" style="font:800 15px var(--sans);fill:${color}">${n}</text><text x="${x + 50}" y="90" text-anchor="middle" style="font:700 13px var(--sans);fill:var(--text)">${title}</text><text x="${x + 50}" y="108" text-anchor="middle" style="font:11px var(--sans);fill:var(--muted)">${sub}</text></g>`;
  const flow = `
<svg viewBox="0 0 760 130" role="img" aria-label="Método: leer, explorar, diseñar, construir, probar, documentar">
  <path d="M70 46H690" stroke="var(--line2)" stroke-width="2" stroke-dasharray="4 4"/>
  ${step(10, 1, 'Leer', 'qué se pide', 'var(--accent)')}
  ${step(130, 2, 'Explorar', 'campos y tipos', 'var(--violet)')}
  ${step(250, 3, 'Diseñar', 'granularidad', 'var(--warn)')}
  ${step(370, 4, 'Construir', 'etapa a etapa', 'var(--mongo)')}
  ${step(490, 5, 'Probar', 'cruzar datos', 'var(--ok)')}
  ${step(610, 6, 'Documentar', 'plantilla', 'var(--accent)')}
</svg>`;
  const plantilla = `### Consulta · <título>

**Planteamiento**
- Qué se pide, con mis palabras: …
- Granularidad: cada documento del resultado representa … (factura / visualización / película …)
- Campos usados y anomalías encontradas (ausentes, tipos distintos, duplicados): …
- Decisiones y supuestos (empates, valores ausentes…): …
- Estrategia (etapas o fases y para qué sirve cada una): …
- Alternativa(s) consideradas y por qué elegí esta: …

**Consulta**
\`\`\`js
db.coleccion.aggregate([
  // 1) … qué hace esta etapa
  { $match: { … } },
  // 2) …
])
\`\`\`

**Verificación**
- Resultado (o sus primeras filas) y recuentos: …
- Comprobación cruzada (otro método que da lo mismo): …
- Verificación manual sobre un documento concreto (_id …): …
- Casos límite comprobados (documentos sin el campo, empates…): …`;
  return {
    lead: 'Saber los operadores no basta: lo que convierte una consulta en un resultado fiable es cómo la <b>planteas</b>, la <b>pruebas</b> y la <b>documentas</b>. Esta lección es el método para hacerlo bien con este dataset.',
    objectives: [
      'Seguir un método repetible para cada consulta',
      'Elegir la granularidad correcta antes de escribir código',
      'Probar una consulta de forma convincente',
      'Documentar con una plantilla clara'
    ],
    body: `
${h.label('① Método')}
<h2>Seis pasos para cada consulta</h2>
${h.figure(flow)}
${h.cheat(['Paso', 'Preguntas que debes poder responder'], [
  ['1 · Leer', '¿Qué devuelve exactamente la consulta: una lista, un número, un ranking, varias listas? ¿Qué campos de salida? ¿Hay un «top N»? ¿Qué técnica encaja mejor (find, pipeline, MapReduce)?'],
  ['2 · Explorar', '¿Qué campos intervienen? ¿Existen siempre? ¿Tienen siempre el mismo tipo? (Recetas de la lección 01.)'],
  ['3 · Diseñar', '¿Qué representa cada documento en cada etapa (factura, visualización, película, cliente)? ¿Hay que desplegar arrays? ¿Agrupar? ¿Deduplicar?'],
  ['4 · Construir', 'Una etapa cada vez, mirando la salida con <code>$limit</code>; contando documentos entre etapas.'],
  ['5 · Probar', '¿Da lo mismo por otro camino? ¿Cuadra con un documento revisado a mano? ¿Qué pasa con los casos límite?'],
  ['6 · Documentar', 'Plantilla de abajo.']
])}

${h.label('② Granularidad')}
<h2>La pregunta que evita la mitad de los errores</h2>
<p>«¿Qué es una fila?» cambia a lo largo del pipeline. En este dataset hay varias respuestas posibles:</p>
${h.cheat(['Entidad', 'Cómo se obtiene', 'Trampa habitual'], [
  ['Factura', 'la collection tal cual', 'contar facturas no es contar clientes (hay una por mes)'],
  ['Visualización', '<code>$unwind</code> de <code>Movies</code> o <code>Series</code>', 'las facturas sin el array desaparecen'],
  ['Película (catálogo)', '<code>$unwind</code> + <code>$group</code> por título', 'sin deduplicar, las medias se ponderan por visualizaciones']
])}

${h.label('③ Probar')}
<h2>Cómo demostrar que una consulta está bien</h2>
<ul>
  <li><b>Comprobación cruzada</b>: el mismo número calculado por dos caminos (<code>countDocuments</code> frente a <code>$count</code>; MapReduce frente a pipeline).</li>
  <li><b>Verificación manual</b>: elige un <code>_id</code> del resultado, ábrelo con <code>findOne</code> y comprueba a mano que cumple las condiciones.</li>
  <li><b>Contraejemplos</b>: busca documentos que <i>no</i> deberían salir y confirma que no salen.</li>
  <li><b>Recuentos por etapa</b>: <code>{ $count: "n" }</code> tras cada etapa clave; anota las cifras.</li>
  <li><b>Casos límite</b>: documentos sin el campo, arrays vacíos, empates en el ranking, valores 0.</li>
</ul>
${h.callout('tip', 'Rendimiento', '<p>Si quieres comentar la eficiencia: <code>db.coleccion.find(…).explain("executionStats")</code> o <code>db.coleccion.explain("executionStats").aggregate([…])</code> muestran cuántos documentos se examinaron y si se usó algún índice.</p>')}

${h.label('④ Documentar')}
<h2>Plantilla para documentar una consulta</h2>
${h.code(plantilla, 'markdown')}
`,
    lab: {
      id: 'l12', title: 'Lab 12 · Probar como un profesional', minutes: 20,
      done: '¡Has terminado el temario! Pon a prueba todo en las misiones, que simulan peticiones reales de un equipo.',
      steps: [
        { kind: 'quiz', title: 'Granularidad', q: 'Te piden «número medio de películas que ve un cliente al mes». ¿Qué representa cada documento en el cálculo final de la media?', options: ['Una visualización', 'Una factura (cliente × mes), incluidas las que no tienen películas', 'Una película del catálogo', 'Un país'], answer: 1, why: 'La media es «por cliente y mes», es decir, por factura. Y las facturas sin películas cuentan como 0: si despliegas sin <code>preserveNullAndEmptyArrays</code> (o sin <code>$ifNull</code>), las pierdes y la media sube.' },
        { kind: 'task', title: 'Comprobación cruzada', body: '<p>Sabemos contar con <code>find()</code> las facturas de <b>España</b> con al menos una película:</p>' + h.code('db.__COL__.countDocuments({ "contract.country": "Spain", "Movies.0": { $exists: true } })') + '<p>Obtén el <b>mismo número</b> con un pipeline que use <code>$unwind</code> de <code>Movies</code>. Resultado: <code>{ facturas: N }</code>.</p>', hints: ['Tras <code>$unwind</code> cada factura aparece una vez por película: no puedes contar directamente.', 'Vuelve a nivel de factura agrupando por <code>"$_id"</code>.', '<code>$match</code> → <code>$unwind</code> → <code>$group: { _id: "$_id" }</code> → <code>$count</code>.'], solution: 'db.__COL__.aggregate([\n  { $match: { "contract.country": "Spain" } },\n  { $unwind: "$Movies" },\n  { $group: { _id: "$_id" } },\n  { $count: "facturas" }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { "contract.country": "Spain", "Movies.0": { $exists: true } } }, { $count: "facturas" }])', mode: 'docs' }, success: 'Dos caminos distintos, el mismo número: eso es una prueba sólida para tu verificación.' },
        { kind: 'quiz', title: 'Contar después de desplegar', q: 'Si en el paso anterior te saltas el <code>$group</code> y cuentas justo después de <code>$unwind</code>, ¿qué obtienes?', options: ['El mismo número', 'El número de visualizaciones de películas de España, no de facturas', 'Error', 'El número de facturas sin películas'], answer: 1, why: 'Cada documento tras <code>$unwind</code> es una visualización. Cambiar de granularidad sin darte cuenta es el error más común.' },
        { kind: 'task', title: 'Verificación manual', body: '<p>Elige un documento y compruébalo a mano. Para la <b>primera factura</b> de la collection (su <code>_id</code> es <code>db.__COL__.findOne()._id</code>), calcula con un pipeline cuántas películas y cuántos episodios se vieron: <code>{ _id, peliculas, episodios }</code>. Después, ábrela con <code>findOne</code> y cuenta tú.</p>', hints: ['<code>$match</code> por <code>_id</code>.', '<code>$size</code> con <code>$ifNull</code> (lección 09).'], solution: 'db.__COL__.aggregate([\n  { $match: { _id: db.__COL__.findOne()._id } },\n  { $project: {\n      peliculas: { $size: { $ifNull: ["$Movies", []] } },\n      episodios: { $size: { $ifNull: ["$Series", []] } }\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $match: { _id: db.__COL__.findOne()._id } }, { $project: { peliculas: { $size: { $ifNull: ["$Movies", []] } }, episodios: { $size: { $ifNull: ["$Series", []] } } } }])', mode: 'docs' } },
        { kind: 'quiz', title: 'Qué es una buena verificación', q: '¿Qué verificación es más convincente?', options: ['«La consulta funciona.»', 'Una captura con el resultado', 'El resultado, los recuentos por etapa, una comprobación cruzada por otro método y un documento verificado a mano', 'El tiempo de ejecución'], answer: 2, why: 'Una verificación debe convencer a quien la lee de que el resultado es correcto, no solo de que la consulta se ejecuta.' },
        { kind: 'quiz', title: 'Alternativas de diseño', q: 'Quieres presentar una «alternativa de diseño». ¿Cuál es válida y útil?', options: ['Cambiar los nombres de las variables', 'Resolver lo mismo con otra técnica (p. ej. pipeline frente a MapReduce, o <code>$facet</code> frente a dos consultas) y comparar resultados y ventajas', 'Añadir más etapas sin cambiar el resultado', 'Ejecutar la consulta dos veces'], answer: 1, why: 'Una alternativa real cambia el enfoque. Si además compruebas que da el mismo resultado, sirve también como prueba.' }
      ]
    }
  };
};
