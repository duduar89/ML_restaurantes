import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import './Toast.css'

interface ToastState {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

interface ToastApi {
  /** Muestra un aviso. Con `action` sirve de "deshacer" tras guardar o borrar. */
  show: (message: string, action?: ToastState['action']) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const DURATION_MS = 4800

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [visible, setVisible] = useState(false)
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const show = useCallback<ToastApi['show']>(
    (message, action) => {
      clearTimers()
      setToast({ id: performance.now(), message, action })
      setVisible(true)
      // Dos tiempos: primero se desliza fuera, y sólo después se desmonta,
      // para que la animación de salida llegue a verse.
      timers.current.push(setTimeout(() => setVisible(false), DURATION_MS))
      timers.current.push(setTimeout(() => setToast(null), DURATION_MS + 300))
    },
    [clearTimers]
  )

  useEffect(() => clearTimers, [clearTimers])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext value={api}>
      {children}
      {toast && (
        <div className={`toast ${visible ? 'toast--in' : ''}`} role="status" aria-live="polite">
          <span className="toast-message">{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                toast.action?.run()
                clearTimers()
                setVisible(false)
                timers.current.push(setTimeout(() => setToast(null), 300))
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext>
  )
}

export function useToast(): ToastApi {
  const context = use(ToastContext)
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return context
}
