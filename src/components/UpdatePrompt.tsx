import { useRegisterSW } from 'virtual:pwa-register/react'
import './UpdatePrompt.css'

/**
 * Aviso de nueva versión.
 *
 * El service worker se registra en modo 'prompt', no 'autoUpdate': con
 * actualización automática el navegador recarga la pestaña al desplegar y se
 * pierde el importe que el usuario estaba tecleando. Aquí decide él.
 */
const UPDATE_CHECK_MS = 60 * 60 * 1000

export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (!registration) return

      // La comprobación periódica ingenua (setInterval + update()) se atasca
      // con el servidor caído o el móvil sin red: antes se confirma que hay
      // conexión y que la URL del worker responde.
      setInterval(() => {
        void (async () => {
          if (!navigator.onLine) return
          try {
            const response = await fetch(swUrl, {
              cache: 'no-store',
              headers: { cache: 'no-store' },
            })
            if (response.status === 200) await registration.update()
          } catch {
            /* Sin red: se reintenta en el siguiente ciclo. */
          }
        })()
      }, UPDATE_CHECK_MS)
    },
  })

  if (!offlineReady && !needRefresh) return null

  return (
    <div className="update" role="status">
      <span className="update-text">
        {needRefresh ? 'Nueva versión disponible' : 'Ya funciona sin conexión'}
      </span>
      <div className="update-actions">
        {needRefresh && (
          <button type="button" className="update-primary" onClick={() => void updateServiceWorker(true)}>
            Actualizar
          </button>
        )}
        <button
          type="button"
          className="update-secondary"
          onClick={() => {
            setOfflineReady(false)
            setNeedRefresh(false)
          }}
        >
          {needRefresh ? 'Ahora no' : 'Vale'}
        </button>
      </div>
    </div>
  )
}
