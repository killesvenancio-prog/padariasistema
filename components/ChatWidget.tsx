'use client'

import { useState } from 'react'
import { useCart } from '@/contexts/CartContext'
import { ChatPanel } from './ChatPanel'
import type { Produto } from '@/types'
import { MessageCircle, X } from 'lucide-react'

// Versão MOBILE do chat (botão flutuante + overlay). No desktop o chat fica
// encaixado na lateral (ver MenuPage), então este componente some em telas grandes.
export function ChatWidget({ produtos }: { produtos: Produto[] }) {
  const { totalItens } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const [mostrarDica, setMostrarDica] = useState(true)

  return (
    <div className="lg:hidden">
      {!isOpen && mostrarDica && (
        <div className={`fixed left-4 ${totalItens > 0 ? 'bottom-44' : 'bottom-24'} z-40 w-56 bg-card border border-border rounded-2xl shadow-xl p-3 pr-4 text-sm leading-snug`}>
          <button
            onClick={() => setMostrarDica(false)}
            className="absolute -top-2 -right-2 bg-muted border border-border rounded-full w-6 h-6 flex items-center justify-center"
            aria-label="Fechar dica"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          Posso te ajudar a <span className="font-semibold">montar seu pedido</span>! Toque em{' '}
          <span className="font-semibold text-primary">Atendente</span>.
        </div>
      )}

      <button
        onClick={() => {
          setIsOpen(!isOpen)
          setMostrarDica(false)
        }}
        className={`fixed left-4 ${totalItens > 0 ? 'bottom-28' : 'bottom-6'} bg-primary text-primary-foreground rounded-full shadow-lg z-40 flex items-center gap-2 ${isOpen ? 'p-4' : 'pl-4 pr-5 py-3.5'} ${!isOpen && mostrarDica ? 'animate-pulse' : ''}`}
        aria-label={isOpen ? 'Fechar atendente' : 'Abrir atendente'}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            <span className="font-semibold">Atendente</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 left-4 right-4 max-w-sm bg-card rounded-2xl shadow-xl border border-border z-50 flex flex-col h-[60vh]">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-foreground">Atendente da Padaria</h3>
              <p className="text-xs text-muted-foreground">Recomenda e monta seu pedido</p>
            </div>
            <button onClick={() => setIsOpen(false)} aria-label="Fechar"><X className="w-5 h-5" /></button>
          </div>
          <ChatPanel produtos={produtos} />
        </div>
      )}
    </div>
  )
}
