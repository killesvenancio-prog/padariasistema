'use client'

import { useSearchParams } from 'next/navigation'
import { formatarPreco } from '@/lib/format'
import { StatusPedido } from '@/components/StatusPedido'
import { CheckCircle, Camera, Croissant, ClipboardList } from 'lucide-react'
import Link from 'next/link'

export function ConfirmacaoPage() {
  const searchParams = useSearchParams()
  const pedidoId = searchParams.get('pedido_id')
  const total = searchParams.get('total')
  const statusInicial = searchParams.get('status') || 'recebido'
  const id = pedidoId ? Number(pedidoId) : null

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

          {total && (
            <div className="bg-secondary rounded-2xl p-4 mb-6 flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="text-xl font-bold text-primary">{formatarPreco(parseFloat(total))}</span>
            </div>
          )}

          {/* Acompanhamento ao vivo */}
          {id != null && <StatusPedido id={id} statusInicial={statusInicial} />}

          <div className="mt-7 space-y-2.5">
            <Link
              href="/pedidos"
              className="flex items-center justify-center gap-2 w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <ClipboardList className="w-4 h-4" /> Acompanhar meus pedidos
            </Link>
            <Link
              href="/"
              className="block w-full border border-border text-foreground font-medium py-3 px-6 rounded-xl hover:bg-secondary transition-colors"
            >
              Voltar ao cardápio
            </Link>
          </div>
        </div>

        <a href="https://www.instagram.com/santaceciliapadaria/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 mt-4 text-sm text-muted-foreground hover:text-primary transition-colors">
          <Camera className="w-4 h-4" /> Acompanhe a gente no @santaceciliapadaria
        </a>
      </div>
    </div>
  )
}
