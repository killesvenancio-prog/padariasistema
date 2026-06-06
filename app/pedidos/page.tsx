import type { Metadata } from 'next'
import { MeusPedidos } from '@/components/MeusPedidos'

export const metadata: Metadata = {
  title: 'Meus pedidos',
  description: 'Acompanhe o status dos seus pedidos na Padaria Santa Cecília.',
}

export default function PedidosPage() {
  return <MeusPedidos />
}
