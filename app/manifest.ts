import type { MetadataRoute } from 'next'

// Manifest PWA — permite "adicionar à tela inicial" no celular.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Padaria Santa Cecília',
    short_name: 'Santa Cecília',
    description: 'Cardápio digital, pedidos e atendente da Padaria Santa Cecília.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f7f5f1',
    theme_color: '#2f2620',
    lang: 'pt-BR',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
