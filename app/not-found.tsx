import Link from 'next/link'
import { Croissant, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Croissant className="w-10 h-10 text-primary" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-2">Padaria Santa Cecília</p>
        <h1 className="font-heading text-5xl font-bold text-foreground">404</h1>
        <p className="text-foreground font-medium mt-3">Essa página saiu do forno e não voltou.</p>
        <p className="text-muted-foreground text-sm mt-1">O link pode estar errado ou a página foi movida.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-6 bg-primary text-primary-foreground font-semibold px-6 py-3 rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Home className="w-4 h-4" /> Voltar ao cardápio
        </Link>
      </div>
    </div>
  )
}
