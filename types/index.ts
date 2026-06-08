export interface Produto {
  produto_id: number
  nome: string
  descricao: string | null
  preco: number
  categoria: string
  emoji: string | null
  foto_url: string | null
  unidade: 'un' | 'kg'
  quantidade: number
  a_verificar?: boolean
}

export interface ItemCarrinho {
  produto: Produto
  quantidade: number
  modo: 'un' | 'kg'
}

export type ModoPedido = 'mesa' | 'retirada' | 'entrega'

export interface PedidoPayload {
  modo: ModoPedido
  mesa_numero?: number | null
  endereco?: string | null
  cliente_nome?: string | null
  cliente_telefone?: string | null
  observacao?: string | null
  itens: { produto_id: number; quantidade: number; modo: 'un' | 'kg' }[]
}

export interface PedidoResponse {
  pedido_id: number
  total: number
  status: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}
