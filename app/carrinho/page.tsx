import { Suspense } from 'react'
import { CartPage } from '@/components/CartPage'

export default function CarrinhoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>}>
      <CartPage />
    </Suspense>
  )
}
