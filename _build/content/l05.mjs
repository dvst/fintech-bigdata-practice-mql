// Lección 05 · Expresiones regulares
export default (h) => {
  const seg = (x, w, txt, label, color) => `
    <rect x="${x}" y="30" width="${w}" height="40" rx="7" fill="${color}" fill-opacity=".14" stroke="${color}"/>
    <text x="${x + w / 2}" y="56" text-anchor="middle" style="font:700 16px var(--mono);fill:${color}">${txt}</text>
    <text x="${x + w / 2}" y="92" text-anchor="middle" style="font:11.5px var(--sans);fill:var(--muted)">${label}</text>`;
  const anatomy = `
<svg viewBox="0 0 760 140" role="img" aria-label="Anatomía de la expresión regular del código de cliente">
  ${seg(10, 44, '^', 'inicio', 'var(--violet)')}
  ${seg(62, 86, '\\d{2}', '2 dígitos', 'var(--accent)')}
  ${seg(156, 50, '\\/', '«/»', 'var(--warn)')}
  ${seg(214, 100, '\\d{8}', '8 dígitos', 'var(--accent)')}
  ${seg(322, 50, '\\/', '«/»', 'var(--warn)')}
  ${seg(380, 86, '\\d{2}', '2 dígitos', 'var(--accent)')}
  ${seg(474, 44, 'T', 'letra T', 'var(--ok)')}
  ${seg(526, 44, '$', 'fin', 'var(--violet)')}
  <text x="590" y="48" style="font:600 13px var(--mono);fill:var(--text)">"21/10203040/05T" ✓</text>
  <text x="590" y="70" style="font:600 13px var(--mono);fill:var(--muted)">"21/1020304/05T" ✕</text>
  <text x="10" y="126" style="font:12px var(--sans);fill:var(--text2)">Formato de Client."customer code". Las barras se escapan (\\/) porque en un literal /…/ la barra cerraría la expresión.</text>
</svg>`;
  return {
    viz: true,
    lead: 'Cuando la condición no es «igual a» sino «<b>tiene esta forma</b>» (empieza por, termina en, contiene, sigue un formato) necesitas expresiones regulares. Es una de las herramientas más útiles para validar datos.',
    objectives: [
      'Usar <code>$regex</code> y los literales <code>/…/</code> en <code>find()</code>',
      'Anclar patrones con <code>^</code> y <code>$</code>',
      'Describir formatos con clases y cuantificadores',
      'Validar datos contando lo que cumple y lo que no'
    ],
    body: `
${h.label('① Concepto')}
<h2>Un patrón describe una forma</h2>
${h.figure(anatomy)}
<p>Pruébalo con valores de ejemplo inventados (algunos incumplen el formato a propósito, para que veas fallos). Edita el patrón o pulsa los ejemplos:</p>
${h.viz('regex', {
  pattern: '^The ', flags: '',
  samples: ['The 7 Lanterns', 'The Lantern Keeper', 'Star Harbor: Episode II', 'Sisterly Love', '10 Gloveworth Lane', '404', '24/7', 'Amberfall', 'Oakwood', 'Ashwood', 'Redtown on Duero', '21/10203040/05T', '47/55667788/12T', '21/1020304/05T', '47-55667788-12T'],
  presets: [
    { label: 'empieza por', pattern: '^The ', note: '<code>^</code> ancla al principio. Sin el espacio también valdría «Theory».' },
    { label: 'termina en', pattern: 'wood$', note: '<code>$</code> ancla al final.' },
    { label: 'contiene', pattern: 'love', flags: 'i', note: '¡«10 Gloveworth Lane» coincide! <code>love</code> está dentro de «Gloveworth». Sin anclas, el patrón puede aparecer en cualquier parte.' },
    { label: 'palabra completa', pattern: '\\blove\\b', flags: 'i', note: '<code>\\b</code> es un límite de palabra: ahora solo «Sisterly Love».' },
    { label: 'solo dígitos', pattern: '^\\d+$', note: 'De principio a fin, uno o más dígitos.' },
    { label: 'formato', pattern: '^\\d{2}\\/\\d{8}\\/\\d{2}T$', note: 'El formato completo del código de cliente.' },
    { label: 'alternativa', pattern: '^(The|Star) ', note: '<code>|</code> = o; los paréntesis agrupan.' }
  ]
}, 'El probador usa el motor de JavaScript; MongoDB usa PCRE. Para todo lo de esta lección se comportan igual.')}

${h.label('② Sintaxis')}
<h2>Dos formas de escribirlo en MongoDB</h2>
${h.code(`// 1) literal de JavaScript (lo más cómodo en mongosh)
db.__COL__.find({ "Movies.Title": /^Star Wars/ })
db.__COL__.find({ "Movies.Title": /star wars/i })          // i = sin distinguir mayúsculas

// 2) operador $regex con un string
db.__COL__.find({ "Movies.Title": { $regex: "^Star Wars" } })
db.__COL__.find({ "Movies.Title": { $regex: "star wars", $options: "i" } })`)}
${h.callout('err', 'La doble barra invertida', '<p>Dentro de un <b>string</b> la barra invertida se escapa: <code>{ $regex: "\\\\d$" }</code>. Si escribes <code>"\\d$"</code>, JavaScript convierte <code>\\d</code> en una simple <code>d</code> y buscas textos que terminan en la letra d. En los literales <code>/\\d$/</code> no hay que duplicarla.</p>')}

${h.label('③ El lenguaje')}
<h2>Piezas básicas</h2>
${h.cheat(['Pieza', 'Significa', 'Ejemplo'], [
  ['<code>^</code> · <code>$</code>', 'inicio · final del texto', '<code>/^The /</code>, <code>/wood$/</code>'],
  ['<code>.</code>', 'cualquier carácter', '<code>/^S.n/</code> → San, Sin, S3n'],
  ['<code>\\d</code> · <code>\\w</code> · <code>\\s</code>', 'dígito · letra/dígito/_ · espacio', '<code>/\\d{8}/</code>'],
  ['<code>\\D</code> · <code>\\W</code> · <code>\\S</code>', 'lo contrario', '<code>/^\\S+$/</code> = sin espacios'],
  ['<code>[abc]</code> · <code>[a-z]</code> · <code>[^@]</code>', 'uno de · rango · cualquiera menos', '<code>/^[A-Z]/</code>'],
  ['<code>*</code> · <code>+</code> · <code>?</code>', '0 o más · 1 o más · 0 o 1', '<code>/^\\d+$/</code>'],
  ['<code>{n}</code> · <code>{n,m}</code>', 'exactamente n · entre n y m', '<code>/^\\d{5}$/</code>'],
  ['<code>(a|b)</code>', 'a o b (agrupa)', '<code>/^(The|A) /</code>'],
  ['<code>\\b</code>', 'límite de palabra', '<code>/\\blove\\b/i</code>'],
  ['<code>\\.</code> <code>\\/</code> <code>\\(</code> <code>\\$</code>…', 'el carácter literal (escapado)', '<code>/\\.com$/</code>']
])}
${h.quiz({ id: 'l05-q1', q: '¿Qué títulos encuentra <code>/\\d/</code>?', options: ['Los que son solo un número', 'Los que contienen al menos un dígito en cualquier posición', 'Los que empiezan por un dígito', 'Los que terminan en un dígito'], answer: 1, why: 'Sin anclas, un patrón coincide si aparece en cualquier parte. Solo número: <code>/^\\d+$/</code>; empieza: <code>/^\\d/</code>; termina: <code>/\\d$/</code>.' })}

${h.label('④ Detalles')}
<h2>Lo que conviene saber</h2>
<ul>
  <li><b>Sobre arrays</b>, el patrón se prueba contra cada elemento: <code>{ "Movies.Details.Genres": /^Sci/ }</code>.</li>
  <li><b>Solo funciona con strings.</b> Un campo numérico (como <code>Client.Phone</code>) nunca coincide con una regex. Para eso hay que convertirlo a texto en agregación (<code>$toString</code> + <code>$regexMatch</code>, lección 09).</li>
  <li><b>Negar:</b> <code>{ campo: { $not: /patrón/ } }</code>. Igual que <code>$ne</code>, también coincide cuando el campo <b>no existe</b>: añade <code>$exists: true</code> si no lo quieres.</li>
  <li><b>Varios patrones:</b> <code>{ campo: { $in: [/^The /, /^A /] } }</code>.</li>
  <li><b>Rendimiento:</b> un patrón anclado con <code>^</code> y sin <code>i</code> puede usar un índice; <code>/abc/i</code> obliga a revisar todos los valores.</li>
</ul>

${h.label('⑤ Validar')}
<h2>Método para validar un formato</h2>
<ol>
  <li><b>Descríbelo con palabras</b>: «dos dígitos, barra, ocho dígitos, barra, dos dígitos y una T».</li>
  <li><b>Tradúcelo a un patrón anclado</b> de principio a fin (<code>^…$</code>): sin anclas validas solo un trozo.</li>
  <li><b>Cuenta</b> los que cumplen y los que no (con <code>$not</code>): ¿suman el total?</li>
  <li><b>Mira ejemplos</b> de los que no cumplen con <code>.limit(5)</code>: ¿son errores de datos o tu patrón es demasiado estricto?</li>
  <li><b>Piensa en casos límite</b>: espacios, caracteres repetidos, partes vacías, mayúsculas.</li>
</ol>
${h.callout('exam', 'Documenta tus pruebas', '<p>Una consulta con regex queda muy bien probada si muestras ejemplos que deben coincidir, ejemplos que no deben coincidir y los recuentos del paso 3.</p>')}

${h.label('⑥ Chuleta')}
<h2>Resumen</h2>
${h.cheat(['Quiero…', 'Escribo'], [
  ['empieza por', '<code>/^texto/</code>'],
  ['termina en', '<code>/texto$/</code>'],
  ['contiene, sin mayúsculas', '<code>/texto/i</code>'],
  ['palabra completa', '<code>/\\btexto\\b/</code>'],
  ['formato exacto', '<code>/^…$/</code>'],
  ['no cumple', '<code>{ $not: /…/ }</code> (+ <code>$exists: true</code>)'],
  ['como string', '<code>{ $regex: "…", $options: "i" }</code> (barras invertidas dobles)']
])}
`,
    lab: {
      id: 'l05', title: 'Lab 05 · Patrones en los datos', minutes: 30,
      done: 'Con esto cierras el bloque de <code>find()</code>. En la lección 06 empieza el aggregation pipeline.',
      steps: [
        { kind: 'task', title: 'Empieza por…', body: '<p>Facturas de <b>España</b> en las que alguna película vista tenga un título que <b>empieza por «The »</b> (con espacio).</p>', hints: ['Ancla al principio con <code>^</code>.', 'Los títulos están en <code>"Movies.Title"</code>: la regex se prueba contra cada película.'], solution: 'db.__COL__.find({ "contract.country": "Spain", "Movies.Title": /^The / })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", "Movies.Title": /^The / })', mode: 'ids' } },
        { kind: 'task', title: '…termina en', body: '<p>Facturas de clientes de <b>España</b> cuya población (<code>contract.town</code>) <b>termina en «wood»</b>.</p>', hints: ['Ancla al final con <code>$</code>.'], solution: 'db.__COL__.find({ "contract.country": "Spain", "contract.town": /wood$/ })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", "contract.town": /wood$/ })', mode: 'ids' } },
        { kind: 'task', title: 'Sin mayúsculas', body: '<p>En toda la collection, facturas en las que se vio alguna película de <b>Star Wars</b>, escrito como sea («Star Wars», «STAR WARS»…).</p>', hints: ['Contiene, sin anclas.', 'El modificador <code>i</code> ignora mayúsculas y minúsculas.'], solution: 'db.__COL__.find({ "Movies.Title": /star wars/i })', check: { type: 'query', ref: 'db.__COL__.find({ "Movies.Title": /star wars/i })', mode: 'ids' } },
        { kind: 'task', title: 'Con $regex', body: '<p>Facturas de <b>España</b> con alguna película cuyo título contenga <b>«love»</b> en cualquier combinación de mayúsculas. Esta vez usa la forma <code>{ $regex: …, $options: … }</code>.</p>', hints: ['El patrón va como string.', 'Las opciones van en <code>$options</code>: <code>"i"</code>.'], solution: 'db.__COL__.find({\n  "contract.country": "Spain",\n  "Movies.Title": { $regex: "love", $options: "i" }\n})', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", "Movies.Title": { $regex: "love", $options: "i" } })', mode: 'ids' }, success: 'Revisa los títulos: ¿todos contienen la palabra «love» o hay coincidencias dentro de otras palabras? ¿Cómo lo evitarías?' },
        { kind: 'task', title: 'Solo números', body: '<p>Facturas de <b>España</b> en las que alguna película tenga un título formado <b>únicamente por dígitos</b> (como «300»).</p>', hints: ['«Únicamente» significa de principio a fin: dos anclas.', 'Uno o más dígitos: <code>\\d+</code>.'], solution: 'db.__COL__.find({ "contract.country": "Spain", "Movies.Title": /^\\d+$/ })', check: { type: 'query', ref: 'db.__COL__.find({ "contract.country": "Spain", "Movies.Title": /^\\d+$/ })', mode: 'ids' }, success: 'Prueba a quitar las anclas y compara el recuento: así se ve por qué un patrón de validación debe estar anclado.' },
        { kind: 'quiz', title: 'Validar un formato', body: '<p>Cuenta los códigos de cliente que <b>no</b> siguen el formato «2 dígitos / 8 dígitos / 2 dígitos + T»:</p>' + h.code('db.__COL__.countDocuments({\n  "Client.customer code": { $not: /^\\d{2}\\/\\d{8}\\/\\d{2}T$/ }\n})'), q: '¿Cuántos códigos de cliente tienen un formato incorrecto?', live: 'db.__COL__.countDocuments({ "Client.customer code": { $not: /^\\d{2}\\/\\d{8}\\/\\d{2}T$/ } })', options: ['{{live}}', 'Unos 5.000', 'La mitad', 'Todos'], answer: 0, why: 'Los datos de este campo están limpios. Un recuento de incumplimientos es una buena prueba para documentar, sea cual sea el resultado: demuestra que lo has comprobado.' }
      ]
    }
  };
};
