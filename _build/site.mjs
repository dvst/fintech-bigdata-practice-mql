// Datos del autor y del repositorio. Se usan en el pie de página y en los llamados a la acción.
// `repo`: URL pública del repositorio en GitHub. Mientras esté vacía, no se muestran ni la ⭐ ni los
// botones de compartir (compartir un enlace a localhost no tendría sentido). También puede pasarse al
// generar las páginas:  MQL_REPO_URL=https://github.com/usuario/repo node _build/build.mjs
export const SITE = {
  name: 'MQL Lab',
  author: 'Javitech.co',
  handle: 'javitech_co',
  web: 'https://www.javitech.co',
  youtube: 'https://youtube.com/@javitech_co?sub_confirmation=1',
  twitter: 'https://twitter.com/intent/user?screen_name=javitech_co',
  linkedin: 'https://www.linkedin.com/in/javierperezp',
  repo: process.env.MQL_REPO_URL || ''
};
