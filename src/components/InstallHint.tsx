import { useInstall } from '@/features/settings/useInstall'
import './InstallHint.css'

/**
 * Invitación a instalar la app, para quien llega por un enlace compartido.
 *
 * No es un adorno: mientras la app viva sólo en una pestaña, iOS borra sus
 * datos tras unos días sin usarla. Instalada en la pantalla de inicio se libra
 * de esa limpieza. Quien acaba de llegar no tiene forma de saberlo, y es justo
 * quien más se juega.
 *
 * Se oculta sola en cuanto está instalada.
 */
export function InstallHint() {
  const install = useInstall()

  if (install.installed) return null

  return (
    <aside className="installhint">
      {install.canPrompt ? (
        <>
          <p className="installhint-text">
            Instálala en el móvil y funcionará sin conexión, como cualquier otra app.
          </p>
          <button type="button" className="installhint-cta" onClick={install.promptInstall}>
            Instalar Caudal
          </button>
        </>
      ) : (
        <p className="installhint-text">
          {install.isIos ? (
            <>
              Para tenerla siempre a mano: toca <strong>Compartir</strong> y luego{' '}
              <strong>Añadir a pantalla de inicio</strong>.
            </>
          ) : (
            <>
              Para tenerla siempre a mano, añádela a la pantalla de inicio desde el menú del
              navegador.
            </>
          )}
        </p>
      )}
    </aside>
  )
}
