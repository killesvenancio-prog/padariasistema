'use client'

import { useSearchParams } from 'next/navigation'
import { formatarPreco } from '@/lib/format'
import { CheckCircle, ChefHat, ConciergeBell, Camera, Croissant } from 'lucide-react'
import Link from 'next/link'

export function ConfirmacaoPage() {
  const searchParams = useSearchParams()
  const pedidoId = searchParams.get('pedido_id')
  const total = searchParams.get('total')
  const status = searchParams.get('status')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl p-8 shadow-lg border border-border text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>

          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-1.5 flex items-center justify-center gap-1.5">
            <Croissant className="w-3.5 h-3.5 text-primary" /> Padaria Santa Cecília
          </p>
          <h1 className="text-2xl font-bold text-foreground mb-2">Pedido #{pedidoId} recebido!</h1>
          <p className="text-muted-foreground mb-6">Já estamos cuidando do seu pedido. Obrigado pela preferência!</p>

          <div className="bg-secondary rounded-2xl p-4 mb-6 text-left">
            <div className="flex justify-between items-center mb-2">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="text-xl font-bold text-primary">{formatarPreco(parseFloat(total || '0'))}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Status</span>
              <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium capitalize">{status}</span>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="flex items-center justify-between gap-1 mb-6 text-[11px] text-muted-foreground">
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"><CheckCircle className="w-4 h-4" /></span>
              Recebido
            </div>
            <div className="h-px w-6 bg-border" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center"><ChefHat className="w-4 h-4" /></span>
              Em preparo
            </div>
            <div className="h-px w-6 bg-border" />
            <div className="flex-1 flex flex-col items-center gap-1">
              <span className="w-9 h-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center"><ConciergeBell className="w-4 h-4" /></span>
              Pronto
            </div>
          </div>

          <Link href="/" className="block w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors">
            Voltar ao cardápio
          </Link>
        </div>

        <a href="https://www.instagram.com/santaceciliapadaria/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 mt-4 text-sm text-muted-foreground hover:text-primary transition-colors">
          <Camera className="w-4 h-4" /> Acompanhe a gente no @santaceciliapadaria
        </a>
      </div>
    </div>
  )
}
