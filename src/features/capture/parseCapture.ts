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
 * Importes dentro de un texto libre: "12,50 €", "€12.50", "EUR 12,50",
 * "12.50EUR". Se pide al menos un decimal o el símbolo para no confundir el
 * importe con un número de tarjeta o una hora.
 */
const AMOUNT_PATTERNS = [
  /(?:€|EUR)\s*(\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i,
  /(\d{1,3}(?:[.\s]\d{3})*,\d{1,2}|\d+[.,]\d{1,2})\s*(?:€|EUR)/i,
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
 * tipo de error, porque es silencioso y tardío.
 */
const NOT_AN_EXPENSE = /\b(rechaz|denegad|no autorizad|cancelad|caducad|bloquead|intento de|sospechos|fraude)/i

/**
 * Avisos de dinero que ENTRA. El mismo formato de aviso sirve para una
 * devolución que para una compra, y apuntar una devolución como gasto lo
 * cuenta dos veces en contra.
 */
const IS_INCOME = /\b(devoluci|abono|abonad|reembols|ingreso|ingresad|nómina|nomina|transferencia recibida)/i

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
    // La automatización no lo codificó y hay un '%' suelto: mejor el texto tal
    // cual que descartarlo entero.
    return value
  }
}

export function parseCapture(params: URLSearchParams, rawSearch?: string): Capture | null {
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
  if (NOT_AN_EXPENSE.test(haystack)) return null

  const amountCents = parseAmount(rawAmount ?? '') ?? parseAmount(firstMatch(haystack, AMOUNT_PATTERNS) ?? '')
  if (!amountCents || amountCents <= 0) return null

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
  }
}
