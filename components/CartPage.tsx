'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/contexts/CartContext'
import { formatarPreco } from '@/lib/format'
import type { ModoPedido, PedidoPayload, PedidoResponse } from '@/types'
import { CartItemList } from './CartItemList'
import { OrderModeSelector } from './OrderModeSelector'
import { salvarPedidoLocal } from '@/lib/pedidosLocais'
import { ArrowLeft, Loader2, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

export function CartPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { itens, totalItens, totalValor, temItensPesados, limparCarrinho } = useCart()

  const [modo, setModo] = useState<ModoPedido>('mesa')
  const [mesaNumero, setMesaNumero] = useState('')
  const [endereco, setEndereco] = useState('')
  const [clienteNome, setClienteNome] = useState('')
  const [clienteTelefone, setClienteTelefone] = useState('')
  const [observacao, setObservacao] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const mesaParam = searchParams.get('mesa')
    if (mesaParam) {
      setMesaNumero(mesaParam)
      setModo('mesa')
    }
  }, [searchParams])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError(null)

    if (itens.length === 0) {
      setError('Adicione itens ao carrinho antes de fazer o pedido.')
      return
    }
    if (modo === 'mesa' && !mesaNumero) {
      setError('Informe o número da mesa.')
      return
    }
    if (modo === 'entrega' && !endereco.trim()) {
      setError('Informe o endereço de entrega.')
      return
    }

    setIsLoading(true)

    const payload: PedidoPayload = {
      modo,
      mesa_numero: modo === 'mesa' ? parseInt(mesaNumero) : null,
      endereco: modo === 'entrega' ? endereco.trim() : null,
      cliente_nome: clienteNome.trim() || null,
      cliente_telefone: clienteTelefone.trim() || null,
      observacao: observacao.trim() || null,
      itens: itens.map((item) => ({
        produto_id: item.produto.produto_id,
        quantidade: item.quantidade,
        modo: item.modo,
      })),
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('criar_pedido', { payload })
      if (rpcError) throw new Error(rpcError.message)
      const response = data as PedidoResponse
      salvarPedidoLocal({
        id: response.pedido_id,
        total: Number(response.total),
        modo,
        data: new Date().toISOString(),
      })
      limparCarrinho()
      router.push(`/confirmacao?pedido_id=${response.pedido_id}&total=${response.total}&status=${response.status}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const vazio = itens.length === 0

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-foreground hover:text-primary transition-colors" aria-label="Voltar ao cardápio">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-none">Seu pedido</h1>
            <p className="text-xs text-muted-foreground mt-1">Padaria Santa Cecília</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 pb-32 lg:pb-10">
        {vazio ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-medium">Seu carrinho está vazio</p>
            <p className="text-muted-foreground text-sm mt-1">Que tal escolher algo fresquinho?</p>
            <Link href="/" className="inline-block mt-5 bg-primary text-primary-foreground font-semibold px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-colors">
              Ver cardápio
            </Link>
          </div>
        ) : (
          <div className="lg:grid lg:grid-cols-[1fr_350px] lg:gap-6 lg:items-start">
            {/* Coluna esquerda: itens + dados */}
            <div className="space-y-8">
              <section>
                <h2 className="font-heading font-bold text-foreground mb-3">Itens</h2>
                <CartItemList />
              </section>

              <form onSubmit={handleSubmit} className="space-y-6">
                <section>
                  <h2 className="font-heading font-bold text-foreground mb-3">Como deseja receber?</h2>
                  <OrderModeSelector modo={modo} onChange={setModo} />
                </section>

                {modo === 'mesa' && (
                  <div>
                    <label htmlFor="mesa" className="block text-sm font-medium text-foreground mb-2">Número da mesa *</label>
                    <input
                      type="number" id="mesa" value={mesaNumero} onChange={(e) => setMesaNumero(e.target.value)} placeholder="Ex: 5" min="1"
                      className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}

                {modo === 'entrega' && (
                  <div>
                    <label htmlFor="endereco" className="block text-sm font-medium text-foreground mb-2">Endereço de entrega *</label>
                    <textarea
                      id="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, bairro, complemento..." rows={3}
                      className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label htmlFor="nome" className="block text-sm font-medium text-foreground mb-2">Seu nome (opcional)</label>
                    <input
                      type="text" id="nome" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Como podemos te chamar?"
                      className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="telefone" className="block text-sm font-medium text-foreground mb-2">Telefone (opcional)</label>
                    <input
                      type="tel" id="telefone" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} placeholder="(51) 99999-9999"
                      className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label htmlFor="observacao" className="block text-sm font-medium text-foreground mb-2">Observação (opcional)</label>
                    <textarea
                      id="observacao" value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Alguma observação especial?" rows={2}
                      className="w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3 text-sm">{error}</div>
                )}
              </form>
            </div>

            {/* Coluna direita: resumo fixo (desktop) */}
            <aside className="hidden lg:block">
              <div className="sticky top-24 bg-card border border-border rounded-2xl p-5 shadow-sm">
                <h2 className="font-heading font-bold text-foreground text-lg mb-4">Resumo</h2>
                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Itens</span><span className="font-medium text-foreground">{totalItens}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium text-foreground">{formatarPreco(totalValor)}</span></div>
                  {temItensPesados && <p className="text-xs text-muted-foreground leading-snug">+ itens vendidos por peso entram no valor da pesagem no caixa.</p>}
                </div>
                <div className="border-t border-border my-4" />
                <div className="flex justify-between items-baseline mb-4">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-2xl font-bold text-primary">{formatarPreco(totalValor)}{temItensPesados && <span className="text-base">+</span>}</span>
                </div>
                <button
                  onClick={handleSubmit} disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>) : 'Fazer pedido'}
                </button>
                <Link href="/" className="block text-center text-sm text-muted-foreground mt-3 hover:text-primary transition-colors">Adicionar mais itens</Link>
              </div>
            </aside>
          </div>
        )}
      </main>

      {/* Barra inferior fixa (mobile) */}
      {!vazio && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-30">
          <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-primary">{formatarPreco(totalValor)}{temItensPesados && '+'}</p>
              {temItensPesados && <p className="text-[11px] text-muted-foreground leading-tight">+ itens pesados no caixa</p>}
            </div>
            <button
              onClick={handleSubmit} disabled={isLoading}
              className="flex-1 max-w-xs bg-primary text-primary-foreground font-semibold py-3 px-6 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (<><Loader2 className="w-5 h-5 animate-spin" /> Enviando...</>) : 'Fazer pedido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
