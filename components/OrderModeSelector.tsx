'use client'

import type { ModoPedido } from '@/types'
import { Armchair, ShoppingBag, Bike, type LucideIcon } from 'lucide-react'

interface OrderModeSelectorProps {
  modo: ModoPedido
  onChange: (modo: ModoPedido) => void
}

const modos: { value: ModoPedido; label: string; descricao: string; icon: LucideIcon }[] = [
  { value: 'mesa', label: 'Mesa', descricao: 'Comer aqui', icon: Armchair },
  { value: 'retirada', label: 'Retirada', descricao: 'No balcão', icon: ShoppingBag },
  { value: 'entrega', label: 'Entrega', descricao: 'Em casa', icon: Bike },
]

export function OrderModeSelector({ modo, onChange }: OrderModeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {modos.map((m) => {
        const Icon = m.icon
        const ativo = modo === m.value
        return (
          <button
            key={m.value}
            onClick={() => onChange(m.value)}
            className={`flex flex-col items-center gap-1.5 px-2 py-3.5 rounded-2xl border-2 transition-all ${
              ativo
                ? 'border-primary bg-primary/10 text-primary shadow-sm'
                : 'border-border bg-card text-foreground hover:border-primary/40'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-sm font-semibold leading-none">{m.label}</span>
            <span className={`text-[11px] leading-none ${ativo ? 'text-primary/70' : 'text-muted-foreground'}`}>{m.descricao}</span>
          </button>
        )
      })}
    </div>
  )
}
