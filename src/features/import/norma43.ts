import type { DayKey } from '@/lib/dates'
import type { Cents } from '@/lib/money'

/**
 * Lector de ficheros Norma 43 (Cuaderno 43 de la AEB).
 *
 * Es el formato que TODOS los bancos españoles —BBVA, Santander, CaixaBank,
 * Sabadell, Bankinter— dejan descargar igual desde su banca electrónica, a
 * diferencia de sus CSV, que cambian de columnas, de formato de fecha y de
 * separador decimal según el banco y sin avisar. Un solo lector cubre a todos.
 *
 * El fichero es de ancho fijo: registros de 80 caracteres, cada uno con un
 * código de dos dígitos delante.
 *   11 cabecera de cuenta · 22 movimiento · 23 concepto ampliado
 *   33 final de cuenta    · 88 fin de fichero
 *
 * El lector NUNCA importa a ciegas: devuelve también las líneas que no ha
 * sabido leer para que la pantalla enseñe una vista previa y sea la persona
 * quien confirme. Si un banco usara un desplazamiento distinto, se vería al
 * instante en la vista previa en vez de colarse en los totales.
 */

export interface Norma43Movement {
  day: DayKey
  valueDay: DayKey
  amountCents: Cents
  /** true = cargo (gasto); false = abono (ingreso). */
  isDebit: boolean
  concept: string
  reference: string
  /**
   * Huella determinista del apunte. Los movimientos de Norma 43 no traen un
   * identificador estable, así que se sintetiza con fecha + importe + signo +
   * concepto + referencia. Sin ella, reimportar un rango solapado duplicaría
   * todo el mes.
   */
  externalId: string
}

export interface Norma43Result {
  account: string | null
  from: DayKey | null
  to: DayKey | null
  movements: Norma43Movement[]
  /** Líneas que no se han podido interpretar, con su número (desde 1). */
  problems: Array<{ line: number; reason: string }>
  totalLines: number
}

const RECORD_LENGTH = 80

/** Campo de un registro por posición 1-based, como está escrito en la norma. */
function field(line: string, start: number, length: number): string {
  return line.slice(start - 1, start - 1 + length)
}

/**
 * AAMMDD -> YYYY-MM-DD. La norma sólo guarda dos dígitos de año: 00-79 se
 * interpreta como 2000-2079 y 80-99 como 1980-1999, que es el corte habitual
 * y cubre de sobra cualquier extracto real.
 */
function parseDate(raw: string): DayKey | null {
  if (!/^\d{6}$/.test(raw)) return null
  const yy = Number(raw.slice(0, 2))
  const month = raw.slice(2, 4)
  const day = raw.slice(4, 6)
  const year = yy < 80 ? 2000 + yy : 1900 + yy

  const monthNumber = Number(month)
  const dayNumber = Number(day)
  if (monthNumber < 1 || monthNumber > 12 || dayNumber < 1 || dayNumber > 31) return null

  return `${year}-${month}-${day}`
}

/** 14 dígitos con dos decimales implícitos -> céntimos. */
function parseAmountField(raw: string): Cents | null {
  const digits = raw.trim()
  if (!/^\d{1,14}$/.test(digits)) return null
  return Number(digits)
}

function cleanText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

/** Hash corto y estable (FNV-1a) para la huella del apunte. */
function fingerprint(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

/**
 * Divide el fichero en registros. Algunos bancos entregan el fichero sin
 * saltos de línea, como un único bloque de registros de 80 caracteres.
 */
function toRecords(text: string): string[] {
  const normalized = text.replace(/\r\n?/g, '\n')
  if (normalized.includes('\n')) {
    return normalized.split('\n').filter((line) => line.trim().length > 0)
  }

  const out: string[] = []
  for (let i = 0; i < normalized.length; i += RECORD_LENGTH) {
    const chunk = normalized.slice(i, i + RECORD_LENGTH)
    if (chunk.trim().length > 0) out.push(chunk)
  }
  return out
}

export function parseNorma43(text: string): Norma43Result {
  const records = toRecords(text)
  const result: Norma43Result = {
    account: null,
    from: null,
    to: null,
    movements: [],
    problems: [],
    totalLines: records.length,
  }

  let current: Norma43Movement | null = null
  /** Trozos de concepto que llegan en los registros 23 que siguen al 22. */
  let extraConcept: string[] = []

  const flush = () => {
    if (!current) return
    const extra = cleanText(extraConcept.join(' '))
    if (extra) current.concept = extra
    if (!current.concept) current.concept = 'Movimiento'
    current.externalId = `n43:${fingerprint(
      `${current.day}|${current.amountCents}|${current.isDebit ? 'D' : 'H'}|${current.concept}|${current.reference}`
    )}`
    result.movements.push(current)
    current = null
    extraConcept = []
  }

  records.forEach((raw, index) => {
    const line = raw.padEnd(RECORD_LENGTH, ' ')
    const code = line.slice(0, 2)

    switch (code) {
      case '11': {
        flush()
        // Entidad (4) + oficina (4) + cuenta (10) es la cuenta completa.
        result.account = `${field(line, 3, 4)} ${field(line, 7, 4)} ${field(line, 11, 10)}`.trim()
        result.from = parseDate(field(line, 21, 6))
        result.to = parseDate(field(line, 27, 6))
        break
      }

      case '22': {
        flush()
        const day = parseDate(field(line, 11, 6))
        const valueDay = parseDate(field(line, 17, 6))
        const sign = field(line, 28, 1)
        const amountCents = parseAmountField(field(line, 29, 14))

        if (!day || amountCents === null || (sign !== '1' && sign !== '2')) {
          result.problems.push({
            line: index + 1,
            reason: !day
              ? 'fecha ilegible'
              : amountCents === null
                ? 'importe ilegible'
                : 'signo desconocido',
          })
          break
        }

        current = {
          day,
          valueDay: valueDay ?? day,
          amountCents,
          // 1 = debe (sale dinero) · 2 = haber (entra dinero).
          isDebit: sign === '1',
          concept: '',
          reference: cleanText(`${field(line, 53, 12)} ${field(line, 65, 16)}`),
          externalId: '',
        }
        break
      }

      case '23': {
        if (!current) {
          result.problems.push({ line: index + 1, reason: 'concepto sin movimiento delante' })
          break
        }
        extraConcept.push(field(line, 5, 38), field(line, 43, 38))
        break
      }

      case '33':
      case '88':
        flush()
        break

      default:
        result.problems.push({ line: index + 1, reason: `registro desconocido «${code}»` })
    }
  })

  flush()
  return result
}
