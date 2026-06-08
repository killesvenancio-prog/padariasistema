// Modelos de cardápio salvos no aparelho do dono.
// Ex.: "Dia de semana", "Sábado", "Dia de bolo" — aplica com 1 clique.
'use client'

export interface ModeloCardapio {
  id: string
  nome: string
  itens: { produto_id: number; quantidade: number }[]
}

const KEY = 'padaria_modelos_cardapio'

export function listarModelos(): ModeloCardapio[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? (arr as ModeloCardapio[]) : []
  } catch {
    return []
  }
}

export function salvarModelo(nome: string, itens: { produto_id: number; quantidade: number }[]): ModeloCardapio[] {
  // Sobrescreve modelo de mesmo nome (re-salvar atualiza).
  const atuais = listarModelos().filter((m) => m.nome.toLowerCase() !== nome.toLowerCase())
  const novo: ModeloCardapio = { id: `m${Date.now()}`, nome, itens }
  const lista = [novo, ...atuais]
  try {
    localStorage.setItem(KEY, JSON.stringify(lista))
  } catch {
    /* ignora */
  }
  return lista
}

export function removerModelo(id: string): ModeloCardapio[] {
  const lista = listarModelos().filter((m) => m.id !== id)
  try {
    localStorage.setItem(KEY, JSON.stringify(lista))
  } catch {
    /* ignora */
  }
  return lista
}
