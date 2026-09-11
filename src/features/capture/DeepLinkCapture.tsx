import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import { LogoMark } from '@/brand/Logo'
import { Chips } from '@/components/Chips'
import { useAppData } from '@/app/store'
import { addExpense, findByExternalId, findLikelyDuplicate } from '@/db/repo'
import { requestPersistence } from '@/lib/storage'
import { haptic } from '@/hooks/useHaptics'
import { formatMoney } from '@/lib/money'
import { formatDayHeading } from '@/lib/dates'
import { guessCategoryId } from '@/features/add/guessCategory'
import { parseCapture, type Capture } from './parseCapture'
import type { Expense } from '@/db/types'
import './DeepLinkCapture.css'

/**
 * Entrada automática: aquí aterrizan los atajos de iOS, las macros de Android
 * y el menú de compartir.
 *
 * Con `auto=1` guarda solo y avisa; si no, enseña lo que ha entendido y deja
 * una única confirmación. Antes de guardar comprueba duplicados por dos vías:
 * la huella exacta (mismo atajo lanzado dos veces) y el parecido con un gasto
 * apuntado a mano (lo pagaste y además lo apuntaste). Lo segundo NUNCA se
 * fusiona solo: se avisa y decide la persona.
 */
type Status = 'reading' | 'confirm' | 'saved' | 'duplicate' | 'invalid'

export function DeepLinkCapture() {
  const [params] = useSearchParams()
  // La cadena en crudo, además de los parámetros ya troceados: es la única
  // forma de recuperar entero un aviso que lleve un '&' dentro.
  const { search } = useLocation()
  const navigate = useNavigate()
  const { methods, categories, spaces, entrySpace, methodById, spaceById } = useAppData()

  const [status, setStatus] = useState<Status>('reading')
  const [capture, setCapture] = useState<Capture | null>(null)
  const [existing, setExisting] = useState<Expense | null>(null)
  const [methodId, setMethodId] = useState<string | null>(null)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  /** El efecto de arranque no debe repetirse si React vuelve a montar. */
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current || methods.length === 0 || spaces.length === 0) return
    handled.current = true

    const parsed = parseCapture(params, search)
    if (!parsed) {
      setStatus('invalid')
      return
    }
    setCapture(parsed)

    // Un cargo que llega solo es, por definición, de tarjeta salvo que la
    // automatización diga otra cosa.
    const hintedMethod = parsed.methodHint
      ? methods.find((method) => matches(method.name, parsed.methodHint!) || method.kind === parsed.methodHint)
      : methods.find((method) => method.kind === 'card')
    setMethodId(hintedMethod?.id ?? methods[0]?.id ?? null)

    const hintedSpace = parsed.spaceHint
      ? spaces.find((space) => matches(space.name, parsed.spaceHint!))
      : undefined
    setSpaceId(hintedSpace?.id ?? entrySpace?.id ?? spaces[0]?.id ?? null)

    void (async () => {
      const already = await findByExternalId(parsed.externalId)
      if (already) {
        setExisting(already)
        setStatus('duplicate')
        return
      }

      const similar = await findLikelyDuplicate(parsed)
      if (similar) {
        setExisting(similar)
        setStatus('duplicate')
        return
      }

      if (parsed.auto) {
        await save(parsed, hintedMethod?.id ?? methods[0]?.id ?? null, hintedSpace?.id ?? entrySpace?.id ?? null)
        return
      }

      setStatus('confirm')
    })()
    // Sólo debe correr una vez, al llegar con los parámetros de la URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [methods, spaces, params, search])

  async function save(data: Capture, useMethodId: string | null, useSpaceId: string | null) {
    if (!useMethodId || !useSpaceId) return
    await addExpense({
      amountCents: data.amountCents,
      concept: data.concept,
      kind: data.kind,
      methodId: useMethodId,
      categoryId: guessCategoryId(data.concept, categories) ?? categories[0]?.id ?? '',
      spaceId: useSpaceId,
      day: data.day,
      source: data.source,
      externalId: data.externalId,
    })
    void requestPersistence()
    haptic('success')
    setStatus('saved')
  }

  return (
    <div className="capture">
      <div className="capture-card">
        <LogoMark size={52} level={status === 'saved' ? 0.75 : 0.4} />

        {status === 'reading' && <p className="capture-title">Leyendo el movimiento…</p>}

        {status === 'invalid' && (
          <>
            <p className="capture-title">No he podido leer el importe</p>
            <p className="capture-text">
              El enlace tiene que traer al menos un importe. Por ejemplo:
              <code>/add?importe=12,50&amp;concepto=Mercadona</code>
            </p>
          </>
        )}

        {status === 'duplicate' && capture && existing && (
          <>
            <p className="capture-title">Esto ya lo tienes apuntado</p>
            <p className="capture-text">
              Ya hay un movimiento de {formatMoney(existing.amountCents)} el{' '}
              {formatDayHeading(existing.day)} («{existing.concept}»). No lo duplico.
            </p>
            <button
              type="button"
              className="capture-secondary"
              onClick={() => void save(capture, methodId, spaceId)}
            >
              Apuntarlo igualmente
            </button>
          </>
        )}

        {status === 'confirm' && capture && (
          <>
            <p className="capture-label">
              {capture.kind === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
            </p>
            <p className="capture-amount num">{formatMoney(capture.amountCents)}</p>
            <p className="capture-concept">
              {capture.concept} · {formatDayHeading(capture.day)}
            </p>

            <div className="capture-fields">
              <Chips
                label="Método de pago"
                options={methods.map((method) => ({
                  id: method.id,
                  label: method.name,
                  emoji: method.emoji,
                }))}
                value={methodId}
                onChange={setMethodId}
              />
              <Chips
                label="Apartado"
                options={spaces.map((space) => ({
                  id: space.id,
                  label: space.name,
                  emoji: space.emoji,
                  colorIndex: space.colorIndex,
                }))}
                value={spaceId}
                onChange={setSpaceId}
              />
            </div>

            <button
              type="button"
              className="capture-primary"
              onClick={() => void save(capture, methodId, spaceId)}
            >
              Guardar
            </button>
          </>
        )}

        {status === 'saved' && capture && (
          <>
            <p className="capture-title">
              {capture.kind === 'income' ? 'Ingreso apuntado' : 'Apuntado'}
            </p>
            <p className="capture-amount num">{formatMoney(capture.amountCents)}</p>
            <p className="capture-concept">
              {capture.concept} · {methodById(methodId ?? '')?.name} ·{' '}
              {spaceById(spaceId ?? '')?.name}
            </p>
          </>
        )}

        {status !== 'reading' && (
          <button type="button" className="capture-close" onClick={() => void navigate('/', { replace: true })}>
            {status === 'saved' ? 'Ver mis gastos' : 'Ir a la app'}
          </button>
        )}
      </div>
    </div>
  )
}

/** Comparación laxa de nombres: "tarjeta" debe casar con "Tarjeta BBVA". */
function matches(name: string, hint: string): boolean {
  const normalize = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  return normalize(name).includes(normalize(hint)) || normalize(hint).includes(normalize(name))
}
