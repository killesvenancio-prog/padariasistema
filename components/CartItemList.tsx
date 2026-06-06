'use client'

import { useCart, ehAPesar } from '@/contexts/CartContext'
import { formatarPreco, formatarQuantidade, passoDe } from '@/lib/format'
import { fotoDe } from '@/lib/fotos'
import { Plus, Minus, Trash2, Utensils, ShoppingCart } from 'lucide-react'

export function CartItemList() {
  const { itens, atualizarQuantidade, removerItem } = useCart()

  if (itens.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">Seu carrinho está vazio</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {itens.map((item) => {
        const passo = passoDe(item.modo)
        const pesar = ehAPesar(item)
        const foto = fotoDe(item.produto)
        return (
          <div
            key={item.produto.produto_id}
            className="bg-card rounded-xl p-3 border border-border flex gap-3 items-center"
          >
            <div className="w-12 h-12 bg-secondary/60 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
              {foto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={foto} alt={item.produto.nome} className="w-full h-full object-cover" />
              ) : (
                <Utensils className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-foreground text-sm leading-tight truncate">
                {item.produto.nome}
                {pesar && <span className="text-[11px] text-muted-foreground font-normal"> · pesado no caixa</span>}
              </h3>
              <p className="text-sm mt-0.5">
                {pesar ? (
                  <span className="text-muted-foreground font-medium">a pesar</span>
                ) : (
                  <span className="text-primary font-semibold">
                    {formatarPreco(item.produto.preco * item.quantidade)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => atualizarQuantidade(item.produto.produto_id, item.quantidade - passo)}
                className="bg-muted text-foreground rounded-full p-1.5 active:scale-95 transition"
                aria-label="Diminuir"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="min-w-[54px] text-center font-semibold text-foreground text-sm tabular-nums">
                {formatarQuantidade(item.quantidade, item.modo)}
              </span>
              <button
                onClick={() => atualizarQuantidade(item.produto.produto_id, item.quantidade + passo)}
                className="bg-muted text-foreground rounded-full p-1.5 active:scale-95 transition"
                aria-label="Aumentar"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => removerItem(item.produto.produto_id)}
                className="text-destructive rounded-full p-1.5 ml-1"
                aria-label="Remover item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
