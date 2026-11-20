// Temario completo. `ready: true` cuando la página ya existe en _build/content/<id>.mjs
const L = (num, slug, title, summary, minutes, ready = false) => ({ id: 'l' + num, num, kind: 'lesson', file: `lecciones/${num}-${slug}.html`, title, summary, minutes, ready });
const M = (num, slug, title, summary, minutes, ready = false) => ({ id: 'm' + num, num: 'M' + num, kind: 'mission', file: `misiones/m${num}-${slug}.html`, title, summary, minutes, ready });

export const COURSE = [
  L('00', 'servidor-mongoimport-mongosh', 'Servidor, mongoimport y mongosh', 'Las tres piezas de MongoDB, cómo se importa un JSON y tus primeros comandos en la shell.', 25, true),
  L('01', 'modelo-de-documentos', 'Modelo de documentos', 'Documentos, subdocumentos, arrays y por qué no todas las facturas tienen la misma forma.', 25, true),
  L('02', 'find-filtro-proyeccion', 'find(): filtro y proyección', 'Filtrar, elegir campos, notación con puntos, sort, limit y skip.', 30, true),
  L('03', 'operadores-consulta', 'Operadores de consulta', 'Comparación ($gt, $in…), lógicos ($and, $or…), $exists y $type.', 30, true),
  L('04', 'arrays-y-subdocumentos', 'Arrays y subdocumentos', '$size, índices posicionales, $elemMatch y $all sobre datos anidados.', 30, true),
  L('05', 'expresiones-regulares', 'Expresiones regulares', '$regex, anclas, clases de caracteres y validación de formatos.', 30, true),
  L('06', 'aggregation-pipeline', 'Aggregation pipeline', 'Etapas encadenadas: $match, $project, $sort, $limit, $count.', 30, true),
  L('07', 'group-acumuladores', '$group y acumuladores', '$sum, $avg, $max, $push, $addToSet y el patrón «el más frecuente».', 35, true),
  L('08', 'unwind-arrays-embebidos', '$unwind y arrays embebidos', 'Desplegar Movies y Series, y qué pasa con los documentos sin array.', 35, true),
  L('09', 'expresiones-agregacion', 'Expresiones de agregación', '$expr, $cond, $addFields, $filter, $map: comparar campos del mismo documento.', 40, true),
  L('10', 'facet-bucket-deciles', '$facet, $bucket y deciles', 'Varias listas en una consulta y reparto en tramos con $bucketAuto.', 40, true),
  L('11', 'mapreduce', 'MapReduce', 'map, emit, reduce, finalize y out; idempotencia y alternativas.', 40, true),
  L('12', 'estrategia-y-documentacion', 'Estrategia y documentación', 'Cómo plantear, probar y documentar una consulta.', 20, true)
];

export const MISSIONS = [
  M('1', 'auditoria-kyc', 'Auditoría KYC', 'Compliance necesita localizar fichas de cliente incompletas antes de una inspección.', 20, true),
  M('2', 'dni-invalidos', 'DNIs con formato inválido', 'El equipo de cobros sospecha que hay DNIs mal cargados.', 20, true),
  M('3', 'generos-mas-vistos', 'Los géneros que más tiempo consumen', 'Marketing quiere saber en qué géneros pasan más tiempo los clientes.', 25, true),
  M('4', 'cine-por-pais', 'Cine por país de producción', 'Contenidos quiere comparar el catálogo visto según el país de producción.', 25, true),
  M('5', 'panel-de-facturacion', 'Panel de facturación en una consulta', 'Producto quiere las facturas más altas, las más bajas y un resumen en una sola llamada.', 25, true),
  M('6', 'facturas-extremas', 'Facturas extremas por tarifa', 'Finanzas mantiene un informe en MapReduce que hay que reproducir y validar.', 30, true)
];
