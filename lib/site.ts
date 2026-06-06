// URL pública do site (usada em SEO, manifest, sitemap e compartilhamento).
// Pode ser sobrescrita por NEXT_PUBLIC_SITE_URL no Vercel se o domínio mudar.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://padariasistema.vercel.app'

export const SITE_NOME = 'Padaria Santa Cecília'
