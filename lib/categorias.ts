import {
  Croissant, CakeSlice, ChefHat, CupSoda, Cookie, Candy, Snowflake,
  ShoppingBasket, Wine, Cigarette, Utensils, type LucideIcon,
} from 'lucide-react'

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
  'Pães': Croissant,
  'Confeitaria': CakeSlice,
  'Doces': CakeSlice,
  'Doces coloniais': Candy,
  'Chocolates': Cookie,
  'Salgados': ChefHat,
  'Salgadinhos': Cookie,
  'Congelados': Snowflake,
  'Mercearia': ShoppingBasket,
  'Bebidas': CupSoda,
  'Vinhos': Wine,
  'Cigarros': Cigarette,
}

export function iconeCategoria(c: string): LucideIcon {
  return ICONES[c] ?? Utensils
}
