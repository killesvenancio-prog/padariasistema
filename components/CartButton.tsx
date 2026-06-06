'use client'

import { useCart } from '@/contexts/CartContext'
import { ShoppingBag, ChevronRight } from 'lucide-react'
import { formatarPreco } from '@/lib/format'
import Link from 'next/link'

export function CartButton() {
  const { totalItens, totalValor, temItensPesados } = useCart()

  if (totalItens === 0) return null

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-8 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
      <Link
        href="/carrinho"
        className="pointer-events-auto max-w-7xl mx-auto flex items-center justify-between gap-3 bg-primary text-primary-foreground rounded-2xl px-5 py-4 shadow-lg active:scale-[0.99] transition"
      >
        <span className="flex items-center gap-2.5">
          <ShoppingBag className="w-6 h-6" />
          <span className="font-semibold text-base">Ver meu pedido</span>
          <span className="bg-white/25 rounded-full px-2.5 py-0.5 text-sm font-bold">{totalItens}</span>
        </span>
        <span className="flex items-center gap-1 font-bold text-lg">
          {formatarPreco(totalValor)}
          {temItensPesados && '+'}
          <ChevronRight className="w-5 h-5" />
        </span>
      </Link>
    </div>
  )
}
