'use client'

import type { Produto } from '@/types'
import { ProductCard } from './ProductCard'
import { iconeCategoria } from '@/lib/categorias'

interface CategorySectionProps {
  id: string
  categoria: string
  produtos: Produto[]
}

export function CategorySection({ id, categoria, produtos }: CategorySectionProps) {
  if (produtos.length === 0) return null
  const Icon = iconeCategoria(categoria)

  return (
    <section id={id} data-cat={id} className="mb-10 scroll-mt-24">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary flex-shrink-0">
          <Icon className="w-5 h-5" />
        </span>
        <h2 className="font-heading text-xl font-bold text-foreground">{categoria}</h2>
        <span className="text-xs font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">{produtos.length}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {produtos.map((produto) => (
          <ProductCard key={produto.produto_id} produto={produto} />
        ))}
      </div>
    </section>
  )
}
