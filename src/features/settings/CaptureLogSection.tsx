import { useCallback, useEffect, useState } from 'react'
import { useToast } from '@/components/Toast'
import { clearCaptures, recentCaptures } from '@/db/repo'
import { formatMoney } from '@/lib/money'
import type { CaptureLog, CaptureOutcome } from '@/db/types'
import './CaptureLogSection.css'

/**
 * Lo que ha llegado por el enlace de las automatizaciones, con su resultado.
 *
 * Es la única forma de saber si la cadena entera funciona. Sin esto, el modo
 * de fallo es mudo: la macro dispara, Caudal no entiende el aviso, la pantalla
 * que lo explica sale con el móvil en el bolsillo y el gasto no aparece. No
 * hay error, no hay aviso, y sólo se descubre descuadrando el mes.
 *
 * Enseña el texto literal del aviso a propósito: es lo que hace falta para
 * arreglar el reconocimiento de un banco concreto, y no se puede reconstruir
 * después.
 */
const ETIQUETAS: Record<CaptureOutcome, { texto: string; tono: string }> = {
  saved: { texto: 'Apuntado', tono: 'ok' },
  pending: { texto: 'Esperando confirmación', tono: 'info' },
  duplicate: { texto: 'Ya estaba', tono: 'info' },
  discarded: { texto: 'Descartado a propósito', tono: 'info' },
  unreadable: { texto: 'No se pudo leer', tono: 'fallo' },
}

export function CaptureLogSection() {
  const toast = useToast()
  const [rows, setRows] = useState<CaptureLog[] | null>(null)

  const load = useCallback(() => {
    void recentCaptures(20).then(setRows)
  }, [])

  useEffect(load, [load])

  if (!rows) return null

  const fallos = rows.filter((row) => row.outcome === 'unreadable').length

  return (
    <section className="capturelog">
      <h2 className="capturelog-title">Últimos avisos recibidos</h2>

      {rows.length === 0 ? (
        <p className="capturelog-empty">
          Todavía no ha llegado ningún aviso por automatización. Cuando montes la macro, aquí
          verás qué llegó y qué entendió Caudal de cada uno —incluidos los que no supo leer—.
        </p>
      ) : (
        <>
          <p className="capturelog-lead">
            {fallos === 0
              ? 'Todos los avisos que han llegado se han entendido.'
              : `${fallos} de los últimos ${rows.length} no se han podido leer. Su texto está aquí abajo, que es justo lo que hace falta para arreglarlo.`}
          </p>

          <ul className="capturelog-list">
            {rows.map((row) => {
              const etiqueta = ETIQUETAS[row.outcome]
              return (
                <li key={row.id} className="capturelog-row">
                  <div className="capturelog-head">
                    <span className={`capturelog-badge capturelog-badge--${etiqueta.tono}`}>
                      {etiqueta.texto}
                    </span>
                    <span className="capturelog-when">{cuando(row.receivedAt)}</span>
                  </div>

                  {row.amountCents !== null && (
                    <p className="capturelog-read num">
                      {formatMoney(row.amountCents)}
                      {row.concept && <span className="capturelog-concept"> · {row.concept}</span>}
                    </p>
                  )}

                  <p className="capturelog-raw">{row.raw || '(sin texto)'}</p>
                </li>
              )
            })}
          </ul>

          <button
            type="button"
            className="capturelog-clear"
            onClick={() => {
              void clearCaptures().then(() => {
                setRows([])
                toast.show('Registro borrado')
              })
            }}
          >
            Borrar el registro
          </button>
        </>
      )}
    </section>
  )
}

/** "hace 3 min", "ayer 21:40" — lo justo para situar el aviso. */
function cuando(epoch: number): string {
  const minutos = Math.round((Date.now() - epoch) / 60000)
  if (minutos < 1) return 'ahora mismo'
  if (minutos < 60) return `hace ${minutos} min`

  const fecha = new Date(epoch)
  const hora = fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  const hoy = new Date()
  const mismoDia = fecha.toDateString() === hoy.toDateString()
  if (mismoDia) return `hoy ${hora}`

  const ayer = new Date(hoy)
  ayer.setDate(hoy.getDate() - 1)
  if (fecha.toDateString() === ayer.toDateString()) return `ayer ${hora}`

  return `${fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ${hora}`
}
