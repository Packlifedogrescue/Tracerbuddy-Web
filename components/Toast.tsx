'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; message: string; type: ToastType }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void }

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const icons = {
    success: <path d="M4 10L8 14L16 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>,
    error:   <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>,
    info:    <><circle cx="10" cy="10" r="1.5" fill="currentColor"/><path d="M10 13v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
  }
  const colors = {
    success: 'bg-[#0D2818] text-[#F5EFE0] border-white/10',
    error:   'bg-red-700 text-white border-red-600/40',
    info:    'bg-[#1A1A1A] text-[#F5EFE0] border-white/10',
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-[13.5px] font-medium pointer-events-auto animate-in slide-in-from-bottom-4 fade-in duration-300 ${colors[t.type]}`}
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="shrink-0">{icons[t.type]}</svg>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() { return useContext(ToastContext) }
