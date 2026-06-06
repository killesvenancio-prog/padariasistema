import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Providers } from '@/components/Providers'
import { SITE_URL, SITE_NOME } from '@/lib/site'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

const TITULO = `${SITE_NOME} — Cardápio & Pedidos`
const DESCRICAO =
  'Pães fresquinhos, doces, salgados quentinhos e bebidas. Monte seu pedido pelo cardápio digital da Padaria Santa Cecília — mesa, retirada ou entrega, com atendente que ajuda a escolher.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITULO,
    template: `%s · ${SITE_NOME}`,
  },
  description: DESCRICAO,
  applicationName: SITE_NOME,
  keywords: ['padaria', 'cardápio', 'pedidos', 'pães', 'doces', 'salgados', 'Santo Antônio da Patrulha', 'delivery'],
  authors: [{ name: SITE_NOME }],
  manifest: '/manifest.webmanifest',
  alternates: { canonical: '/' },
  formatDetection: { telephone: true, address: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Santa Cecília',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: SITE_URL,
    siteName: SITE_NOME,
    title: TITULO,
    description: DESCRICAO,
    images: [{ url: '/logo.png', width: 512, height: 512, alt: SITE_NOME }],
  },
  twitter: {
    card: 'summary',
    title: TITULO,
    description: DESCRICAO,
    images: ['/logo.png'],
  },
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f5f1' },
    { media: '(prefers-color-scheme: dark)', color: '#2f2620' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
