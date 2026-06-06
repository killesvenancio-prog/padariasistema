'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { CheckCircle2, Info, AlertCircle, X } from 'lucide-react'

type ToastTipo = 'sucesso' | 'info' | 'erro'
interface ToastData {
  id: number
  texto: string
  tipo: ToastTipo
}

interface ToastCtx {
  toast: (texto: string, tipo?: ToastTipo) => void
}

const Ctx = createContext<ToastCtx | undefined>(undefined)

let _seq = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const remover = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (texto: string, tipo: ToastTipo = 'sucesso') => {
      const id = ++_seq
      setToasts((prev) => [...prev.slice(-3), { id, texto, tipo }])
      setTimeout(() => remover(id), 3400)
    },
    [remover],
  )

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onClose={() => remover(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: ToastData; onClose: () => void }) {
  const Icon = toast.tipo === 'sucesso' ? CheckCircle2 : toast.tipo === 'erro' ? AlertCircle : Info
  const cor = toast.tipo === 'sucesso' ? 'text-green-400' : toast.tipo === 'erro' ? 'text-red-400' : 'text-sky-400'
  return (
    <div className="pointer-events-auto w-full bg-foreground text-background rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 text-sm animate-toast-in">
      <Icon className={`w-5 h-5 flex-shrink-0 ${cor}`} />
      <span className="flex-1 leading-snug font-medium">{toast.texto}</span>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity" aria-label="Fechar aviso">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx)
  // Fallback silencioso caso usado fora do provider (não deve acontecer).
  if (!ctx) return { toast: () => {} }
  return ctx
}
