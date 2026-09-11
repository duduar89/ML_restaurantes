import { parseAmount, type Cents } from '@/lib/money'
import { toDayKey, type DayKey } from '@/lib/dates'

/**
 * Traduce lo que llega desde fuera a un gasto: los parámetros de un enlace
 * (Atajos de iOS, MacroDroid, Tasker) o el texto que se comparte desde el
 * menú de compartir de Android.
 *
 * Es el único punto de entrada automático que existe de verdad. Conviene
 * decirlo claro: una página web NO puede enterarse de que has pagado con la
 * tarjeta. Lo que sí puede es recibir lo que una automatización del teléfono
 * le mande cuando el banco avisa, y de eso va este módulo.
 */
export interface Capture {
  amountCents: Cents
  concept: string
  day: DayKey
  /** Una devolución entra como ingreso, no como gasto en negativo. */
  kind: 'expense' | 'income'
  methodHint: string | null
  spaceHint: string | null
  source: 'automation' | 'share'
  /** Huella del apunte original: la clave para no duplicarlo. */
  externalId: string
  /** Guardar sin preguntar (la automatización lo pidió con auto=1). */
  auto: boolean
}

/**
 * Importes dentro de un texto libre: "12,50 €", "€12.50", "EUR 12,50".
 *
 * El grupo de millares lleva `+` y no `*`, y esto NO es un detalle de estilo.
 * Con `*`, la primera rama de la alternancia aceptaba "2" como válido dentro
 * de "€2.50" —cero repeticiones del grupo y coma decimal opcional—, y una
 * alternancia se queda con la primera rama que encaja: la que sí habría leído
 * "2.50" entero no llegaba a probarse nunca. El resultado era un gasto de
 * 2,00 € en lugar de 2,50 €, apuntado sin error y sin nada que lo delatase.
 * Con `+`, esa rama exige millares de verdad y el formato inglés cae en la
 * segunda, que lo lee completo.
 */
const AMOUNT_PATTERNS = [
  /(?:€|EUR)\s*(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)(?!\d)/i,
  /(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+[.,]\d{1,2})\s*(?:€|EUR)/i,
]

/** Comercio en los avisos de los bancos españoles: "compra en MERCADONA". */
const MERCHANT_PATTERNS = [
  /(?:compra|pago|cargo|gasto)\s+(?:de\s+[^ ]+\s+)?en\s+([^.,;\n]{2,40})/i,
  /\ben\s+([A-ZÁÉÍÓÚÑ][^.,;\n]{2,40})/,
]

/**
 * Avisos que NO son un gasto y que no deben crear nada.
 *
 * Un pago rechazado genera notificación igual que uno aceptado. Si se apuntara,
 * el gasto sería falso y sólo se descubriría al descuadrar el mes — el peor
 * tipo de error, porque es silencioso y tardío. Lo mismo con un pago
 * PROGRAMADO, que aún no ha ocurrido.
 *
 * Se descarta de más a propósito: si algún aviso legítimo cae aquí, el usuario
 * lo echa en falta y lo apunta a mano. Al revés no hay vuelta atrás, porque un
 * gasto inventado no se nota.
 */
const NOT_AN_EXPENSE =
  /\b(rechaz|denegad|no autorizad|cancelad|caducad|bloquead|intento de|sospechos|fraude|programad)/i

/**
 * Avisos de dinero que ENTRA. El mismo formato de aviso sirve para una
 * devolución que para una compra, y apuntar una devolución como gasto lo
 * cuenta dos veces en contra.
 *
 * Ojo con la diferencia entre "te ha enviado" (entra) y "has enviado" (sale):
 * son la misma frase con el pronombre cambiado y significan lo contrario.
 */
const IS_INCOME =
  /\b(devoluci|abono|abonad|reembols|ingreso|ingresad|nómina|nomina|recibid[oa]|te\s+ha\s+enviado|te\s+han\s+enviado)/i

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return match[1].trim()
  }
  return null
}

/**
 * Huella determinista del apunte. Sin ella, repetir el mismo atajo o volver a
 * abrir el enlace crearía gastos duplicados.
 */
export function dedupeKey(parts: {
  source: string
  amountCents: number
  day: string
  concept: string
}): string {
  const normalized = parts.concept.toLowerCase().replace(/\s+/g, ' ').trim()
  return `${parts.source}:${parts.day}:${parts.amountCents}:${normalized}`
}

/**
 * Recupera el texto del aviso directamente de la cadena de consulta en crudo.
 *
 * `URLSearchParams` corta el valor en el primer `&`, y los avisos bancarios los
 * llevan: "compra en H&M" partiría la cadena y se perdería el comercio. Como la
 * automatización manda el texto SIEMPRE en último lugar, aquí se coge todo
 * desde `texto=` hasta el final, venga codificado o no.
 */
export function rawTextParam(search: string): string | null {
  const match = search.match(/[?&](?:texto|text)=(.*)$/s)
  if (!match) return null

  const value = match[1].replace(/\+/g, ' ')
  try {
    return decodeURIComponent(value)
  } catch {
    // Un '%' que no abre ningún escape —"EL CORTE INGLES 100%", un descuento
    // del 50%— hace que decodeURIComponent rechace la cadena ENTERA, también
    // los %20 que sí eran válidos. El importe quedaba entonces pegado a
    // "%20EUR", no se reconocía, y el gasto se perdía sin decir nada.
    //
    // Se descodifica escape a escape, y el que no se pueda se queda como
    // está. Van por tandas y no de uno en uno porque un acento son dos
    // escapes seguidos (%C3%89 es É) y sueltos no significan nada.
    return value.replace(/(?:%[0-9a-fA-F]{2})+/g, (run) => {
      try {
        return decodeURIComponent(run)
      } catch {
        return run
      }
    })
  }
}

/**
 * Por qué un aviso no ha llegado a ser un gasto.
 *
 * Separar "lo he descartado a propósito" de "no he sabido leerlo" no es una
 * sutileza: lo primero es la app funcionando y lo segundo es la app fallando.
 * Si se mezclan, un banco cuyos avisos no se saben leer parece un banco que
 * sólo manda pagos rechazados, y nadie lo arregla nunca.
 */
export type CaptureReason = 'ok' | 'no-es-gasto' | 'sin-importe'

export interface CaptureResult {
  capture: Capture | null
  reason: CaptureReason
}

export function parseCapture(params: URLSearchParams, rawSearch?: string): Capture | null {
  return parseCaptureResult(params, rawSearch).capture
}

/** El texto del aviso tal y como llegó, para poder enseñarlo y depurarlo. */
export function captureRawText(params: URLSearchParams, rawSearch?: string): string {
  const texto =
    (rawSearch ? rawTextParam(rawSearch) : null) ?? params.get('text') ?? params.get('texto')
  if (texto) return texto

  // Sin texto libre, lo que llegó son parámetros sueltos: se reconstruyen para
  // que el registro enseñe algo legible en lugar de una línea en blanco.
  const trozos = ['importe', 'amount', 'concepto', 'concept', 'comercio', 'metodo', 'apartado']
    .map((clave) => (params.get(clave) ? `${clave}=${params.get(clave)}` : null))
    .filter(Boolean)
  return trozos.join(' · ')
}

export function parseCaptureResult(params: URLSearchParams, rawSearch?: string): CaptureResult {
  // Nombres en español y en inglés: los atajos y las macros se escriben en
  // cualquiera de los dos y no merece la pena obligar a uno.
  const rawAmount =
    params.get('importe') ?? params.get('amount') ?? params.get('cantidad') ?? null
  const rawConcept =
    params.get('concepto') ?? params.get('concept') ?? params.get('comercio') ??
    params.get('merchant') ?? params.get('title') ?? null
  // El crudo manda: es el único que sobrevive a un '&' dentro del aviso.
  const sharedText =
    (rawSearch ? rawTextParam(rawSearch) : null) ?? params.get('text') ?? params.get('texto') ?? null

  const haystack = [sharedText, rawConcept, params.get('url')].filter(Boolean).join(' ')

  // Un pago rechazado se descarta entero: es preferible que el usuario lo eche
  // en falta y lo apunte a mano, a que aparezca un gasto que nunca existió.
  if (NOT_AN_EXPENSE.test(haystack)) return { capture: null, reason: 'no-es-gasto' }

  const amountCents = parseAmount(rawAmount ?? '') ?? parseAmount(firstMatch(haystack, AMOUNT_PATTERNS) ?? '')
  if (!amountCents || amountCents <= 0) return { capture: null, reason: 'sin-importe' }

  const concept =
    (rawConcept && !sharedText ? rawConcept : null) ??
    firstMatch(haystack, MERCHANT_PATTERNS) ??
    rawConcept ??
    'Cargo en tarjeta'

  const rawDay = params.get('fecha') ?? params.get('date')
  const day = rawDay && /^\d{4}-\d{2}-\d{2}$/.test(rawDay) ? (rawDay as DayKey) : toDayKey()

  const source: Capture['source'] = sharedText ? 'share' : 'automation'
  const providedId = params.get('id') ?? params.get('ref')

  const kindParam = params.get('tipo') ?? params.get('kind')
  const kind: Capture['kind'] =
    kindParam === 'ingreso' || kindParam === 'income'
      ? 'income'
      : IS_INCOME.test(haystack)
        ? 'income'
        : 'expense'

  return {
    capture: {
      amountCents,
      concept: concept.slice(0, 60),
      day,
      kind,
      methodHint: params.get('metodo') ?? params.get('method') ?? null,
      spaceHint: params.get('apartado') ?? params.get('space') ?? null,
      source,
      externalId: providedId
        ? `${source}:${providedId}`
        : dedupeKey({ source, amountCents, day, concept }),
      auto: params.get('auto') === '1' || params.get('auto') === 'true',
    },
    reason: 'ok',
  }
}
