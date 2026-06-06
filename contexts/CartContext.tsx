'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { Produto, ItemCarrinho } from '@/types'
import { passoDe } from '@/lib/format'

const STORAGE_KEY = 'padaria_carrinho'

function round3(n: number) {
  return Math.round(n * 1000) / 1000
}

// item "a pesar": produto vendido por kg, mas o cliente pediu por unidade
export function ehAPesar(i: ItemCarrinho) {
  return i.modo === 'un' && i.produto.unidade === 'kg'
}

interface CartContextType {
  itens: ItemCarrinho[]
  adicionarItem: (produto: Produto, modo: 'un' | 'kg') => void
  definirQuantidade: (produto: Produto, modo: 'un' | 'kg', quantidade: number) => void
  removerItem: (produtoId: number) => void
  atualizarQuantidade: (produtoId: number, quantidade: number) => void
  limparCarrinho: () => void
  totalItens: number
  totalValor: number
  temItensPesados: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [hidratado, setHidratado] = useState(false)

  // Carrega o carrinho salvo no aparelho (não some ao recarregar a página).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) setItens(arr as ItemCarrinho[])
      }
    } catch {
      /* ignora */
    }
    setHidratado(true)
  }, [])

  // Salva sempre que o carrinho muda (só depois de hidratar, pra não apagar o salvo).
  useEffect(() => {
    if (!hidratado) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itens))
    } catch {
      /* ignora */
    }
  }, [itens, hidratado])

  const adicionarItem = useCallback((produto: Produto, modo: 'un' | 'kg') => {
    const passo = passoDe(modo)
    setItens((prev) => {
      const ex = prev.find((i) => i.produto.produto_id === produto.produto_id)
      if (ex) {
        return prev.map((i) =>
          i.produto.produto_id === produto.produto_id
            ? { ...i, quantidade: round3(i.quantidade + passo), modo }
            : i
        )
      }
      return [...prev, { produto, quantidade: passo, modo }]
    })
  }, [])

  const definirQuantidade = useCallback(
    (produto: Produto, modo: 'un' | 'kg', quantidade: number) => {
      const q = round3(quantidade)
      setItens((prev) => {
        if (q <= 0) return prev.filter((i) => i.produto.produto_id !== produto.produto_id)
        const ex = prev.find((i) => i.produto.produto_id === produto.produto_id)
        if (ex) {
          return prev.map((i) =>
            i.produto.produto_id === produto.produto_id ? { ...i, quantidade: q, modo } : i
          )
        }
        return [...prev, { produto, quantidade: q, modo }]
      })
    },
    []
  )

  const removerItem = useCallback((produtoId: number) => {
    setItens((prev) => prev.filter((i) => i.produto.produto_id !== produtoId))
  }, [])

  const atualizarQuantidade = useCallback((produtoId: number, quantidade: number) => {
    const q = round3(quantidade)
    setItens((prev) =>
      q <= 0
        ? prev.filter((i) => i.produto.produto_id !== produtoId)
        : prev.map((i) => (i.produto.produto_id === produtoId ? { ...i, quantidade: q } : i))
    )
  }, [])

  const limparCarrinho = useCallback(() => setItens([]), [])

  // selo do carrinho: conta unidades (un) e cada item por peso vale 1 — sempre inteiro
  const totalItens = itens.reduce((acc, i) => acc + (i.modo === 'un' ? i.quantidade : 1), 0)
  // total firme: itens "a pesar" não entram (valor sai na pesagem)
  const totalValor = itens.reduce(
    (acc, i) => acc + (ehAPesar(i) ? 0 : i.produto.preco * i.quantidade),
    0
  )
  const temItensPesados = itens.some(ehAPesar)

  return (
    <CartContext.Provider
      value={{
        itens,
        adicionarItem,
        definirQuantidade,
        removerItem,
        atualizarQuantidade,
        limparCarrinho,
        totalItens,
        totalValor,
        temItensPesados,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
