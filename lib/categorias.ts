import { Croissant, CakeSlice, ChefHat, CupSoda, Utensils, type LucideIcon } from 'lucide-react'

// "Pães" -> "cat-paes" (sem acento/espaço) — usado como id de seção e âncora
export function slugCategoria(c: string): string {
  return (
    'cat-' +
    c
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .replace(/(^-|-$)/g, '')
  )
}

const ICONES: Record<string, LucideIcon> = {
  Pães: Croissant,
  Doces: CakeSlice,
  Salgados: ChefHat,
  Bebidas: CupSoda,
}

export function iconeCategoria(c: string): LucideIcon {
  return ICONES[c] ?? Utensils
}
