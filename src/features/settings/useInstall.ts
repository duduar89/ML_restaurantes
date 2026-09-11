import { useEffect, useState } from 'react'

/**
 * Estado de instalación de la PWA.
 *
 * Instalar no es un adorno: en iOS el almacenamiento de un sitio que sólo vive
 * en una pestaña se purga tras días sin usarlo, mientras que una app añadida a
 * la pantalla de inicio se libra de esa purga. Para una app de gastos eso es
 * la diferencia entre conservar el historial o perderlo tras dos semanas de
 * vacaciones.
 *
 * Android dispara `beforeinstallprompt` y se le puede ofrecer un botón. iOS no
 * lo ha disparado nunca: allí sólo cabe explicar el gesto de Compartir.
 */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallState {
  installed: boolean
  canPrompt: boolean
  isIos: boolean
  promptInstall: () => void
}

export function useInstall(): InstallState {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const onBeforeInstall = (event: Event) => {
      event.preventDefault()
      setDeferred(event as InstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  return {
    installed,
    canPrompt: deferred !== null,
    isIos: isIosDevice(),
    promptInstall: () => {
      if (!deferred) return
      void deferred.prompt()
      setDeferred(null)
    },
  }
}

/**
 * iOS no expone `display-mode: standalone` de forma fiable en todas las
 * versiones: hay que mirar también `navigator.standalone`.
 */
function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const legacy = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return window.matchMedia('(display-mode: standalone)').matches || legacy
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false
  // En iPadOS el userAgent dice "Macintosh": el táctil es lo que lo delata.
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}
