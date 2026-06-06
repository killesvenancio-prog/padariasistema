'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { listarPedidosLocais, removerPedidoLocal, type PedidoLocal } from '@/lib/pedidosLocais'
import { usePedidoStatus, LinhaTempo } from '@/components/StatusPedido'
import { formatarPreco } from '@/lib/format'
import { STATUS_LABEL, corStatus } from '@/lib/statusPedido'
import { ArrowLeft, ClipboardList, Trash2, ShoppingBag } from 'lucide-react'

function rotuloModo(modo: string): string {
  if (modo === 'mesa') return 'Mesa'
  if (modo === 'entrega') return 'Entrega'
  return 'Retirada'
}

function CardPedido({ p, onRemover }: { p: PedidoLocal; onRemover: (id: number) => void }) {
  const { pedido, carregando } = usePedidoStatus(p.id)
  const status = pedido?.status
  const data = new Date(p.data)

  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-heading font-bold text-foreground">Pedido #{p.id}</p>
          <p className="text-xs text-muted-foreground">
            {rotuloModo(p.modo)} ·{' '}
            {data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}{' '}
            {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {status ? (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${corStatus(status)}`}>
            {STATUS_LABEL[status] ?? status}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{carregando ? 'carregando…' : '—'}</span>
        )}
      </div>

      <div className="mt-4">
        <LinhaTempo status={status ?? 'recebido'} />
      </div>

      {pedido && pedido.itens.length > 0 && (
        <ul className="text-sm space-y-0.5 mt-4 border-t border-border pt-3">
          {pedido.itens.map((it, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="text-foreground">{it.quantidade}× {it.nome}</span>
              <span className="text-muted-foreground tabular-nums">{formatarPreco(it.preco_unitario * it.quantidade)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="font-bold text-foreground">Total: {formatarPreco(Number(pedido?.total ?? p.total))}</span>
        <button
          onClick={() => onRemover(p.id)}
          className="text-xs text-muted-foreground hover:text-destructive inline-flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" /> remover
        </button>
      </div>
    </div>
  )
}

export function MeusPedidos() {
  const [pedidos, setPedidos] = useState<PedidoLocal[]>([])
  const [pronto, setPronto] = useState(false)

  useEffect(() => {
    const sync = () => setPedidos(listarPedidosLocais())
    sync()
    setPronto(true)
    window.addEventListener('meus-pedidos-mudou', sync)
    return () => window.removeEventListener('meus-pedidos-mudou', sync)
  }, [])

  function remover(id: number) {
    removerPedidoLocal(id)
    setPedidos(listarPedidosLocais())
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-foreground hover:text-primary transition-colors" aria-label="Voltar ao cardápio">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-none">Meus pedidos</h1>
            <p className="text-xs text-muted-foreground mt-1">Acompanhe o status em tempo real</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {pronto && pedidos.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">Você ainda não fez pedidos</p>
            <p className="text-muted-foreground text-sm mt-1">Seus pedidos aparecem aqui pra você acompanhar.</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 mt-5 bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors"
            >
              <ShoppingBag className="w-4 h-4" /> Ver cardápio
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {pedidos.map((p) => (
              <CardPedido key={p.id} p={p} onRemover={remover} />
            ))}
            {pedidos.length > 0 && (
              <p className="text-[11px] text-center text-muted-foreground pt-2">
                Estes pedidos ficam salvos só neste aparelho/navegador.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
