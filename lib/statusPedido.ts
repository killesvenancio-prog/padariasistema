import { CheckCircle2, ChefHat, ConciergeBell, type LucideIcon } from 'lucide-react'

// Rótulos amigáveis de cada status do pedido.
export const STATUS_LABEL: Record<string, string> = {
  recebido: 'Recebido',
  preparando: 'Em preparo',
  pronto: 'Pronto',
  entregue: 'Concluído',
  cancelado: 'Cancelado',
}

// Cores do "selo" de status (mesmo vocabulário do admin).
export function corStatus(s: string): string {
  if (s === 'recebido') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (s === 'preparando') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (s === 'pronto') return 'bg-green-100 text-green-800 border-green-200'
  if (s === 'entregue') return 'bg-muted text-muted-foreground border-border'
  return 'bg-red-100 text-red-800 border-red-200'
}

// Os 3 passos visíveis da linha do tempo do cliente.
export const PASSOS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'recebido', label: 'Recebido', icon: CheckCircle2 },
  { key: 'preparando', label: 'Em preparo', icon: ChefHat },
  { key: 'pronto', label: 'Pronto', icon: ConciergeBell },
]

// Em qual passo o pedido está (entregue = todos completos; cancelado = -1).
export function indiceStatus(status: string): number {
  if (status === 'cancelado') return -1
  if (status === 'entregue' || status === 'pronto') return PASSOS.length - 1
  return PASSOS.findIndex((p) => p.key === status)
}
