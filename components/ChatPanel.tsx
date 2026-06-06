'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useCart } from '@/contexts/CartContext'
import { formatarQuantidade } from '@/lib/format'
import type { ChatMessage, Produto } from '@/types'
import { Send, Loader2 } from 'lucide-react'

interface Acao {
  produto_id: number
  quantidade: number
  modo?: 'un' | 'kg'
}
interface Finalizar {
  modo: string
  mesa_numero?: number | null
  endereco?: string | null
  cliente_nome?: string | null
  cliente_telefone?: string | null
}

export function ChatPanel({ produtos }: { produtos: Produto[] }) {
  const { itens, definirQuantidade, limparCarrinho } = useCart()
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Olá! Sou o atendente da Padaria Santa Cecília. Posso recomendar, montar e até fechar seu pedido — é só pedir, ex.: "quero 2 coxinhas e 300g de pão".' },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function executarAcoes(acoes: Acao[]): string {
    const feitos: string[] = []
    acoes.forEach((a) => {
      const p = produtos.find((x) => x.produto_id === a.produto_id)
      if (!p || !a.quantidade || a.quantidade <= 0) return
      const modo: 'un' | 'kg' = a.modo === 'kg' && p.unidade === 'kg' ? 'kg' : 'un'
      const existente = itens.find((i) => i.produto.produto_id === p.produto_id)
      const base = existente && existente.modo === modo ? existente.quantidade : 0
      definirQuantidade(p, modo, base + a.quantidade)
      feitos.push(`${formatarQuantidade(a.quantidade, modo)} de ${p.nome}`)
    })
    return feitos.length ? `Adicionei ao carrinho: ${feitos.join(', ')}.` : ''
  }

  async function finalizarPedido(d: Finalizar): Promise<string> {
    if (itens.length === 0) return 'Seu carrinho está vazio — adicione itens antes de fechar o pedido.'
    const payload = {
      modo: d.modo,
      mesa_numero: d.mesa_numero ?? null,
      endereco: d.endereco ?? null,
      cliente_nome: d.cliente_nome ?? null,
      cliente_telefone: d.cliente_telefone ?? null,
      itens: itens.map((i) => ({ produto_id: i.produto.produto_id, quantidade: i.quantidade, modo: i.modo })),
    }
    const { data, error } = await supabase.rpc('criar_pedido', { payload })
    if (error) return `Não consegui fechar o pedido: ${error.message}`
    limparCarrinho()
    // Redireciona para a página de confirmação (igual ao fluxo manual do carrinho)
    setTimeout(() => {
      router.push(`/confirmacao?pedido_id=${data.pedido_id}&total=${data.total}&status=${data.status}`)
    }, 1800)
    return `Pronto! Pedido #${data.pedido_id} confirmado! Te levo pra tela de confirmação em instantes.`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const pergunta = input.trim()
    const historico = messages.slice(-8).map((m) => ({ role: m.role, content: m.content }))
    const carrinho = itens.map((i) => ({
      nome: i.produto.nome,
      quantidade: i.quantidade,
      modo: i.modo,
      preco: i.produto.preco,
    }))
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: pergunta }])
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('chatbot', {
        body: { pergunta, historico, carrinho },
      })
      if (error) throw error
      const partes: string[] = [data?.resposta || 'Certo!']
      const acoes: Acao[] = Array.isArray(data?.acoes) ? data.acoes : []
      const conf = executarAcoes(acoes)
      if (conf) partes.push(conf)
      if (data?.finalizar) {
        const r = await finalizarPedido(data.finalizar as Finalizar)
        partes.push(r)
      }
      setMessages((prev) => [...prev, { role: 'assistant', content: partes.join('\n\n') }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Desculpe, não consegui agora. Tente de novo.' }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted text-muted-foreground rounded-2xl px-4 py-2 text-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Digitando...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex.: quero 2 coxinhas e pode fechar pra mesa 5"
            className="flex-1 bg-input border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-primary text-primary-foreground rounded-xl px-3 hover:bg-primary/90 transition-colors disabled:opacity-50"
            aria-label="Enviar"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  )
}
