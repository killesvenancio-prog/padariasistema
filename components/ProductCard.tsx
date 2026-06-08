'use client'

import { useState } from 'react'
import type { Produto } from '@/types'
import { useCart } from '@/contexts/CartContext'
import { useToast } from '@/components/Toast'
import { formatarPreco, formatarQuantidade } from '@/lib/format'
import { fotoDe } from '@/lib/fotos'
import { iconeCategoria } from '@/lib/categorias'
import { ProductModal } from './ProductModal'
import { Plus, Minus, Scale, AlertTriangle } from 'lucide-react'

const PESOS = [0.1, 0.25, 0.5, 1]

interface ProductCardProps {
  produto: Produto
}

export function ProductCard({ produto }: ProductCardProps) {
  const { itens, adicionarItem, atualizarQuantidade, definirQuantidade, removerItem } = useCart()
  const { toast } = useToast()
  const [imgErro, setImgErro] = useState(false)
  const [modalAberto, setModalAberto] = useState(false)

  const ehKg = produto.unidade === 'kg'
  const item = itens.find((i) => i.produto.produto_id === produto.produto_id)
  const [porPeso, setPorPeso] = useState(() => item?.modo === 'kg')
  const modoSel: 'un' | 'kg' = ehKg && porPeso ? 'kg' : 'un'

  const noCarrinho = item?.quantidade ?? 0
  const semEstoque = produto.quantidade <= 0
  const noCarrinhoAtivo = noCarrinho > 0
  const imgSrc = !imgErro ? fotoDe(produto) : null
  const CatIcon = iconeCategoria(produto.categoria)

  function escolherModo(peso: boolean) {
    if (item) removerItem(produto.produto_id)
    setPorPeso(peso)
  }

  return (
    <>
      <div
        className={`group bg-card border rounded-2xl p-3.5 flex gap-4 h-full shadow-sm transition-all duration-200 ${
          noCarrinhoAtivo ? 'border-primary/40 ring-1 ring-primary/15' : 'border-border'
        } hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5`}
      >
        {/* Foto (clique abre detalhes) */}
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-secondary/60 flex items-center justify-center flex-shrink-0 cursor-pointer"
          aria-label={`Ver detalhes de ${produto.nome}`}
        >
          {imgSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={produto.nome}
              onError={() => setImgErro(true)}
              loading="lazy"
              className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${semEstoque ? 'grayscale opacity-60' : ''}`}
            />
          ) : (
            <CatIcon className="w-10 h-10 text-primary/35" />
          )}
          {semEstoque && (
            <span className="absolute inset-x-0 bottom-0 bg-foreground/80 text-white text-[11px] font-semibold text-center py-1">Esgotado</span>
          )}
        </button>

        <div className="flex-1 min-w-0 flex flex-col">
          <button type="button" onClick={() => setModalAberto(true)} className="text-left cursor-pointer">
            <h3 className="font-semibold text-foreground text-base leading-snug hover:text-primary transition-colors">{produto.nome}</h3>
          </button>
          {produto.descricao && (
            <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">{produto.descricao}</p>
          )}
          <p className="font-heading font-bold text-primary text-lg mt-1">
            {ehKg ? (
              <>
                {formatarPreco(produto.preco)}
                <span className="text-sm font-semibold text-muted-foreground">/kg</span>
              </>
            ) : (
              formatarPreco(produto.preco)
            )}
          </p>

          {produto.a_verificar && (
            <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5 w-fit">
              <AlertTriangle className="w-3 h-3" /> A verificar disponibilidade
            </span>
          )}

          {/* Itens por kg: escolher como pedir (claro) */}
          {ehKg && (
            <>
              <div className="mt-2 flex w-full max-w-[280px] rounded-xl border border-border p-1 text-sm bg-secondary/40">
                <button
                  onClick={() => escolherModo(false)}
                  className={`flex-1 px-2 py-1.5 rounded-lg font-medium transition text-center ${!porPeso ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  Por unidade
                </button>
                <button
                  onClick={() => escolherModo(true)}
                  className={`flex-1 px-2 py-1.5 rounded-lg font-medium transition flex items-center justify-center gap-1 ${porPeso ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}
                >
                  <Scale className="w-4 h-4 flex-shrink-0" /> Por peso
                </button>
              </div>
              {!porPeso && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" /> será pesado no caixa
                </p>
              )}
            </>
          )}

          {/* Controles */}
          <div className="mt-3 pt-1">
            {ehKg && modoSel === 'kg' ? (
              noCarrinho === 0 ? (
                <div className="flex flex-wrap gap-2">
                  {PESOS.map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        definirQuantidade(produto, 'kg', w)
                        toast(`${produto.nome}: ${formatarQuantidade(w, 'kg')} no carrinho`)
                      }}
                      disabled={semEstoque}
                      className="text-sm border-2 border-primary/40 text-primary font-semibold rounded-xl px-3.5 py-2 hover:bg-primary hover:text-primary-foreground active:scale-95 transition disabled:opacity-40"
                    >
                      {w < 1 ? `${w * 1000}g` : `${w}kg`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button onClick={() => atualizarQuantidade(produto.produto_id, noCarrinho - 0.1)} className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center active:scale-95 transition hover:border-primary/50" aria-label="Tirar 100 gramas">
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="min-w-[72px] text-center font-bold text-lg tabular-nums">{formatarQuantidade(noCarrinho, 'kg')}</span>
                  <button onClick={() => adicionarItem(produto, 'kg')} className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition hover:bg-primary/90" aria-label="Adicionar 100 gramas">
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
                className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-5 py-2.5 text-base font-semibold hover:bg-primary/90 active:scale-95 transition disabled:opacity-40"
              >
                <Plus className="w-5 h-5" /> {semEstoque ? 'Esgotado' : 'Adicionar'}
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => atualizarQuantidade(produto.produto_id, noCarrinho - 1)} className="w-11 h-11 rounded-full border-2 border-border flex items-center justify-center active:scale-95 transition hover:border-primary/50" aria-label="Diminuir">
                  <Minus className="w-5 h-5" />
                </button>
                <span className="min-w-[64px] text-center font-bold text-lg tabular-nums">{noCarrinho} un</span>
                <button onClick={() => adicionarItem(produto, 'un')} className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-95 transition hover:bg-primary/90" aria-label="Aumentar">
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalAberto && <ProductModal produto={produto} onClose={() => setModalAberto(false)} />}
    </>
  )
}
