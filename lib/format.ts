export function formatarPreco(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// "R$ 15,90/kg" para peso, "R$ 7,50" para unidade
export function precoLabel(preco: number, unidade: string): string {
  return unidade === 'kg' ? `${formatarPreco(preco)}/kg` : formatarPreco(preco)
}

// "2 un" | "300 g" | "1,2 kg"
export function formatarQuantidade(qtd: number, unidade: string): string {
  if (unidade === 'kg') {
    if (qtd < 1) return `${Math.round(qtd * 1000)} g`
    return `${qtd.toLocaleString('pt-BR', { maximumFractionDigits: 3 })} kg`
  }
  return `${qtd} un`
}

// passo de incremento: 1 unidade ou 0,1 kg (100 g)
export function passoDe(unidade: string): number {
  return unidade === 'kg' ? 0.1 : 1
}
