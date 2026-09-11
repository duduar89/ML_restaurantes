import { useMemo, useState } from 'react'
import { useToast } from '@/components/Toast'
import './AutomationGuide.css'

/**
 * La respuesta honesta a "¿se puede volcar solo cada pago con tarjeta?".
 *
 * Conviene que esté DENTRO de la app y no sólo en un documento, porque es la
 * pregunta que se vuelve a hacer cada pocos meses. El resumen: una página web
 * no puede enterarse de un pago sin contacto —ni la web ni ninguna app de
 * terceros pueden—, pero sí puede recibir lo que una automatización del propio
 * teléfono le mande en cuanto el banco avisa. Eso es lo que se configura aquí.
 */
export function AutomationGuide() {
  const toast = useToast()
  const [platform, setPlatform] = useState<'ios' | 'android'>(() =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android'
  )

  const endpoint = useMemo(() => {
    const base = new URL(import.meta.env.BASE_URL, window.location.origin)
    return `${base.href.replace(/\/$/, '')}/add`
  }, [])

  const example = `${endpoint}?importe=12,50&concepto=Mercadona&auto=1`

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      toast.show('Copiado')
    } catch {
      toast.show('No se ha podido copiar; selecciónalo a mano')
    }
  }

  return (
    <section className="guide">
      <h2 className="guide-title">Volcar los pagos con tarjeta</h2>

      <div className="guide-truth">
        <p>
          <strong>Lo que no se puede:</strong> una página web no puede enterarse de que has
          acercado la tarjeta al datáfono. El pago lo ejecuta el chip seguro del móvil o la propia
          tarjeta, y ningún programa ajeno —web o nativo— puede observarlo. Si pagas con la tarjeta
          física, el teléfono ni se entera.
        </p>
        <p>
          <strong>Lo que sí se puede:</strong> tu banco te manda un aviso al móvil por cada cargo.
          Una automatización del propio teléfono puede leer ese aviso y mandárselo a Caudal. Así el
          efectivo es, de verdad, lo único que tienes que apuntar a mano.
        </p>
      </div>

      <div className="guide-tabs">
        <button
          type="button"
          className={`guide-tab ${platform === 'ios' ? 'guide-tab--active' : ''}`}
          onClick={() => setPlatform('ios')}
        >
          iPhone
        </button>
        <button
          type="button"
          className={`guide-tab ${platform === 'android' ? 'guide-tab--active' : ''}`}
          onClick={() => setPlatform('android')}
        >
          Android
        </button>
      </div>

      {platform === 'ios' ? (
        <ol className="guide-steps">
          <li>
            Abre <strong>Atajos</strong> › pestaña <strong>Automatización</strong> ›{' '}
            <strong>Nueva automatización</strong>.
          </li>
          <li>
            Elige el disparador <strong>Cartera</strong> (en iOS 18 y anteriores se llama{' '}
            <strong>Transacción</strong>) y selecciona tu tarjeta.
          </li>
          <li>
            Marca <strong>Ejecutar inmediatamente</strong> y desactiva <strong>Avisar</strong>, o
            tendrás que confirmar cada compra.
          </li>
          <li>
            Añade la acción <strong>Abrir URL</strong> —<em>no</em> «Obtener contenido de la
            URL»— con esta dirección, sustituyendo el importe y el concepto por las variables del
            disparador:
          </li>
        </ol>
      ) : (
        <ol className="guide-steps">
          <li>
            Instala <strong>MacroDroid</strong> (o Tasker) y dale permiso de acceso a las
            notificaciones.
          </li>
          <li>
            Crea una macro con el disparador <strong>Notificación recibida</strong>, filtrada por
            la app de tu banco.
          </li>
          <li>
            Extrae el importe del texto del aviso con una expresión regular y guárdalo en una
            variable.
          </li>
          <li>
            Añade la acción <strong>Abrir sitio web</strong> —<em>no</em> «Petición HTTP»— con
            esta dirección, metiendo la variable en el importe:
          </li>
        </ol>
      )}

      <button type="button" className="guide-code" onClick={() => void copy(example)}>
        <code>{example}</code>
        <span className="guide-copy">Copiar</span>
      </button>

      <details className="guide-details">
        <summary>Parámetros que acepta</summary>
        <ul className="guide-params">
          <li>
            <code>importe</code> — obligatorio. Admite <code>12,50</code> y <code>12.50</code>.
          </li>
          <li>
            <code>concepto</code> — el comercio. Si no viene, se intenta sacar del texto.
          </li>
          <li>
            <code>fecha</code> — <code>AAAA-MM-DD</code>. Si falta, hoy.
          </li>
          <li>
            <code>metodo</code> — por ejemplo <code>tarjeta</code> o <code>efectivo</code>.
          </li>
          <li>
            <code>apartado</code> — el nombre del apartado al que mandarlo.
          </li>
          <li>
            <code>auto=1</code> — guarda sin preguntar. Sin él, verás una pantalla de confirmación
            con un solo botón.
          </li>
          <li>
            <code>id</code> — identificador del movimiento en tu banco, si lo tienes. Evita
            duplicados mejor que nada.
          </li>
        </ul>
      </details>

      <div className="guide-note">
        <p>
          <strong>Tiene que ser «abrir la URL», no una petición HTTP.</strong> Caudal vive entero
          en tu móvil: no hay ningún servidor detrás que reciba peticiones. Una acción de tipo
          «petición HTTP» saldría a internet y no llegaría nunca a la app. Al abrir la dirección,
          en cambio, se abre Caudal y el gasto entra. El precio es que la app aparece un segundo
          en pantalla con cada cargo; con <code>auto=1</code> guarda sola y puedes volver atrás.
        </p>
      </div>

      <div className="guide-caveats">
        <p className="guide-caveats-title">Antes de fiarte del todo</p>
        <ul>
          <li>
            En iPhone el disparador sólo salta con <strong>Apple Pay en tienda</strong>: ni compras
            por internet, ni recibos, ni transferencias, ni Bizum. Y Apple arrastra fallos
            documentados de tiempo de espera cuando el banco tarda en avisar.
          </li>
          <li>
            En Android, si el banco cambia el texto del aviso, la expresión regular deja de casar y
            no verás nada hasta fin de mes. Repasa los totales de vez en cuando.
          </li>
          <li>
            Caudal no duplica: si el mismo movimiento llega dos veces, o ya lo habías apuntado a
            mano, te lo dice en vez de sumarlo otra vez.
          </li>
          <li>
            Para tenerlo todo sin depender de avisos, importa el extracto en{' '}
            <strong>Norma 43</strong> desde la banca electrónica. Es un par de toques al mes y no se
            deja nada.
          </li>
        </ul>
      </div>
    </section>
  )
}
