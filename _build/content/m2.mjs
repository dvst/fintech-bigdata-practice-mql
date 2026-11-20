// Misión M2 · DNIs con formato inválido
export default (h) => ({
  lead: 'Un bug reportado por Cobros: se rechazan domiciliaciones y sospechan de los DNIs. Tu trabajo es <b>comprobarlo con datos</b>, sea cual sea la respuesta. Regex, expresiones y, sobre todo, pruebas convincentes.',
  body: `
${h.ticket({
  key: 'DATA-102', type: 'Bug', priority: 'Media', reporter: 'Andrés Gil', reporterColor: '#ff5b5b', estimate: '20 min', labels: ['cobros', 'calidad-de-datos', 'regex'],
  summary: 'Rechazos de domiciliaciones: ¿hay DNIs mal cargados?',
  description: '<p>Desde la última migración el banco rechaza algunas domiciliaciones con el motivo «identificador fiscal no válido». Sospechamos que hay DNIs con formato incorrecto en <code>Client.DNI</code>. Un DNI válido tiene <b>8 dígitos y una letra mayúscula</b>, y la letra es un dígito de control:</p><p><code>letra = "TRWAGMYFPDXBNJZSQVHLCKE"[número % 23]</code></p>',
  criteria: [
    'Contar los DNIs que <b>no</b> cumplen el formato «8 dígitos + letra mayúscula».',
    'Comprobar que la consulta del AC1 detectaría un DNI malo (no basta con que devuelva 0).',
    'Contar cuántos DNIs tienen una <b>letra de control correcta</b> y cuántos no.',
    'Concluir en el ticket si el problema está o no en los DNIs.'
  ],
  comments: [
    { who: 'Javier Molina', role: 'Data Lead', when: 'ayer', color: '#4c9bff', text: 'Ojo con «0 resultados»: una consulta mal escrita también devuelve 0. Si concluyes que los datos están bien, demuestra que tu consulta habría encontrado los malos.' }
  ]
})}
${h.callout('tip', 'Repaso', '<p>Lecciones <a href="../lecciones/05-expresiones-regulares.html">05</a> (regex y validación) y <a href="../lecciones/09-expresiones-agregacion.html">09</a> (<code>$substrCP</code>, <code>$toInt</code>, <code>$mod</code>).</p>')}
`,
  lab: {
    id: 'm2', title: 'DATA-102 · Investigar el bug', minutes: 20,
    intro: 'Trabaja en la terminal de la derecha (mongosh real). Cada paso se valida contra tu MongoDB.',
    done: 'Ticket <b>DATA-102</b> cerrado con evidencias: el problema no está en los DNIs, y lo has demostrado.',
    steps: [
      { kind: 'task', xp: 40, title: 'AC1 · Formato inválido', body: '<p>Cuenta los documentos cuyo <code>Client.DNI</code> <b>no</b> cumple el formato (8 dígitos + 1 letra mayúscula).</p>', hints: ['Patrón anclado: <code>/^\\d{8}[A-Z]$/</code>.', 'Negación: <code>{ $not: /…/ }</code> dentro de <code>countDocuments</code>.'], solution: 'db.__COL__.countDocuments({ "Client.DNI": { $not: /^\\d{8}[A-Z]$/ } })', check: { type: 'query', ref: 'db.__COL__.countDocuments({ "Client.DNI": { $not: /^\\d{8}[A-Z]$/ } })', mode: 'docs' } },
      { kind: 'quiz', xp: 20, title: 'AC2 · ¿Detectaría un DNI malo?', body: '<p>Prueba tu patrón contra contraejemplos directamente en mongosh (es JavaScript):</p>' + h.code('["12345678Z", "1234567Z", "12345678z", "123456789", "12345678ZZ"]\n  .map(d => /^\\d{8}[A-Z]$/.test(d))'), q: '¿Qué resultado demuestra que el patrón es correcto?', options: ['<code>[true, true, true, true, true]</code>', '<code>[true, false, false, false, false]</code>', '<code>[false, false, false, false, false]</code>', 'Cualquiera: lo importante es que el AC1 dé 0'], answer: 1, why: 'Solo el primero es válido: 7 dígitos, letra minúscula, sin letra y dos letras deben fallar. Este tipo de comprobación es exactamente lo que debe ir en la verificación de una consulta.' },
      { kind: 'task', xp: 40, title: 'Distribución de letras', body: '<p>Antes de calcular la letra de control, comprueba que sabes extraerla: cuenta las facturas por <b>letra del DNI</b> (el carácter en la posición 8) y devuelve las <b>5 más frecuentes</b>: <code>{ _id: letra, n: N }</code>, de más a menos y en empate por letra.</p>', hints: ['<code>{ $substrCP: ["$Client.DNI", 8, 1] }</code> devuelve 1 carácter desde la posición 8 (empieza en 0).', 'Úsalo como clave de <code>$group</code>.'], solution: 'db.__COL__.aggregate([\n  { $group: { _id: { $substrCP: ["$Client.DNI", 8, 1] }, n: { $sum: 1 } } },\n  { $sort: { n: -1, _id: 1 } },\n  { $limit: 5 }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $group: { _id: { $substrCP: ["$Client.DNI", 8, 1] }, n: { $sum: 1 } } }, { $sort: { n: -1, _id: 1 } }, { $limit: 5 }])', mode: 'docs', ordered: true } },
      { kind: 'task', xp: 50, title: 'AC3 · Letra de control', body: '<p>Agrupa los documentos según si la letra de control es correcta (<code>true</code>) o no (<code>false</code>): <code>{ _id: true|false, n: N }</code>.</p>', hints: ['Número: <code>{ $toInt: { $substrCP: ["$Client.DNI", 0, 8] } }</code>.', 'Resto: <code>{ $mod: [número, 23] }</code>. Letra esperada: <code>{ $substrCP: ["TRWAGMYFPDXBNJZSQVHLCKE", resto, 1] }</code>.', 'Clave del grupo: <code>{ $eq: [letraEsperada, letraReal] }</code>.'], solution: 'db.__COL__.aggregate([\n  { $group: {\n      _id: { $eq: [\n        { $substrCP: ["TRWAGMYFPDXBNJZSQVHLCKE",\n            { $mod: [ { $toInt: { $substrCP: ["$Client.DNI", 0, 8] } }, 23 ] }, 1] },\n        { $substrCP: ["$Client.DNI", 8, 1] }\n      ] },\n      n: { $sum: 1 }\n  } }\n])', check: { type: 'query', ref: 'db.__COL__.aggregate([{ $group: { _id: { $eq: [{ $substrCP: ["TRWAGMYFPDXBNJZSQVHLCKE", { $mod: [{ $toInt: { $substrCP: ["$Client.DNI", 0, 8] } }, 23] }, 1] }, { $substrCP: ["$Client.DNI", 8, 1] }] }, n: { $sum: 1 } } }])', mode: 'docs' }, success: 'Si la fórmula estuviera mal, saldría una mezcla de <code>true</code> y <code>false</code>: que salga todo <code>true</code> es una prueba fuerte.' },
      { kind: 'quiz', xp: 20, title: 'AC4 · Cerrar el ticket', q: '¿Cómo cierras el ticket?', options: ['«No he encontrado nada.»', '«Los DNIs son correctos: 0 con formato inválido (patrón probado con contraejemplos) y todos con letra de control válida. El rechazo debe de tener otra causa; propongo revisar el IBAN.»', '«Los DNIs están mal, hay que recargarlos.»', 'Lo reasigno sin comentar'], answer: 1, why: 'Un resultado negativo también es un resultado, si va acompañado de las pruebas que lo sostienen y de una propuesta para seguir.' }
    ]
  }
});
