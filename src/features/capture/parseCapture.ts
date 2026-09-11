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

export function parseCapture(params: URLSearchParams): Capture | null {
  // Nombres en español y en inglés: los atajos y las macros se escriben en
  // cualquiera de los dos y no merece la pena obligar a uno.
  const rawAmount =
    params.get('importe') ?? params.get('amount') ?? params.get('cantidad') ?? null
  const rawConcept =
    params.get('concepto') ?? params.get('concept') ?? params.get('comercio') ??
    params.get('merchant') ?? params.get('title') ?? null
  const sharedText = params.get('text') ?? params.get('texto') ?? null

  const haystack = [sharedText, rawConcept, params.get('url')].filter(Boolean).join(' ')

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

  return {
    amountCents,
    concept: concept.slice(0, 60),
    day,
    methodHint: params.get('metodo') ?? params.get('method') ?? null,
    spaceHint: params.get('apartado') ?? params.get('space') ?? null,
    source,
    externalId: providedId
      ? `${source}:${providedId}`
      : dedupeKey({ source, amountCents, day, concept }),
    auto: params.get('auto') === '1' || params.get('auto') === 'true',
  }
}
