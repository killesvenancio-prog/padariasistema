import { Suspense } from 'react'
import { ConfirmacaoPage } from '@/components/ConfirmacaoPage'

export default function Confirmacao() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center">Carregando...</div>}>
      <ConfirmacaoPage />
    </Suspense>
  )
}
