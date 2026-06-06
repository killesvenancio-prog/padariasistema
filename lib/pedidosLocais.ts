// "Meus pedidos" — guarda no aparelho do cliente os pedidos que ELE fez,
// pra ele acompanhar o status depois (a fonte da verdade continua no banco).
'use client'

export interface PedidoLocal {
  id: number
  total: number
  modo: string
  data: string // ISO
}

const KEY = 'padaria_meus_pedidos'
const LIMITE = 20

export function salvarPedidoLocal(p: PedidoLocal): void {
  if (typeof window === 'undefined') return
  try {
    const atuais = listarPedidosLocais().filter((x) => x.id !== p.id)
    const novo = [p, ...atuais].slice(0, LIMITE)
    localStorage.setItem(KEY, JSON.stringify(novo))
    window.dispatchEvent(new Event('meus-pedidos-mudou'))
  } catch {
    /* ignora (modo privado, cota cheia etc.) */
  }
}

export function listarPedidosLocais(): PedidoLocal[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as PedidoLocal[]) : []
  } catch {
    return []
  }
}

export function removerPedidoLocal(id: number): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify(listarPedidosLocais().filter((x) => x.id !== id)))
    window.dispatchEvent(new Event('meus-pedidos-mudou'))
  } catch {
    /* ignora */
  }
}
