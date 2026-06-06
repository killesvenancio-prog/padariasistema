'use client'

import { useState, useEffect } from 'react'
import type { Produto } from '@/types'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/Toast'
import { formatarPreco, formatarQuantidade } from '@/lib/format'
import { fotoDe } from '@/lib/fotos'
import { iconeCategoria } from '@/lib/categorias'
import { X, Plus, Minus, Scale } from 'lucide-react'

const PESOS = [0.1, 0.25, 0.5, 1]

export function ProductModal({ produto, onClose }: { produto: Produto; onClose: () => void }) {
  const { itens, adicionarItem, atualizarQuantidade, definirQuantidade, removerItem } = useCart()
  const { toast } = useToast()
  const [imgErro, setImgErro] = useState(false)

  const ehKg = produto.unidade === 'kg'
  const item = itens.find((i) => i.produto.produto_id === produto.produto_id)
  const [porPeso, setPorPeso] = useState(() => item?.modo === 'kg')
  const modoSel: 'un' | 'kg' = ehKg && porPeso ? 'kg' : 'un'
  const noCarrinho = item?.quantidade ?? 0
  const semEstoque = produto.quantidade <= 0
  const imgSrc = !imgErro ? fotoDe(produto) : null
  const CatIcon = iconeCategoria(produto.categoria)

  // Fecha com ESC e trava o scroll do fundo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function escolherModo(peso: boolean) {
    if (item) removerItem(produto.produto_id)
    setPorPeso(peso)
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto animate-sheet-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Foto grande */}
        <div className="relative h-56 sm:h-64 bg-secondary/60 flex items-center justify-center">
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={produto.nome}
              onError={() => setImgErro(true)}
              className={`w-full h-full object-cover ${semEstoque ? 'grayscale opacity-70' : ''}`}
            />
          ) : (
            <CatIcon className="w-16 h-16 text-primary/30" />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          {semEstoque && (
            <span className="absolute bottom-3 left-3 bg-foreground/85 text-white text-xs font-semibold px-3 py-1 rounded-full">Esgotado por hoje</span>
          )}
        </div>

        <div className="p-5 sm:p-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 rounded-full px-2.5 py-1">
            <CatIcon className="w-3.5 h-3.5" /> {produto.categoria}
          </span>
          <h2 className="font-heading text-2xl font-bold text-foreground mt-3">{produto.nome}</h2>
          {produto.descricao && <p className="text-muted-foreground mt-1.5 leading-relaxed">{produto.descricao}</p>}

          <p className="font-heading font-bold text-primary text-2xl mt-4">
            {ehKg ? (
              <>
                {formatarPreco(produto.preco)}
                <span className="text-base font-semibold text-muted-foreground">/kg</span>
              </>
            ) : (
              formatarPreco(produto.preco)
            )}
          </p>

          {/* Como pedir (kg) */}
          {ehKg && (
            <div className="mt-4 flex w-full rounded-xl border border-border p-1 text-sm bg-secondary/40">
              <button
                onClick={() => escolherModo(false)}
                className={`flex-1 px-2 py-2 rounded-lg font-medium transition ${!porPeso ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                Por unidade
              </button>
              <button
                onClick={() => escolherModo(true)}
                className={`flex-1 px-2 py-2 rounded-lg font-medium transition flex items-center justify-center gap-1 ${porPeso ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Scale className="w-4 h-4" /> Por peso
              </button>
            </div>
          )}
          {ehKg && !porPeso && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5" /> será pesado no caixa
            </p>
          )}

          {/* Controles */}
          <div className="mt-5">
            {ehKg && modoSel === 'kg' ? (
              noCarrinho === 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {PESOS.map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        definirQuantidade(produto, 'kg', w)
                        toast(`${produto.nome}: ${formatarQuantidade(w, 'kg')} no carrinho`)
                      }}
                      disabled={semEstoque}
                      className="text-sm border-2 border-primary/40 text-primary font-semibold rounded-xl py-2.5 hover:bg-primary hover:text-primary-foreground active:scale-95 transition disabled:opacity-40"
                    >
                      {w < 1 ? `${w * 1000}g` : `${w}kg`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => atualizarQuantidade(produto.produto_id, noCarrinho - 0.1)} className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center active:scale-95 transition hover:border-primary/50" aria-label="Tirar 100 gramas">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="min-w-[90px] text-center font-bold text-xl tabular-nums">{formatarQuantidade(noCarrinho, 'kg')}</span>
                  <button onClick={() => adicionarItem(produto, 'kg')} className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition hover:bg-primary/90" aria-label="Adicionar 100 gramas">
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              )
            ) : noCarrinho === 0 ? (
              <button
                onClick={() => {
                  adicionarItem(produto, 'un')
                  toast(`${produto.nome} adicionado ao carrinho`)
                }}
                disabled={semEstoque}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3.5 text-base font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-40"
              >
                <Plus className="w-5 h-5" /> {semEstoque ? 'Esgotado' : 'Adicionar ao carrinho'}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-4">
                <button onClick={() => atualizarQuantidade(produto.produto_id, noCarrinho - 1)} className="w-12 h-12 rounded-full border-2 border-border flex items-center justify-center active:scale-95 transition hover:border-primary/50" aria-label="Diminuir">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="min-w-[80px] text-center font-bold text-xl tabular-nums">{noCarrinho} un</span>
                <button onClick={() => adicionarItem(produto, 'un')} className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition hover:bg-primary/90" aria-label="Aumentar">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
