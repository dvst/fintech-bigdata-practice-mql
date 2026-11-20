// Lección 11 · MapReduce
export default (h) => {
  const mini = h.data.mini.map((d) => {
    const x = { _id: d._id, TOTAL: d.TOTAL, contract: { product: { type: d.contract.product.type } } };
    if (d.Movies) x.Movies = d.Movies.map((m) => ({ Title: m.Title, Genres: m.Genres }));
    return x;
  });
  return {
    viz: true,
    lead: 'MapReduce es el modelo clásico de procesamiento distribuido: una función <b>map</b> emite pares <i>clave → valor</i> y una función <b>reduce</b> combina los valores de cada clave. En MongoDB está obsoleto desde la versión 5.0 (se recomienda el pipeline), pero sigue funcionando y conviene conocerlo: aparece en muchos sistemas heredados y es la base del procesamiento distribuido.',
    objectives: [
      'Entender las fases map → shuffle → reduce → finalize',
      'Escribir <code>map</code>, <code>reduce</code> y <code>finalize</code> correctos',
      'Respetar las reglas de reduce (y por qué las medias van en finalize)',
      'Usar <code>query</code>, <code>out</code> y traducir a aggregation'
    ],
    body: `
${h.label('① Concepto')}
<h2>Emitir, agrupar, reducir</h2>
<p>Ejemplo 1: contar visualizaciones por género. Cada factura emite un par por cada género de cada película vista (o ninguno, si no vio películas):</p>
${h.viz('mr', {
  docs: mini,
  map: 'function () {\n  (this.Movies || []).forEach(function (m) {\n    m.Genres.forEach(function (g) { emit(g, 1); });\n  });\n}',
  reduce: 'function (key, values) {\n  return values.reduce(function (a, b) { return a + b; }, 0);\n}'
}, 'Las 8 facturas de ejemplo (géneros simplificados). Pulsa las fases.')}
<p>Ejemplo 2: importe medio por tipo de producto. Para poder hacer la media al final, el valor emitido lleva la suma <b>y</b> el recuento:</p>
${h.viz('mr', {
  docs: mini,
  map: 'function () {\n  emit(this.contract.product.type, { total: this.TOTAL, n: 1 });\n}',
  reduce: 'function (key, values) {\n  var r = { total: 0, n: 0 };\n  values.forEach(function (v) { r.total += v.total; r.n += v.n; });\n  return r;\n}',
  finalize: 'function (key, v) {\n  v.total = Math.round(v.total * 100) / 100;\n  v.media = Math.round(v.total / v.n * 100) / 100;\n  return v;\n}'
})}

${h.label('② Sintaxis')}
<h2>db.collection.mapReduce()</h2>
${h.code(`db.__COL__.mapReduce(
  function () { emit(this.billing, this.TOTAL); },             // map: "this" es el documento
  function (key, values) { return Array.sum(values); },        // reduce
  {
    query:  { "contract.country": "Spain" },                   // opcional: filtra la entrada
    out:    { inline: 1 }                                       // resultado en pantalla
    // finalize: function (key, value) { … },  sort: {…},  limit: N,  scope: { … }
  }
)`)}
${h.cheat(['Opción <code>out</code>', 'Resultado'], [
  ['<code>{ inline: 1 }</code>', 'devuelve <code>{ results: [ { _id: clave, value: … } ], ok: 1 }</code>'],
  ['<code>"nombre"</code> o <code>{ replace: "nombre" }</code>', 'escribe (sustituyendo) en una collection de la database actual'],
  ['<code>{ merge: "nombre" }</code> · <code>{ reduce: "nombre" }</code>', 'combina con lo que ya hubiera en esa collection'],
  ['<code>{ replace: "nombre", db: "otra" }</code>', 'escribe en otra database']
])}
${h.callout('warn', 'En este laboratorio', '<p>Para proteger tus datos, la terminal del tutorial solo permite <code>out: { inline: 1 }</code> o escribir en la database de prácticas: <code>out: { replace: "nombre", db: "__SANDBOX__" }</code>. En tu mongosh normal puedes usar cualquier opción.</p>')}
${h.callout('err', 'No uses funciones flecha en map', '<p>En <code>() =&gt; emit(this.billing, 1)</code>, <code>this</code> no es el documento. Usa siempre <code>function () { … }</code> en <code>map</code>. Dentro de <code>forEach</code> sí puedes usar flechas, porque ahí no necesitas <code>this</code>.</p>')}

${h.label('③ Reglas de reduce')}
<h2>Por qué la media no va en reduce</h2>
<p>MongoDB puede llamar a <code>reduce</code> <b>varias veces</b> para la misma clave (con resultados parciales de llamadas anteriores mezclados con valores nuevos) y <b>no la llama</b> cuando una clave tiene un solo valor. Por eso <code>reduce</code> debe cumplir:</p>
${h.cheat(['Regla', 'Significa'], [
  ['Mismo tipo', 'devuelve un valor con la <b>misma forma</b> que los que emite <code>map</code>'],
  ['Asociativa y conmutativa', 'el orden de los valores y cómo se agrupen no cambia el resultado'],
  ['Idempotente', '<code>reduce(k, [reduce(k, vs)])</code> = <code>reduce(k, vs)</code>']
])}
${h.code(`// ✗ MAL: la media de medias no es la media, y con un solo valor ni se ejecuta
function (k, vs) { return Array.avg(vs); }

// ✓ BIEN: reduce acumula suma y recuento; finalize divide al final
map      = function ()      { emit(this.billing, { total: this.TOTAL, n: 1 }); }
reduce   = function (k, vs) { var r = { total: 0, n: 0 };
                              vs.forEach(function (v) { r.total += v.total; r.n += v.n; });
                              return r; }
finalize = function (k, v)  { v.media = v.total / v.n; return v; }`)}
${h.quiz({ id: 'l11-q1', q: 'map emite <code>emit(clave, 1)</code> y reduce devuelve <code>{ n: Array.sum(values) }</code>. ¿Qué falla?', options: ['Nada', 'reduce devuelve un objeto pero map emite números: en una segunda llamada, Array.sum recibiría objetos', 'Array.sum no existe', 'Hay que usar finalize'], answer: 1, why: 'Si reduce se vuelve a llamar con su propio resultado mezclado con valores emitidos, los tipos no encajan. Emite y devuelve siempre la misma forma.' })}

${h.label('④ Patrones')}
<h2>Cosas que conviene saber</h2>
<ul>
  <li><b>Recorrer arrays en map</b>: <code>(this.Movies || []).forEach(function (m) { emit(…); })</code>. El <code>|| []</code> evita el error en documentos sin array.</li>
  <li><b>Claves compuestas</b>: <code>emit({ pais: this.contract.country, mes: this.billing }, …)</code>.</li>
  <li><b>Clave ausente</b>: si emites <code>undefined</code>, se agrupa como <code>null</code>. Decide si quieres excluirla (con un <code>if</code> en map).</li>
  <li><b>Varias métricas a la vez</b>: emite un objeto con un campo por métrica y súmalos todos en reduce.</li>
  <li><b><code>query</code></b> filtra antes de map (más eficiente que un <code>if</code> dentro de map).</li>
  <li><b><code>scope</code></b> pasa variables a las funciones: <code>scope: { umbral: 50 }</code>.</li>
</ul>

${h.label('⑤ Alternativa')}
<h2>El equivalente en aggregation</h2>
${h.cheat(['MapReduce', 'Aggregation pipeline'], [
  ['<code>query</code>', '<code>$match</code>'],
  ['recorrer un array en map', '<code>$unwind</code>'],
  ['<code>emit(clave, valor)</code> + <code>reduce</code>', '<code>$group: { _id: clave, x: { $sum: … } }</code>'],
  ['<code>finalize</code>', '<code>$project</code> / <code>$set</code> tras <code>$group</code>'],
  ['<code>out</code>', '<code>$out</code> / <code>$merge</code>'],
  ['JavaScript arbitrario', '<code>$function</code> / <code>$accumulator</code> (si no hay otra forma)']
])}
${h.callout('exam', 'Dos estrategias, una prueba', '<p>Resolver lo mismo con MapReduce y con un pipeline, y <b>comprobar que ambos dan lo mismo</b>, es a la vez una alternativa de diseño y una prueba excelente.</p>')}

${h.label('⑥ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Pieza', 'Plantilla'], [
  ['map', '<code>function () { emit(clave, valor); }</code> (usa <code>this</code>)'],
  ['reduce', '<code>function (k, values) { … return valorMismaForma; }</code>'],
  ['finalize', '<code>function (k, v) { … return vFinal; }</code>'],
  ['contar', 'emite <code>1</code>, reduce con <code>Array.sum(values)</code>'],
  ['media', 'emite <code>{ total, n }</code>, reduce suma ambos, finalize divide'],
  ['ver resultado', '<code>{ out: { inline: 1 } }</code>']
])}
`,
    lab: {
      id: 'l11', title: 'Lab 11 · MapReduce', minutes: 40,
      done: 'Has completado todas las técnicas del temario. La lección 12 te ayuda a plantear, probar y documentar tus consultas.',
      steps: [
        { kind: 'task', title: 'Contar con MapReduce', body: '<p>Con <code>mapReduce</code>, cuenta las <b>facturas por mes</b> (<code>billing</code>). Resultado en pantalla (<code>inline</code>).</p>', hints: ['map: <code>emit(this.billing, 1)</code>.', 'reduce: suma los valores, por ejemplo con <code>Array.sum(values)</code>.', 'Opciones: <code>{ out: { inline: 1 } }</code>.'], solution: 'db.__COL__.mapReduce(\n  function () { emit(this.billing, 1); },\n  function (key, values) { return Array.sum(values); },\n  { out: { inline: 1 } }\n)', check: { type: 'query', ref: 'db.__COL__.mapReduce(function () { emit(this.billing, 1); }, function (key, values) { return Array.sum(values); }, { out: { inline: 1 } })', mode: 'docs' } },
        { kind: 'task', title: 'Varias métricas y una media', body: '<p>Para cada <b>tipo de producto</b> (<code>contract.product.type</code>), calcula con MapReduce: <code>total</code> (suma de <code>TOTAL</code>), <code>n</code> (número de facturas) y, en <code>finalize</code>, <code>media</code> (total / n, sin redondear). El <code>value</code> de cada resultado debe ser <code>{ total, n, media }</code>.</p>', hints: ['Emite un objeto: <code>{ total: this.TOTAL, n: 1 }</code>.', 'reduce suma <code>total</code> y <code>n</code> de todos los valores y devuelve un objeto con la misma forma.', 'finalize: <code>v.media = v.total / v.n; return v;</code>'], solution: 'db.__COL__.mapReduce(\n  function () { emit(this.contract.product.type, { total: this.TOTAL, n: 1 }); },\n  function (key, values) {\n    var r = { total: 0, n: 0 };\n    values.forEach(function (v) { r.total += v.total; r.n += v.n; });\n    return r;\n  },\n  { out: { inline: 1 }, finalize: function (key, v) { v.media = v.total / v.n; return v; } }\n)', check: { type: 'query', ref: 'db.__COL__.mapReduce(function () { emit(this.contract.product.type, { total: this.TOTAL, n: 1 }); }, function (key, values) { var r = { total: 0, n: 0 }; values.forEach(function (v) { r.total += v.total; r.n += v.n; }); return r; }, { out: { inline: 1 }, finalize: function (key, v) { v.media = v.total / v.n; return v; } })', mode: 'docs' } },
        { kind: 'task', title: 'Recorrer un array en map', body: '<p>Cuenta las <b>visualizaciones de películas por idioma</b> (<code>Movies.Details.Language</code>) con MapReduce.</p>', hints: ['En map recorre <code>this.Movies</code> y emite una vez por película.', 'Protégete de las facturas sin películas: <code>(this.Movies || [])</code>.', '<code>emit(m.Details.Language, 1)</code> dentro del <code>forEach</code>.'], solution: 'db.__COL__.mapReduce(\n  function () {\n    (this.Movies || []).forEach(function (m) { emit(m.Details.Language, 1); });\n  },\n  function (key, values) { return Array.sum(values); },\n  { out: { inline: 1 } }\n)', check: { type: 'query', ref: 'db.__COL__.mapReduce(function () { (this.Movies || []).forEach(function (m) { emit(m.Details.Language, 1); }); }, function (key, values) { return Array.sum(values); }, { out: { inline: 1 } })', mode: 'docs' }, success: '¿Ves una clave <code>null</code>? Son películas sin idioma: al emitir <code>undefined</code>, MongoDB las agrupa como <code>null</code>.' },
        { kind: 'task', title: 'Filtrar la entrada', body: '<p>Repite el recuento por idioma pero <b>solo para facturas de España</b>, usando la opción <code>query</code> (no un <code>if</code> dentro de map).</p>', hints: ['La opción <code>query</code> admite cualquier filtro de <code>find()</code>.', '<code>{ query: { "contract.country": "Spain" }, out: { inline: 1 } }</code>'], solution: 'db.__COL__.mapReduce(\n  function () {\n    (this.Movies || []).forEach(function (m) { emit(m.Details.Language, 1); });\n  },\n  function (key, values) { return Array.sum(values); },\n  { query: { "contract.country": "Spain" }, out: { inline: 1 } }\n)', check: { type: 'query', ref: 'db.__COL__.mapReduce(function () { (this.Movies || []).forEach(function (m) { emit(m.Details.Language, 1); }); }, function (key, values) { return Array.sum(values); }, { query: { "contract.country": "Spain" }, out: { inline: 1 } })', mode: 'docs' } },
        { kind: 'task', title: 'Guardar el resultado', body: '<p>Repite el <b>primer</b> MapReduce de este lab (facturas por mes), pero guardando el resultado en la collection <code>facturas_por_mes</code> de la database de prácticas <code>__SANDBOX__</code>.</p>', hints: ['Cambia <code>out</code>.', '<code>out: { replace: "facturas_por_mes", db: "__SANDBOX__" }</code>', 'Después puedes consultarla: <code>db.getSiblingDB("__SANDBOX__").facturas_por_mes.find()</code>.'], solution: 'db.__COL__.mapReduce(\n  function () { emit(this.billing, 1); },\n  function (key, values) { return Array.sum(values); },\n  { out: { replace: "facturas_por_mes", db: "__SANDBOX__" } }\n)', check: { type: 'query', ref: 'db.__COL__.mapReduce(function () { emit(this.billing, 1); }, function (key, values) { return Array.sum(values); }, { out: { inline: 1 } })', mode: 'docs' }, success: 'La validación ha leído la collection que has creado y la ha comparado con el resultado esperado.' },
        { kind: 'quiz', title: 'Medias en reduce', q: 'Un compañero calcula la media de <code>TOTAL</code> por país así: map emite <code>this.TOTAL</code> y reduce devuelve <code>Array.avg(values)</code>. ¿Es correcto?', options: ['Sí', 'No: si reduce se llama por partes, hace medias de medias con pesos incorrectos', 'No: Array.avg no existe', 'Sí, pero es lento'], answer: 1, why: 'Reduce debe poder aplicarse sobre resultados parciales. La forma correcta es acumular suma y recuento en reduce y dividir en finalize.' },
        { kind: 'quiz', title: 'this en map', q: '¿Qué pasa con <code>mapReduce(() =&gt; emit(this.billing, 1), …)</code>?', options: ['Funciona igual', '<code>this</code> no es el documento dentro de una función flecha: la clave sale vacía o da error', 'Las flechas son más rápidas', 'Da error de sintaxis'], answer: 1, why: 'Las funciones flecha no tienen su propio <code>this</code>. Usa <code>function () { … }</code> para map.' }
      ]
    }
  };
};
