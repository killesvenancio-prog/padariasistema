'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatarPreco } from '@/lib/format'
import { STATUS_LABEL, corStatus, PASSOS, indiceStatus } from '@/lib/statusPedido'
import { Loader2, XCircle } from 'lucide-react'

export interface ItemPedidoStatus {
  nome: string
  quantidade: number
  preco_unitario: number
}
export interface PedidoStatus {
  pedido_id: number
  status: string
  modo: string
  mesa_numero: number | null
  total: number
  created_at: string
  itens: ItemPedidoStatus[]
}

const TERMINAIS = ['entregue', 'cancelado']

// Hook: busca o status de um pedido e atualiza sozinho (a cada 12s)
// enquanto o pedido não estiver finalizado.
export function usePedidoStatus(id: number | null) {
  const [pedido, setPedido] = useState<PedidoStatus | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const statusRef = useRef('')

  const carregar = useCallback(async () => {
    if (id == null) return
    const { data, error } = await supabase.rpc('acompanhar_pedido', { p_id: id })
    if (error) {
      setErro(error.message)
      setCarregando(false)
      return
    }
    const p = data as PedidoStatus
    statusRef.current = p.status
    setPedido(p)
    setErro(null)
    setCarregando(false)
  }, [id])

  useEffect(() => {
    if (id == null) return
    carregar()
    const t = setInterval(() => {
      if (TERMINAIS.includes(statusRef.current)) return
      carregar()
    }, 12000)
    const onFoco = () => {
      if (!TERMINAIS.includes(statusRef.current)) carregar()
    }
    window.addEventListener('focus', onFoco)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', onFoco)
    }
  }, [id, carregar])

  return { pedido, erro, carregando, recarregar: carregar }
}

// Linha do tempo (3 passos) do pedido.
export function LinhaTempo({ status }: { status: string }) {
  const idx = indiceStatus(status)
  if (status === 'cancelado') {
    return (
      <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-xl px-4 py-3 text-sm font-medium">
        <XCircle className="w-5 h-5" /> Este pedido foi cancelado.
      </div>
    )
  }
  return (
    <div className="flex items-center justify-between gap-1">
      {PASSOS.map((p, i) => {
        const feito = i <= idx
        const Icon = p.icon
        return (
          <div key={p.key} className="contents">
            <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
              <span
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  feito ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5" />
              </span>
              <span className={`text-[11px] leading-tight ${feito ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {p.label}
              </span>
            </div>
            {i < PASSOS.length - 1 && (
              <div className={`h-0.5 w-6 sm:w-10 rounded-full transition-colors ${i < idx ? 'bg-primary' : 'bg-border'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Componente completo de acompanhamento (usado na confirmação).
// Mostra a linha do tempo mesmo se a função do banco ainda não existir
// (cai pro statusInicial); quando o SQL está no ar, fica ao vivo.
export function StatusPedido({ id, statusInicial = 'recebido' }: { id: number; statusInicial?: string }) {
  const { pedido, carregando } = usePedidoStatus(id)
  const status = pedido?.status ?? statusInicial

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-center">
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${corStatus(status)}`}>
          {STATUS_LABEL[status] ?? status}
        </span>
      </div>

      <LinhaTempo status={status} />

      {pedido && pedido.itens.length > 0 && (
        <ul className="text-sm space-y-1 bg-secondary/50 rounded-xl p-3">
          {pedido.itens.map((it, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span className="text-foreground">{it.quantidade}× {it.nome}</span>
              <span className="text-muted-foreground tabular-nums">{formatarPreco(it.preco_unitario * it.quantidade)}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-center text-muted-foreground flex items-center justify-center gap-1.5">
        {carregando && !pedido && <Loader2 className="w-3 h-3 animate-spin" />}
        O status atualiza sozinho — pode fechar e voltar depois.
      </p>
    </div>
  )
}
