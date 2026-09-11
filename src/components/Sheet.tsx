import { useEffect, useRef, useState, type ReactNode } from 'react'
import './Sheet.css'

/**
 * Hoja inferior sobre <dialog> nativo. El elemento nativo da gratis la capa
 * superior, el atrapado del foco, el fondo inerte y el cierre con Esc: nada de
 * eso hay que escribirlo ni depender de una librería de focus-trap.
 *
 * Además apila una entrada en el historial al abrirse. Sin ella, el botón
 * atrás de Android y el deslizar desde el borde en iOS —que el usuario va a
 * probar de inmediato— cerrarían la aplicación entera en vez de la hoja.
 *
 * La animación es CSS (@starting-style + allow-discrete) y el arrastre son
 * eventos de puntero: ninguna librería de animación en el paquete.
 */
const DISMISS_DISTANCE_PX = 110
const DISMISS_VELOCITY = 0.55 // px por ms

export function Sheet({
  open,
  onClose,
  title,
  children,
  full = false,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  full?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dragStart = useRef<{ y: number; time: number } | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Abrir y cerrar el <dialog> siguiendo al estado de React.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
    if (!open) setDragY(0)
  }, [open])

  // Esc y el cierre nativo tienen que pasar por onClose para que React siga
  // siendo la única fuente de verdad del estado "abierta".
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    const onNativeClose = () => {
      if (open) onClose()
    }

    dialog.addEventListener('cancel', onCancel)
    dialog.addEventListener('close', onNativeClose)
    return () => {
      dialog.removeEventListener('cancel', onCancel)
      dialog.removeEventListener('close', onNativeClose)
    }
  }, [open, onClose])

  // Entrada de historial: el gesto de "atrás" cierra la hoja, no la app.
  useEffect(() => {
    if (!open) return

    history.pushState({ sheet: true }, '')
    const onPopState = () => onClose()
    window.addEventListener('popstate', onPopState)

    return () => {
      window.removeEventListener('popstate', onPopState)
      // Si se cerró con el botón (y no con "atrás"), la entrada sigue en la
      // pila y hay que retirarla para no dejar un "atrás" fantasma.
      if (history.state?.sheet) history.back()
    }
  }, [open, onClose])

  function onPointerDown(event: React.PointerEvent) {
    dragStart.current = { y: event.clientY, time: performance.now() }
    setDragging(true)
  }

  function onPointerMove(event: React.PointerEvent) {
    if (!dragStart.current) return
    // Sólo hacia abajo: tirar hacia arriba no debe despegar la hoja.
    setDragY(Math.max(0, event.clientY - dragStart.current.y))
  }

  function onPointerUp(event: React.PointerEvent) {
    const start = dragStart.current
    dragStart.current = null
    setDragging(false)
    if (!start) return

    const distance = event.clientY - start.y
    const velocity = distance / Math.max(1, performance.now() - start.time)
    // Por distancia O por velocidad: un golpe corto y rápido también cierra.
    if (distance > DISMISS_DISTANCE_PX || velocity > DISMISS_VELOCITY) onClose()
    setDragY(0)
  }

  return (
    <dialog
      ref={dialogRef}
      className={`sheet ${full ? 'sheet--full' : ''} ${dragging ? 'sheet--dragging' : ''}`}
      aria-label={title}
      style={dragY ? { translate: `0 ${dragY}px` } : undefined}
      // Pulsar el fondo cierra: en un <dialog>, el clic sobre ::backdrop tiene
      // como destino el propio diálogo, nunca su contenido.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose()
      }}
    >
      <div
        className="sheet-handle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="sheet-grabber" aria-hidden="true" />
        {title && <h2 className="sheet-title">{title}</h2>}
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  )
}
