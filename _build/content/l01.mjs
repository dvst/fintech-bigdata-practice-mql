// Lección 01 · Modelo de documentos
export default (h) => ({
  viz: true,
  lead: 'Un documento de MongoDB no es una fila: es un <b>árbol</b>. Aquí aprendes a leerlo, a nombrar cualquier rama con <b>notación de puntos</b> y a descubrir que no todas las facturas tienen la misma forma, la trampa número uno de este dataset.',
  objectives: [
    'Leer un documento con subdocumentos y arrays',
    'Escribir la ruta de cualquier campo con notación de puntos',
    'Reconocer los tipos BSON del dataset',
    'Detectar campos ausentes y tipos que cambian entre documentos'
  ],
  body: `
${h.label('① Concepto')}
<h2>Un documento es un árbol</h2>
<p>Este es un documento <b>inventado</b> con la misma estructura que las facturas del dataset. <b>Pulsa cualquier campo</b>: verás la ruta con la que se consulta, su tipo y un ejemplo de <code>find()</code>.</p>
${h.viz('doctree', { doc: h.data.sampleDoc }, 'Despliega <code>Movies</code> → un elemento → <code>Details</code> → <code>Cast</code> → <code>Stars</code>: hay arrays dentro de subdocumentos dentro de arrays.')}

<h3>Tres tipos de «caja»</h3>
${h.cheat(['Estructura', 'En el dataset', 'Cómo se alcanza'], [
  ['Valor simple', '<code>"TOTAL": 16.65</code>, <code>"billing": "January 2025"</code>', 'Por su nombre: <code>"TOTAL"</code>'],
  ['Subdocumento (<i>object</i>)', '<code>Client</code>, <code>contract</code>, <code>contract.product</code>', 'Uniendo nombres con puntos: <code>"contract.product.type"</code>'],
  ['Array', '<code>Movies</code>, <code>Series</code>, <code>Genres</code>, <code>Stars</code>', 'Igual que un subdocumento: <code>"Movies.Title"</code> mira el <code>Title</code> de <b>todos</b> los elementos']
])}
${h.callout('tip', 'La regla de las comillas', '<p>Una ruta con puntos <b>siempre</b> va entre comillas: <code>{ "Client.Name": "Elena" }</code>. Y en este dataset muchos campos tienen espacios (<code>"Viewing PCT"</code>, <code>"monthly fee"</code>, <code>"customer code"</code>), así que las comillas son obligatorias también por eso.</p>')}

${h.label('② Tipos')}
<h2>Tipos BSON que vas a encontrar</h2>
<p>MongoDB guarda los documentos en <b>BSON</b> (JSON binario con más tipos). Lo que importa para consultar:</p>
${h.cheat(['Tipo BSON', 'Ejemplo en el dataset', 'Ojo con…'], [
  ['<code>string</code>', '<code>"Title": "The Paper Moon"</code>', 'Las comparaciones son alfabéticas y distinguen mayúsculas.'],
  ['<code>int</code> / <code>long</code> / <code>double</code>', '<code>"Phone": 555010001</code>, <code>"TOTAL": 16.65</code>', 'Todos son «números»: <code>$gt</code> compara bien entre ellos. Algunos <code>TOTAL</code> son <code>int</code> (p. ej. <code>605</code>) y otros <code>double</code>.'],
  ['<code>object</code>', '<code>"Client": { … }</code>', 'Un subdocumento. Se entra con <code>.</code>'],
  ['<code>array</code>', '<code>"Genres": ["Action", "Horror"]</code>', 'Las condiciones se aplican a cada elemento (lección 04).'],
  ['<i>missing</i>', 'Facturas sin <code>Movies</code>', 'No es un tipo: el campo <b>no existe</b>. No es lo mismo que <code>null</code>.']
])}
${h.callout('warn', 'Las fechas son texto', '<p><code>"Date": "15/01/2016"</code> o <code>"start date": "27/11/14"</code> son <b>strings</b>, no fechas BSON. Si las comparas con <code>$gt</code> se comparan como texto, carácter a carácter: <code>"15/01/2016" &gt; "01/02/2016"</code> es <b>verdadero</b> aunque enero vaya antes que febrero. Para operar con fechas de verdad hay que convertirlas (lo verás en agregación).</p>')}
${h.quiz({ id: 'l01-q1', q: '¿Qué es <code>Movies.Details.Genres</code> en este dataset?', options: ['Un string con los géneros separados por comas', 'Un array de strings, dentro de un subdocumento, dentro de cada elemento del array <code>Movies</code>', 'Un subdocumento con un campo por género', 'Un número que codifica el género'], answer: 1, why: '<code>Movies</code> es un array; cada película tiene un subdocumento <code>Details</code>; dentro, <code>Genres</code> es un array de strings. Con la ruta <code>"Movies.Details.Genres"</code> MongoDB recorre todos esos niveles a la vez.' })}

${h.label('③ Esquema flexible')}
<h2>No todas las facturas tienen la misma forma</h2>
<p>Una collection <b>no impone esquema</b>: cada documento lleva los campos que tenga. En este dataset pasa, por ejemplo, que:</p>
<ul>
  <li>muchas facturas <b>no tienen</b> <code>Movies</code> o <code>Series</code> (ese mes el cliente no vio nada de eso);</li>
  <li>algunos clientes <b>no tienen</b> <code>Phone</code>, y algunos contratos no tienen <code>end date</code>;</li>
  <li>dentro de <code>Movies</code>, a algunas películas les falta <code>License</code>, <code>Budget</code> o <code>Gross</code>;</li>
  <li>un mismo campo puede tener <b>tipos distintos</b> en documentos distintos. Por eso conviene inventariar tipos antes de consultar.</li>
</ul>
<p>Esta receta (es agregación, la entenderás en la lección 07; de momento cópiala) cuenta cuántos documentos tienen cada tipo en un campo:</p>
${h.code(`db.__COL__.aggregate([
  { $group: { _id: { $type: "$Client.Phone" }, n: { $sum: 1 } } }
])`)}
${h.code(`[ { _id: 'missing', n: 5426 }, { _id: 'int', n: 48719 } ]`, 'text')}
${h.callout('exam', 'Por qué importa', '<p>Una consulta que funciona con los 3 primeros documentos puede fallar o dar resultados incompletos con el resto. Antes de escribir una consulta, <b>inventaría los campos que vas a usar</b>: ¿existen siempre?, ¿tienen siempre el mismo tipo? Y deja escrito lo que hayas encontrado.</p>')}
${h.quiz({ id: 'l01-q2', q: 'Una factura no tiene el campo <code>Series</code>. ¿Qué valor tiene <code>Series</code> en ese documento?', options: ['<code>null</code>', '<code>[]</code> (array vacío)', 'Ninguno: el campo no existe (<i>missing</i>)', '<code>0</code>'], answer: 2, why: 'No existir no es lo mismo que valer <code>null</code> o <code>[]</code>. En la lección 03 verás cómo distinguir los tres casos con <code>$exists</code> y <code>$type</code>.' })}

${h.label('④ Explorar')}
<h2>Herramientas para conocer los datos</h2>
${h.cheat(['Comando', 'Para qué'], [
  ['<code>db.__COL__.findOne()</code>', 'Ver un documento completo.'],
  ['<code>db.__COL__.findOne({ _id: "…" })</code>', 'Ver un documento concreto.'],
  ['<code>db.__COL__.distinct("contract.country")</code>', 'Valores distintos de un campo (también dentro de arrays).'],
  ['<code>db.__COL__.countDocuments({ Movies: { $exists: false } })</code>', 'Cuántos documentos <b>no</b> tienen un campo.'],
  ['<code>Object.keys(db.__COL__.findOne())</code>', 'Nombres de los campos de primer nivel (mongosh es JavaScript).'],
  ['Receta <code>$type</code> de arriba', 'Inventario de tipos de un campo.']
])}
`,
  lab: {
    id: 'l01', title: 'Lab 01 · Radiografía del dataset', minutes: 25,
    done: 'Ya sabes leer y recorrer un documento. En la lección 02 empiezas a filtrar con <code>find()</code>.',
    steps: [
      { kind: 'quiz', title: 'Nombrar una ruta', q: '¿Con qué ruta consultas el título de las películas vistas en una factura?', options: ['<code>Movies[].Title</code>', '<code>"Movies.Title"</code>', '<code>Movies.$.Title</code>', '<code>"Movies/Title"</code>'], answer: 1, why: 'La notación de puntos atraviesa arrays sin índices: <code>"Movies.Title"</code> se refiere al <code>Title</code> de cualquier elemento.' },
      { kind: 'task', title: 'Catálogo de tarifas', body: '<p>Cada contrato tiene un producto (<code>contract.product</code>) con un nombre comercial en <code>Reference</code>. Obtén la <b>lista de nombres de tarifa distintos</b> que existen en la collection.</p>', hints: ['Hay un método de la collection que devuelve los valores distintos de un campo, sin repetir.', 'Es <code>distinct()</code> y recibe la ruta del campo como string.', 'La ruta es <code>"contract.product.Reference"</code>.'], solution: 'db.__COL__.distinct("contract.product.Reference")', check: { type: 'query', ref: 'db.__COL__.distinct("contract.product.Reference")', mode: 'docs' }, success: '¿Te fijas en alguna tarifa con muy pocos clientes?' },
      { kind: 'quiz', title: 'Facturas sin películas', body: '<p>Ejecuta en la terminal:</p>' + h.code('db.__COL__.countDocuments({ Movies: { $exists: false } })'), q: '¿Cuántas facturas no tienen el campo <code>Movies</code>?', live: 'db.__COL__.countDocuments({ Movies: { $exists: false } })', options: ['0', '{{live}}', '54.145', '12'], answer: 1, wrongWhy: { 0: 'Prueba el comando: hay muchas facturas sin películas.', 2: 'Esas son todas las facturas.' }, why: 'Más de una de cada cuatro facturas no tiene <code>Movies</code>. Cualquier consulta sobre películas debe tenerlo en cuenta.' },
      { kind: 'task', title: 'Una factura concreta', body: '<p>Averigua el <code>_id</code> de la <b>primera factura</b> de la collection (<code>db.__COL__.findOne()._id</code>) y recupera esa factura buscando por su <code>_id</code>.</p>', hints: ['Primero consulta el <code>_id</code>: <code>findOne()</code> devuelve un documento y <code>._id</code> te da ese campo.', 'Después busca por el campo <code>_id</code>, que es único: <code>findOne({ _id: … })</code> o <code>find({ _id: … })</code>.', 'Si no quieres copiar el valor a mano, puedes anidar las dos consultas.'], solution: 'db.__COL__.findOne({ _id: db.__COL__.findOne()._id })', check: { type: 'query', ref: 'db.__COL__.find({ _id: db.__COL__.findOne()._id })', mode: 'ids' }, success: 'Compara su estructura con la del documento de la animación de arriba: ¿qué campos tiene esta factura que el ejemplo no muestra?' },
      { kind: 'quiz', title: 'Inventario de tipos', body: '<p>Ejecuta la receta de tipos sobre el teléfono del cliente:</p>' + h.code('db.__COL__.aggregate([\n  { $group: { _id: { $type: "$Client.Phone" }, n: { $sum: 1 } } }\n])'), q: '¿Qué tipos aparecen en <code>Client.Phone</code>?', options: ['Solo <code>int</code>', '<code>int</code> y <i>missing</i>', '<code>string</code> e <code>int</code>', '<code>int</code>, <code>null</code> y <i>missing</i>'], answer: 1, why: 'El teléfono es un número entero cuando existe, y en algunos clientes no existe. Repite la receta con los campos que vayas a usar en cada consulta (prueba con <code>"TOTAL"</code> o <code>"Movies"</code>): es la mejor forma de descubrir sorpresas antes de que te rompan una consulta.' },
      { kind: 'task', title: 'Contratos sin fecha de fin', body: '<p>Cuenta cuántas facturas corresponden a contratos <b>sin</b> fecha de fin (<code>contract.end date</code>).</p>', hints: ['Usa el mismo patrón que en el paso de las películas.', 'Ojo: el nombre del campo tiene un espacio, así que la ruta completa va entre comillas.', 'La ruta es <code>"contract.end date"</code> y la condición <code>{ $exists: false }</code>.'], solution: 'db.__COL__.countDocuments({ "contract.end date": { $exists: false } })', check: { type: 'query', ref: 'db.__COL__.countDocuments({ "contract.end date": { $exists: false } })', mode: 'docs' } }
    ]
  }
});
