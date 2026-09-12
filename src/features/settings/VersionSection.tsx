import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useToast } from '@/components/Toast'
import { db } from '@/db/db'
import './VersionSection.css'

/**
 * Qué versión se está ejecutando, y un botón para buscar una nueva.
 *
 * Existe porque "no me va el botón de actualizar" no se puede diagnosticar de
 * otra forma. El aviso de nueva versión sale solo, pero es efímero: si se
 * descarta, o si la app se abre desde el icono sin llegar a recargarse, no hay
 * nada en pantalla que diga en qué versión estás ni por qué no aparece. Esto
 * lo hace visible y comprobable.
 */
type Estado = 'quieto' | 'buscando' | 'al-dia' | 'hay-nueva' | 'sin-red'

export function VersionSection() {
  const toast = useToast()
  const [estado, setEstado] = useState<Estado>('quieto')
  const [guardados, setGuardados] = useState<number | null>(null)

  useEffect(() => {
    void db.expenses.filter((row) => row.deletedAt === 0).count().then(setGuardados)
  }, [])
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  async function buscar() {
    setEstado('buscando')
    try {
      const registration = await navigator.serviceWorker?.getRegistration()
      if (!registration) {
        // Sin service worker la app va por red y siempre es la última. Pasa al
        // abrirla en una pestaña normal antes de instalarla.
        setEstado('al-dia')
        return
      }

      await registration.update()
      // update() resuelve cuando termina de comprobar, pero la nueva versión
      // puede tardar un instante más en quedarse en espera.
      await new Promise((listo) => setTimeout(listo, 1200))

      const enEspera = Boolean(registration.waiting || registration.installing)
      setEstado(enEspera || needRefresh ? 'hay-nueva' : 'al-dia')
    } catch {
      setEstado('sin-red')
    }
  }

  const hayNueva = needRefresh || estado === 'hay-nueva'

  return (
    <section className="version">
      <h2 className="version-title">Versión</h2>

      <p className="version-id num">{__BUILD_ID__}</p>
      <p className="version-hint">
        Es la fecha de la versión que tienes instalada. Si acabas de publicar una nueva y aquí
        sigue la de antes, es que todavía no se ha actualizado.
      </p>

      <div className="version-actions">
        {hayNueva ? (
          <button
            type="button"
            className="version-primary"
            onClick={() => {
              toast.show('Actualizando…')
              void updateServiceWorker(true)
            }}
          >
            Instalar la versión nueva
          </button>
        ) : (
          <button
            type="button"
            className="version-secondary"
            onClick={() => void buscar()}
            disabled={estado === 'buscando'}
          >
            {estado === 'buscando' ? 'Buscando…' : 'Buscar actualización'}
          </button>
        )}
      </div>

      {estado === 'al-dia' && !hayNueva && (
        <p className="version-status">Ya tienes la última versión.</p>
      )}
      {estado === 'sin-red' && (
        <p className="version-status version-status--fallo">
          No he podido comprobarlo: no hay conexión, o el servidor no responde.
        </p>
      )}
      {hayNueva && (
        <p className="version-status">
          Hay una versión nueva esperando. Al instalarla la app se recarga; tus gastos no se
          tocan.
        </p>
      )}

      <Donde guardados={guardados} />
    </section>
  )
}

/**
 * Dónde está corriendo esto y cuántos gastos hay AQUÍ.
 *
 * Sirve para detectar el fallo más traicionero de una app instalable: acabar
 * con dos copias y dos bases de datos sin enterarse. Pasa por cosas
 * invisibles —entrar con «www.» delante, abrirla en otro navegador, o en
 * iPhone porque la app de la pantalla de inicio guarda aparte de Safari— y
 * nada lo avisa: las dos copias funcionan, sólo que cada una con sus datos.
 *
 * Con esto se descubre en dos toques: se abre de las dos maneras y se compara.
 * Si el número de movimientos no coincide, son dos almacenes distintos.
 */
function Donde({ guardados }: { guardados: number | null }) {
  const instalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iOS no implementa display-mode y usa su propia bandera.
    (navigator as Navigator & { standalone?: boolean }).standalone === true

  return (
    <div className="version-donde">
      <p className="version-hint">
        Estás en <strong>{instalada ? 'la app instalada' : 'el navegador'}</strong>, en{' '}
        <strong>{window.location.host}</strong>, con{' '}
        <strong>{guardados === null ? '…' : guardados}</strong>{' '}
        {guardados === 1 ? 'movimiento guardado' : 'movimientos guardados'} aquí.
      </p>
      <p className="version-hint">
        Si abres Caudal de otra manera y ese número no coincide, tienes dos copias con datos
        distintos. Quédate con una: la dirección tiene que ser siempre la misma, sin «www.» si no
        lo pusiste al instalar.
      </p>
    </div>
  )
}
