// Lección 00 · Servidor, mongoimport y mongosh
export default (h) => {
  const arch = `
<svg viewBox="0 0 800 300" role="img" aria-label="mongoimport carga facturas.json en mongod; mongosh envía consultas y recibe documentos">
  <defs>
    <marker id="a0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--muted)"/></marker>
  </defs>
  <style>
    .s0 { fill: var(--panel2); stroke: var(--line2); stroke-width: 1.5; }
    .t0 { fill: var(--text); font: 600 14px var(--sans); }
    .m0 { fill: var(--muted); font: 12px var(--mono); }
    .k0 { fill: var(--mongo); font: 700 13px var(--mono); }
    .doc0 { fill: var(--panel); stroke: var(--mongo); stroke-width: 1.2; opacity: 0; animation: docIn 6s infinite; }
    @keyframes docIn { 0%, 12% { opacity: 0; transform: translateX(-10px); } 22%, 100% { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .doc0 { animation: none; opacity: 1; } }
  </style>
  <!-- fichero -->
  <path class="s0" d="M28 96h86l22 22v100H28z"/><path d="M114 96v22h22" fill="none" stroke="var(--line2)" stroke-width="1.5"/>
  <text class="k0" x="40" y="146">{ … }</text><text class="k0" x="40" y="166">{ … }</text><text class="k0" x="40" y="186">{ … }</text>
  <text class="t0" x="82" y="244" text-anchor="middle">facturas.json</text>
  <text class="m0" x="82" y="262" text-anchor="middle">objetos JSON seguidos</text>
  <!-- mongoimport -->
  <path id="p-imp" d="M146 158H296" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 5" marker-end="url(#a0)" fill="none"/>
  <text class="k0" x="221" y="146" text-anchor="middle">mongoimport</text>
  <circle r="5" fill="var(--mongo)"><animateMotion dur="1.6s" repeatCount="indefinite" path="M146 158H292"/></circle>
  <circle r="5" fill="var(--mongo)"><animateMotion dur="1.6s" begin=".55s" repeatCount="indefinite" path="M146 158H292"/></circle>
  <!-- servidor -->
  <rect class="s0" x="302" y="22" width="250" height="262" rx="16"/>
  <text class="t0" x="320" y="48">mongod</text><text class="m0" x="540" y="48" text-anchor="end">puerto 27017</text>
  <rect x="318" y="62" width="218" height="208" rx="12" fill="none" stroke="var(--accent)" stroke-width="1.5"/>
  <text class="m0" x="332" y="82" style="fill:var(--accent)">database: __DB__</text>
  <rect x="334" y="94" width="186" height="164" rx="10" fill="none" stroke="var(--violet)" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text class="m0" x="346" y="114" style="fill:var(--violet)">collection: __COL__</text>
  <g><rect class="doc0" x="350" y="126" width="154" height="30" rx="6" style="animation-delay:0s"/><rect class="doc0" x="350" y="164" width="154" height="30" rx="6" style="animation-delay:.5s"/><rect class="doc0" x="350" y="202" width="154" height="30" rx="6" style="animation-delay:1s"/></g>
  <text class="m0" x="362" y="146">{ _id, billing, … }</text><text class="m0" x="362" y="184">{ _id, Client, … }</text><text class="m0" x="362" y="222">{ _id, Movies, … }</text>
  <text class="m0" x="427" y="250" text-anchor="middle">documentos</text>
  <!-- mongosh -->
  <rect x="644" y="92" width="140" height="124" rx="12" fill="var(--term)" stroke="var(--term-line)"/>
  <circle cx="660" cy="106" r="3.5" fill="#ff5f57"/><circle cx="672" cy="106" r="3.5" fill="#febc2e"/><circle cx="684" cy="106" r="3.5" fill="#28c840"/>
  <text x="656" y="134" style="fill:#00ed64;font:700 13px var(--mono)">mongosh</text>
  <text x="656" y="158" style="fill:#e6e8ee;font:11px var(--mono)">&gt; db.__COL__</text>
  <text x="656" y="174" style="fill:#e6e8ee;font:11px var(--mono)">    .find()</text>
  <path d="M638 132H560" stroke="var(--muted)" stroke-width="2" marker-end="url(#a0)" fill="none"/>
  <path d="M560 182H638" stroke="var(--mongo)" stroke-width="2" marker-end="url(#a0)" fill="none"/>
  <text class="m0" x="598" y="122" text-anchor="middle">consulta</text><text class="m0" x="598" y="200" text-anchor="middle">cursor</text>
  <circle r="4" fill="var(--accent)"><animateMotion dur="1.4s" repeatCount="indefinite" path="M638 132H562"/></circle>
  <circle r="4" fill="var(--mongo)"><animateMotion dur="1.4s" begin=".7s" repeatCount="indefinite" path="M562 182H636"/></circle>
</svg>`;

  return {
    lead: 'Antes de escribir una sola consulta necesitas tres piezas: el <b>servidor</b> que guarda los datos, el <b>importador</b> que los carga y el <b>cliente</b> desde el que preguntas. Aquí ves cómo encajan y lo compruebas contra tu propia instalación.',
    objectives: [
      'Distinguir <code>mongod</code>, <code>mongosh</code> y <code>mongoimport</code>',
      'Entender la jerarquía server → database → collection → document',
      'Importar un fichero JSON con <code>mongoimport</code>',
      'Moverte por la shell: <code>use</code>, <code>show</code>, <code>find().limit()</code>'
    ],
    body: `
${h.label('① Concepto')}
<h2>Tres programas, un flujo</h2>
${h.figure(arch, '<b>mongoimport</b> lee el fichero y envía cada objeto JSON a <b>mongod</b>, que lo guarda como documento dentro de una <i>collection</i> de una <i>database</i>. Después <b>mongosh</b> envía consultas y recibe un <i>cursor</i> con los documentos que cumplen el filtro.')}
${h.cheat(['Programa', 'Qué es', 'Cuándo lo usas'], [
  ['<code>mongod</code>', 'El <b>servidor</b> (daemon). Guarda los datos en disco y atiende peticiones en el puerto <code>27017</code>.', 'Debe estar arrancado siempre: es el «servidor» o «listener».'],
  ['<code>mongoimport</code>', 'Herramienta de línea de comandos (MongoDB Database Tools). Lee JSON/CSV/TSV e inserta documentos.', 'Una vez, para cargar el fichero de datos. Se ejecuta en la terminal del sistema, <b>no</b> dentro de mongosh.'],
  ['<code>mongosh</code>', 'El <b>cliente</b> interactivo (MongoDB Shell). Un intérprete de JavaScript conectado al servidor.', 'Para todas las consultas: <code>find()</code>, <code>aggregate()</code>, <code>mapReduce()</code>.']
])}

${h.label('② Jerarquía')}
<h2>Server → database → collection → document</h2>
<p>Un servidor contiene varias <b>databases</b>; cada una contiene <b>collections</b>; cada collection contiene <b>documents</b> (objetos tipo JSON, guardados internamente como BSON). Si vienes de SQL, esta tabla te orienta, aunque la analogía no es perfecta:</p>
${h.cheat(['SQL', 'MongoDB', 'Diferencia clave'], [
  ['database', 'database', 'Igual.'],
  ['table', '<b>collection</b>', 'No tiene esquema fijo: cada documento puede tener campos distintos.'],
  ['row', '<b>document</b>', 'Puede contener subdocumentos y arrays (p. ej. <code>Movies</code> es un array de películas).'],
  ['column', '<b>field</b>', 'Se accede a lo anidado con notación de puntos: <code>"Client.Name"</code>.'],
  ['JOIN', 'datos <i>embebidos</i> (o <code>$lookup</code>)', 'En este dataset todo lo de una factura está dentro del mismo documento.']
])}
${h.callout('tip', 'Una factura = un documento', '<p>En tu dataset cada documento es la <b>factura mensual de un cliente</b>: datos del cliente, contrato, y lo que vio ese mes (<code>Movies</code>, <code>Series</code>). Hay 12 meses de 2025, así que un mismo cliente aparece en varios documentos.</p>')}

${h.label('③ Importar')}
<h2>mongoimport</h2>
<p>Se ejecuta en la terminal de tu sistema (zsh/bash), con <code>mongod</code> ya en marcha. Forma general:</p>
${h.code('mongoimport --db <database> --collection <collection> --file <fichero.json>', 'bash')}
${h.cheat(['Opción', 'Significado'], [
  ['<code>--db</code> / <code>-d</code>', 'Base de datos destino. Se crea sola al insertar el primer documento.'],
  ['<code>--collection</code> / <code>-c</code>', 'Collection destino. <b>Si la omites, usa el nombre del fichero</b> sin extensión (<code>facturas.json</code> → <code>facturas</code>).'],
  ['<code>--file</code>', 'Ruta al fichero. Si tiene espacios, entre comillas.'],
  ['<code>--drop</code>', 'Borra la collection antes de importar. Útil si quieres empezar de cero.'],
  ['<code>--jsonArray</code>', 'Solo si el fichero es <b>un único array</b> <code>[ {...}, {...} ]</code>. Un fichero con objetos uno tras otro (lo más habitual en volcados) <b>no</b> lo necesita.'],
  ['<code>--uri</code>', 'Cadena de conexión si el servidor no está en <code>localhost:27017</code>.']
])}
${h.callout('warn', 'Líneas ≠ documentos', '<p>Un volcado JSON «bonito» (pretty-printed) puede tener millones de <b>líneas</b> aunque contenga muchos menos documentos, porque cada documento ocupa decenas de líneas. Lo que importa es cuántos <b>documentos</b> hay, y eso lo cuenta MongoDB: lo verás en el laboratorio.</p>')}
${h.callout('tip', 'Comprueba siempre la carga', '<p>Fíjate en la línea final que imprime <code>mongoimport</code> (<code>N document(s) imported successfully. 0 document(s) failed to import.</code>) y compárala con lo que esperabas: es la prueba de que la carga fue completa.</p>')}
${h.quiz({ id: 'l00-q1', q: 'Ejecutas <code>mongoimport --db tienda --file ventas.json</code> (sin <code>--collection</code>). ¿Dónde quedan los documentos?', options: ['En <code>tienda.documentos</code>', 'En <code>tienda.ventas</code>', 'En <code>test.ventas</code>', 'Da error: <code>--collection</code> es obligatorio'], answer: 1, why: 'Sin <code>--collection</code>, mongoimport usa el nombre del fichero sin extensión. El nombre de la collection lo eliges tú al importar: indícalo siempre para no llevarte sorpresas.' })}

${h.label('④ La shell')}
<h2>Primeros pasos en mongosh</h2>
<p>Al abrir <code>mongosh</code> sin argumentos te conectas a <code>mongodb://127.0.0.1:27017</code> y a la database <code>test</code>. La variable <code>db</code> apunta siempre a la database actual.</p>
${h.code(`show dbs                      // databases del servidor
use __DB__                   // cambia la database actual (db)
show collections              // collections de esa database
db.__COL__.countDocuments()       // cuántos documentos hay
db.__COL__.findOne()              // un documento cualquiera
db.__COL__.find().limit(3).pretty()  // los 3 primeros`)}
${h.callout('tip', '¿Y <code>.pretty()</code>?', '<p>Verás <code>.pretty()</code> en muchos tutoriales porque en la shell antigua (<code>mongo</code>) la salida salía en una sola línea. En <code>mongosh</code> la salida ya viene formateada; <code>.pretty()</code> se sigue aceptando y no hace daño.</p>')}
${h.callout('', 'Cursores y «it»', '<p><code>find()</code> no devuelve un array, sino un <b>cursor</b>: mongosh te enseña los primeros 20 documentos y escribe <code>Type "it" for more</code>. Escribe <code>it</code> para ver los siguientes 20.</p>')}
${h.quiz({ id: 'l00-q2', q: 'Abres mongosh y escribes <code>db.__COL__.countDocuments()</code> sin hacer nada más. Obtienes <code>0</code>. ¿Por qué?', options: ['La importación falló', 'Estás en la database <code>test</code>, no en la que importaste', 'countDocuments() necesita un filtro', 'Hay que escribir <code>.pretty()</code>'], answer: 1, why: 'mongosh arranca en <code>test</code>. Consultar una collection que no existe no da error: devuelve 0 documentos. Primero <code>use __DB__</code>.' })}

${h.label('⑤ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Comando', 'Dónde', 'Qué hace'], [
  ['<code>mongod</code>', 'terminal del sistema', 'Arranca el servidor'],
  ['<code>mongoimport -d DB -c COL --file F</code>', 'terminal del sistema', 'Importa un JSON'],
  ['<code>mongosh</code>', 'terminal del sistema', 'Abre la shell'],
  ['<code>show dbs</code> · <code>use DB</code> · <code>show collections</code>', 'mongosh', 'Navegar'],
  ['<code>db.COL.countDocuments(filtro)</code>', 'mongosh', 'Contar'],
  ['<code>db.COL.find().limit(n)</code> · <code>it</code>', 'mongosh', 'Ver documentos']
])}
`,
    lab: {
      id: 'l00', title: 'Lab 00 · Conoce tu servidor', minutes: 25, startDb: 'test',
      intro: 'La terminal de la derecha es <b>mongosh real</b> conectado a tu MongoDB y, como al abrir mongosh de verdad, arranca en la database <code>test</code>. Completa cada paso para desbloquear el siguiente.',
      done: 'Ya sabes moverte por el servidor y por la shell. En la siguiente lección abrimos un documento por dentro.',
      steps: [
        { kind: 'quiz', title: 'Calentamiento', q: '¿Qué proceso guarda los datos en disco y responde a las consultas?', options: ['mongosh', 'mongod', 'mongoimport', 'mongos'], answer: 1, why: '<code>mongod</code> es el servidor. <code>mongosh</code> es el cliente, <code>mongoimport</code> una herramienta de carga y <code>mongos</code> el enrutador de un clúster con sharding.' },
        { kind: 'quiz', title: 'Tu servidor', body: '<p>En la terminal de la derecha ejecuta:</p>' + h.code('db.version()'), q: '¿Qué versión de MongoDB está corriendo en tu máquina?', live: 'db.version()', options: ['7.0.14', '{{live}}', '6.0.19', '5.0.31'], answer: 1, why: 'Es la versión de <code>mongod</code>. Tu <code>mongosh</code> tiene su propia versión (<code>version()</code> sin <code>db.</code>).' },
        { kind: 'task', title: 'Entra en la database de los datos', body: '<p>Estás en <code>test</code>. Lista las databases del servidor y cámbiate a la que contiene el dataset (<code>__DB__</code>).</p>', hints: ['Para ver las databases: <code>show dbs</code>.', 'Para cambiar de database se usa <code>use</code> seguido del nombre, sin comillas ni paréntesis.'], solution: 'use __DB__', check: { type: 'db', db: '__DB__', label: 'La terminal activa está en la database «__DB__»' }, success: 'Fíjate en que el prompt ha cambiado a <code>__DB__&gt;</code>.' },
        { kind: 'task', title: 'Echa un vistazo a los datos', body: '<p>Comprueba qué collections hay con <code>show collections</code>. Después muestra los <b>3 primeros documentos</b> de <code>__COL__</code>.</p>', hints: ['Sin filtro, <code>find()</code> devuelve todos los documentos de la collection.', 'Para quedarte con los n primeros, encadena <code>.limit(n)</code> al cursor.', 'Puedes añadir <code>.pretty()</code> al final: en mongosh no cambia nada.'], solution: 'db.__COL__.find().limit(3).pretty()', check: { type: 'query', ref: 'db.__COL__.find().limit(3)', mode: 'ids', ordered: true }, success: 'Lee esos documentos con calma: ¿tienen todos los mismos campos?' },
        { kind: 'quiz', title: '¿Cuántos documentos hay?', body: '<p>Cuenta los documentos de la collection:</p>' + h.code('db.__COL__.countDocuments()'), q: '¿Cuántos documentos (facturas) tiene tu collection?', live: 'db.__COL__.countDocuments()', options: ['0', '{{live}}', '12', '1'], answer: 1, wrongWhy: { 0: 'Si te sale 0, ¿estás en la database correcta?', 2: '12 son los meses de facturación, no los documentos.' }, why: 'Cada documento es la factura de un cliente en un mes.' },
        { kind: 'task', optional: true, title: 'Opcional · Importa tú los datos', body: '<p>Importa el mismo fichero JSON que contiene <code>__DB__.__COL__</code> en la database de prácticas, en una collection llamada <code>copia</code>. Abre <b>una terminal de tu sistema</b> (no la del lab), entra en la carpeta del fichero y ejecuta <code>mongoimport</code> hacia <code>__SANDBOX__.copia</code>.</p><p class="muted">Si no tienes el fichero a mano o no quieres hacerlo ahora, pulsa <b>Saltar →</b>.</p>', hints: ['Necesitas tres opciones: database, collection y fichero.', 'La database es <code>__SANDBOX__</code> y la collection <code>copia</code>: <code>--db</code> y <code>--collection</code>.', 'Si lo ejecutas dos veces, añade <code>--drop</code> para empezar de cero.'], solution: 'mongoimport --db __SANDBOX__ --collection copia --file <tu-fichero>.json', explain: '<p>Este comando va en la terminal del <b>sistema</b>, no en mongosh. Después pulsa «Comprobar» en la pestaña Task.</p>', check: { type: 'state', code: 'db.getSiblingDB("__SANDBOX__").copia.estimatedDocumentCount() === db.getSiblingDB("__DB__").__COL__.estimatedDocumentCount()', label: '«__SANDBOX__.copia» existe y tiene los mismos documentos que «__DB__.__COL__»' }, success: 'Ahora <code>use __SANDBOX__</code> + <code>db.copia.find()</code> te muestra tu copia.' },
        { kind: 'quiz', title: 'Repetir una importación', q: 'Vuelves a lanzar el mismo <code>mongoimport</code> sin <code>--drop</code>. ¿Qué pasa?', options: ['Se duplican los documentos: quedan el doble', 'Cada documento falla por <code>_id</code> duplicado (E11000) y la collection queda igual', 'mongoimport borra la collection y la vuelve a crear', 'Error de conexión'], answer: 1, why: 'Los documentos de este dataset traen su propio <code>_id</code> (p. ej. <code>"ES20001/11/1/2025"</code>) y <code>_id</code> es único. Si un documento no trajera <code>_id</code>, MongoDB le asignaría un <code>ObjectId</code> nuevo y sí se duplicaría.' }
      ]
    },
    after: h.callout('', '¿Qué viene ahora?', '<p>En la <b>lección 01</b> abrimos un documento por dentro: subdocumentos, arrays y por qué no todas las facturas tienen la misma forma.</p>')
  };
};
