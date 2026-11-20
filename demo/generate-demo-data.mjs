// Genera un dataset de DEMOSTRACIÓN 100 % inventado, con el esquema que usa el tutorial
// (facturas mensuales de televisión de alta definición). Sirve para probar el tutorial sin tener datos propios.
//
//   node demo/generate-demo-data.mjs [clientes] [salida]
//   mongoimport --db demo --collection facturas --file demo/demo-data.json
//
// Es determinista: siempre produce los mismos datos. Nombres, títulos, direcciones y códigos son ficticios.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CUSTOMERS = +(process.argv[2] || 200);
const OUT = process.argv[3] || path.join(HERE, 'demo-data.json');

// ---------------------------------------------------------------- utilidades
let seed = 20250101;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
const chance = (p) => rnd() < p;
const weighted = (pairs) => { let r = rnd() * pairs.reduce((s, p) => s + p[1], 0); for (const [v, w] of pairs) { if ((r -= w) <= 0) return v; } return pairs[0][0]; };
const sample = (arr, n) => { const a = [...arr], out = []; while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };
const pad = (n, w = 2) => String(n).padStart(w, '0');
const round2 = (x) => Math.round(x * 100) / 100;
const unique = (gen, n) => { const s = new Set(); let guard = 0; while (s.size < n && guard++ < n * 50) s.add(gen()); return [...s]; };

// ---------------------------------------------------------------- vocabulario inventado
const FIRST = ['Elena', 'Bruno', 'Marco', 'Ingrid', 'Sergio', 'Claire', 'Haruto', 'Tiago', 'Lucía', 'Mateo', 'Sofía', 'Hugo', 'Alba', 'Nico', 'Irene', 'Dario', 'Marta', 'Pablo', 'Noa', 'Álvaro', 'Julia', 'Iker', 'Carmen', 'Leo', 'Vera', 'Adrián', 'Paula', 'Gael', 'Rosa', 'Enzo', 'Aitana', 'Lola', 'Teo', 'Mireia', 'Oriol', 'Nerea', 'Biel', 'Ariadna', 'Joan', 'Clara'];
const LAST = ['Soler', 'Vidal', 'Ferrer', 'Navarro', 'Prieto', 'Marín', 'Quiroga', 'Montes', 'Ibáñez', 'Roca', 'Serra', 'Pons', 'Cano', 'Lozano', 'Gil', 'Ramos', 'Vega', 'Campos', 'Fuentes', 'Lara', 'Rubio', 'Crespo', 'Bravo', 'Mora', 'Nieto', 'Calvo', 'Duran', 'Esteve', 'Gallego', 'Herrera'];
const ADJ = ['Silent', 'Golden', 'Hollow', 'Crimson', 'Paper', 'Midnight', 'Broken', 'Hidden', 'Neon', 'Distant', 'Frozen', 'Velvet', 'Wild', 'Gentle', 'Electric', 'Silver', 'Lonely', 'Burning', 'Quiet', 'Emerald', 'Amber', 'Restless', 'Borrowed', 'Final', 'Secret', 'Iron', 'Glass', 'Scarlet'];
const NOUN = ['Harbor', 'Lantern', 'Orchard', 'Compass', 'Falcon', 'Window', 'Garden', 'Station', 'Carnival', 'Mirror', 'Bridge', 'Key', 'River', 'Tower', 'Letter', 'Island', 'Engine', 'Canyon', 'Cellar', 'Attic', 'Kingdom', 'Promise', 'Shadow', 'Horizon', 'Fortune', 'Voyage'];
const PLACE = ['Verona', 'Lisbon', 'Oslo', 'Kyoto', 'Marlow', 'Avalon', 'Cádiz', 'Bergen', 'Turin', 'Lyon', 'Galway', 'Porto', 'Nara', 'Dover', 'Malmö', 'Bruges'];
const GENRES = [['Drama', 10], ['Comedy', 8], ['Thriller', 6], ['Action', 6], ['Romance', 4], ['Crime', 4], ['Adventure', 4], ['Horror', 3], ['Sci-Fi', 3], ['Mystery', 3], ['Family', 2], ['Fantasy', 2], ['Documentary', 2], ['History', 1], ['Biography', 1]];
const KEYWORDS = ['lantern', 'moon', 'letter', 'ferry', 'secret', 'rivalry', 'heist', 'storm', 'inheritance', 'festival', 'island', 'train', 'detective', 'wedding', 'exile', 'bridge', 'rescue', 'orchard', 'garden', 'lighthouse', 'mirror', 'siege', 'voyage', 'melody', 'prophecy', 'diary', 'harbor', 'mask', 'compass', 'twin'];
const COUNTRIES = [['Spain', 'ES'], ['France', 'FR'], ['Italy', 'IT'], ['Portugal', 'PT'], ['Germany', 'DE'], ['Japan', 'JP'], ['Mexico', 'MX'], ['Canada', 'CA'], ['Norway', 'NO'], ['Brazil', 'BR'], ['Ireland', 'IE'], ['Australia', 'AU']];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TARIFFS = [
  { Reference: 'Free Rider', 'monthly fee': 10, type: 'pay per content', 'cost per content': 2.5, zapping: 5, 'cost per minute': 0, 'cost per day': 0.95, promotion: 5 },
  { Reference: 'Premium Rider', 'monthly fee': 38, type: 'pay per view', 'cost per content': 0, zapping: 0, 'cost per minute': 0.02, 'cost per day': 0, promotion: 0 },
  { Reference: 'Flat Rate Lover', 'monthly fee': 24, type: 'pay per content', 'cost per content': 1, zapping: 0, 'cost per minute': 0, 'cost per day': 0.4, promotion: 0 },
  { Reference: 'Short Timer', 'monthly fee': 12, type: 'pay per content', 'cost per content': 1.8, zapping: 5, 'cost per minute': 0, 'cost per day': 0.5, promotion: 10 },
  { Reference: 'Content Master', 'monthly fee': 18, type: 'pay per content', 'cost per content': 1.5, zapping: 4, 'cost per minute': 0, 'cost per day': 0.7, promotion: 5 },
  { Reference: 'Boredom Fighter', 'monthly fee': 20, type: 'pay per view', 'cost per content': 0, zapping: 1, 'cost per minute': 0.015, 'cost per day': 0.3, promotion: 0 },
  { Reference: 'Low Cost Rate', 'monthly fee': 8, type: 'pay per view', 'cost per content': 0, zapping: 4, 'cost per minute': 0.01, 'cost per day': 0.2, promotion: 15 }
];

// ---------------------------------------------------------------- catálogos (títulos y personas inventados)
const people = (n) => unique(() => pick(FIRST) + ' ' + pick(LAST), n);
const DIRECTORS = people(45), ACTORS = people(110);
const movieTitle = () => weighted([[() => `The ${pick(ADJ)} ${pick(NOUN)}`, 4], [() => `${pick(NOUN)} of ${pick(PLACE)}`, 2], [() => `${pick(ADJ)} ${pick(NOUN)}`, 3], [() => `Letters from ${pick(PLACE)}`, 1], [() => `Last ${pick(NOUN)} in ${pick(PLACE)}`, 1]])();
const seriesTitle = () => weighted([[() => `${pick(ADJ)} ${pick(NOUN)}`, 3], [() => `${pick(PLACE)} Stories`, 2], [() => `Inspector ${pick(LAST)}`, 1], [() => `Night Shift ${pick(NOUN)}s`, 1], [() => `${pick(NOUN)} General`, 1]])();
const MOVIE_COUNTRIES = [['USA', 62], ['UK', 9], ['France', 6], ['Spain', 6], ['Japan', 5], ['South Korea', 4], ['Germany', 4], ['Canada', 4]];
const LANG = { USA: 'English', UK: 'English', France: 'French', Spain: 'Spanish', Japan: 'Japanese', 'South Korea': 'Korean', Germany: 'German', Canada: 'English' };

const movies = unique(movieTitle, 230).map((Title) => {
  const Country = weighted(MOVIE_COUNTRIES);
  const dir = pick(DIRECTORS), stars = sample(ACTORS, 3);
  if (chance(0.09)) stars[int(0, 2)] = dir;            // directores que también protagonizan
  const local = Country === 'Japan' ? 110 : Country === 'South Korea' ? 1100 : 1;   // presupuestos en moneda local, como en los datos reales
  const budget = Math.round(Math.exp(15 + rnd() * 4.2) / 1e4) * 1e4 * local;
  const gross = Math.round(budget / local * (chance(0.38) ? 0.1 + rnd() * 0.85 : 1 + rnd() * 4) / 1e3) * 1e3;
  const genres = unique(() => weighted(GENRES), int(1, 3));
  const d = {
    Year: int(1978, 2015), Country, Color: chance(0.95) ? 'yes' : 'no', 'Aspect ratio': pick([1.78, 1.85, 2.35, 2.39]), 'Content Rating': pick(['G', 'PG', 'PG-13', 'R', 'R', 'PG-13', 'TV-14', 'Not Rated']),
    Budget: budget, Gross: gross, Director: { Name: dir, 'Facebook likes': int(0, 900) },
    Cast: { 'Facebook likes': int(300, 40000), Stars: stars.map((Player) => ({ Player, 'Facebook likes': int(50, 15000) })) },
    Language: LANG[Country], Genres: genres, Keywords: sample(KEYWORDS, int(3, 5)), 'Faces in poster': int(0, 6), 'IMDB score': round2(3.5 + rnd() * 5.5).toFixed(1) * 1,
    'IMDB link': 'http://www.imdb.com/title/tt' + pad(int(1, 9999999), 7) + '/', 'Critic reviews': int(10, 600), 'User reviews': int(20, 1500), 'Voted users': Math.round(Math.exp(7 + rnd() * 7)), 'Facebook likes': chance(0.5) ? 0 : int(100, 60000), Duration: int(75, 150)
  };
  if (chance(0.07)) delete d.Budget; if (chance(0.07)) delete d.Gross; if (chance(0.05)) delete d.Keywords;
  return { Title, Details: d };
});
const series = unique(seriesTitle, 55).map((Title) => { const ts = int(1, 12); return { Title, Total_Seasons: ts, Total_Episodes: int(8, 26), Avg: pick([22, 30, 45, 60]) }; });

// ---------------------------------------------------------------- clientes y facturas
const dniLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
const dni = (i) => { const n = 10000000 + (i * 7919) % 89999999; return String(n).padStart(8, '0') + dniLetters[n % 23]; };
const dmy = (d, m, y) => `${pad(d)}/${pad(m)}/${y}`;
const lic = (date) => ({ Date: date, Time: '00:00:00' });
const viewingPct = () => (chance(0.82) ? weighted([[100, 5], [99, 3], [98, 3]]) : int(1, 60));

const lines = [];
for (let c = 0; c < CUSTOMERS; c++) {
  const [country, cc] = pick(COUNTRIES);
  const tariff = pick(TARIFFS);
  const code = `${pad(int(0, 99))}/${pad(int(0, 99999999), 8)}/${pad(int(1, 60))}T`;
  const contractId = `${cc}${pad(int(0, 99999), 5)}/${pad(int(1, 14))}`;
  const surname = chance(0.28) ? [pick(LAST), pick(LAST)] : pick(LAST);
  const name = pick(FIRST);
  const sName = Array.isArray(surname) ? surname[0] : surname;
  const client = { 'customer code': code, DNI: dni(c + 1), Name: name, Surname: surname, 'Birth date': dmy(int(1, 28), int(1, 12), int(45, 99)), Email: `${name}.${sName}${chance(0.4) ? int(1, 99) : ''}@example.com`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') };
  if (chance(0.88)) client.Phone = int(555000000, 555999999);
  const start = dmy(int(1, 28), int(1, 12), int(10, 24));
  const contract = { 'contract ID': contractId, 'start date': start, ...(chance(0.7) ? { 'end date': dmy(int(1, 28), int(1, 12), int(25, 28)) } : {}), product: tariff, address: `${int(1, 250)} ${pick(ADJ)} Street${chance(0.5) ? ', Floor ' + int(1, 6) : ''}`, town: `${pick(ADJ)}${pick(['wood', 'ford', 'bridge', 'field', 'borough', 'ton'])}`, ZIP: pad(int(1000, 99999), 5), country };
  const joined = weighted([[1, 34], [2, 12], [3, 10], [4, 9], [5, 8], [6, 7], [7, 6], [8, 5], [9, 4], [10, 3], [11, 2]]);   // los clientes se incorporan a lo largo del año
  for (let m = joined; m <= 12; m++) {
    const nm = weighted([[0, 24], [1, 14], [2, 16], [3, 16], [4, 14], [5, 10], [6, 6]]);
    const ns = weighted([[0, 20], [1, 10], [2, 12], [3, 16], [4, 14], [5, 12], [6, 10], [7, 6]]);
    const doc = { _id: `${contractId}/${m}/2025`, billing: `${MONTHS[m - 1]} 2025`, TOTAL: 0, Client: client, contract };
    let fees = tariff['monthly fee'];
    if (nm) {
      doc.Movies = sample(movies, nm).map((mv) => {
        const date = dmy(int(1, 28), m, 2016), pct = viewingPct();
        if (pct >= tariff.zapping + 1) fees += tariff['cost per content'] + mv.Details.Duration * tariff['cost per minute'] * (pct / 100);
        const item = { Date: date, Time: `${pad(int(0, 23))}:${pad(int(0, 59))}:00` };
        return { ...item, Title: mv.Title, ...(chance(0.58) ? { License: lic(date) } : {}), Details: mv.Details, 'Viewing PCT': pct };
      });
    }
    if (ns) {
      doc.Series = Array.from({ length: ns }, () => {
        const s = pick(series), date = dmy(int(1, 28), m, 2016), pct = viewingPct(), te = s.Total_Episodes, season = int(1, s.Total_Seasons);
        if (pct >= tariff.zapping + 1) fees += tariff['cost per content'] * 0.5 + s.Avg * tariff['cost per minute'] * (pct / 100);
        return { Date: date, Time: `${pad(int(0, 23))}:${pad(int(0, 59))}:00`, Title: s.Title, Season: season, Episode: int(1, te), 'Avg duration': s.Avg, 'Total Episodes': te, 'Total Seasons': s.Total_Seasons, License: lic(date), 'Viewing PCT': pct };
      });
    }
    fees += tariff['cost per day'] * 30 * (tariff.promotion ? 0.3 : 0.1);
    doc.TOTAL = chance(0.1) ? Math.round(fees) : round2(fees);
    Object.assign(doc, { 'charge date': dmy(3, (m % 12) + 1, 25), 'issue date': dmy(int(17, 28), m, 24), 'dump date': '29/06/25' });
    lines.push(JSON.stringify(doc));
  }
}
fs.writeFileSync(OUT, lines.join('\n') + '\n');
console.log(`Dataset de demostración: ${lines.length} facturas de ${CUSTOMERS} clientes inventados → ${path.relative(process.cwd(), OUT) || OUT}`);
console.log('Impórtalo con:  mongoimport --db demo --collection facturas --file ' + path.relative(process.cwd(), OUT));
