import type { DayKey } from '@/lib/dates'
import type { Cents } from '@/lib/money'
import type { Norma43Movement, Norma43Result } from './norma43'

/**
 * Lector de extractos en CSV / Excel exportado a texto.
 *
 * Norma 43 es mejor formato —es idéntico en todos los bancos españoles— pero
 * tiene un problema práctico: hay que encontrarlo en la banca electrónica, y a
 * menudo está escondido detrás de tres menús con nombres que no dicen nada.
 * El CSV está siempre a la vista, y los neobancos (Revolut, N26) no ofrecen
 * otra cosa.
 *
 * El precio de esa comodidad es que cada banco escribe el suyo distinto: otro
 * separador, otro orden de columnas, otro formato de fecha, el importe en una
 * columna con signo o en dos columnas de cargo y abono. Así que aquí no hay un
 * formato: hay detección.
 *
 * La regla que gobierna todo el módulo: **ante la duda, no adivinar**. Un
 * extracto mal leído no da error, da unos totales creíbles y equivocados, y
 * eso no se descubre hasta que ya no te acuerdas de qué importaste. Cuando algo
 * no está claro se devuelve como problema y lo decide la persona en la vista
 * previa.
 */

export interface CsvResult extends Norma43Result {
  /** Cabeceras reconocidas, para poder enseñar qué se ha entendido. */
  columns: {
    day: string
    concept: string | null
    amount: string | null
    debit: string | null
    credit: string | null
  } | null
  /**
   * Avisos que no impiden importar pero que la persona tiene que ver. El caso
   * que importa: cuando el orden día/mes es ambiguo y se ha asumido uno.
   */
  warnings: string[]
}

/* ------------------------------------------------------------------ troceo */

/**
 * Divide el texto en filas y celdas respetando las comillas.
 *
 * No se puede usar `split(',')`: "MERCADONA, S.A." es UNA celda, y partirla
 * desplaza todas las columnas siguientes una posición. El desplazamiento no
 * rompe nada visiblemente —las fechas siguen pareciendo fechas— así que el
 * fallo sería silencioso.
 */
function splitRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]

    if (quoted) {
      if (char === '"') {
        // Dos comillas seguidas dentro de una celda entrecomillada son una
        // comilla literal, no el final de la celda.
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
      continue
    }

    if (char === '"' && cell.trim() === '') {
      quoted = true
    } else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((cells) => cells.some((value) => value.trim() !== ''))
}

/**
 * Adivina el separador contando cuál produce el mismo número de columnas en
 * más filas. El punto y coma va primero a propósito: es el que usan los CSV
 * españoles, porque la coma ya está ocupada por los decimales.
 */
function detectDelimiter(text: string): string {
  const muestra = text.split(/\r?\n/).filter((line) => line.trim()).slice(0, 40).join('\n')
  let mejor = ';'
  let mejorPuntuacion = -1

  for (const candidato of [';', ',', '\t', '|']) {
    const filas = splitRows(muestra, candidato)
    if (filas.length < 2) continue

    // Se premia tener varias columnas y que todas las filas tengan las mismas.
    const anchos = filas.map((fila) => fila.length)
    const moda = anchos.sort((a, b) => anchos.filter((x) => x === a).length - anchos.filter((x) => x === b).length).at(-1) ?? 1
    if (moda < 2) continue
    const coherentes = anchos.filter((ancho) => ancho === moda).length / anchos.length
    const puntuacion = coherentes * 10 + Math.min(moda, 12)

    if (puntuacion > mejorPuntuacion) {
      mejorPuntuacion = puntuacion
      mejor = candidato
    }
  }

  return mejor
}

/* ------------------------------------------------------------- conversores */

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Partes numéricas de una fecha, en el orden en que venían. */
function dateParts(raw: string): [number, number, number] | null {
  const limpio = raw.trim().split(/[ T]/)[0]
  const match = limpio.match(/^(\d{1,4})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function fourDigitYear(year: number): number {
  if (year >= 1000) return year
  return year < 80 ? 2000 + year : 1900 + year
}

function toDayKey(year: number, month: number, day: number): DayKey | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const yyyy = String(fourDigitYear(year)).padStart(4, '0')
  return `${yyyy}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/**
 * Importe a céntimos, aguantando las cuatro formas en que los bancos lo
 * escriben: 1.234,56 · 1,234.56 · 1234.56 · -12,34 y 12,34- (signo detrás).
 */
export function parseCsvAmount(raw: string): Cents | null {
  let texto = raw.trim().replace(/\s|€|EUR/gi, '')
  if (!texto) return null

  let negativo = false
  // Los tres modos de escribir un número negativo en un extracto.
  if (/^\(.*\)$/.test(texto)) {
    negativo = true
    texto = texto.slice(1, -1)
  }
  if (texto.endsWith('-')) {
    negativo = true
    texto = texto.slice(0, -1)
  }
  if (texto.startsWith('-')) {
    negativo = true
    texto = texto.slice(1)
  }
  if (texto.startsWith('+')) texto = texto.slice(1)

  if (!/^\d[\d.,]*$/.test(texto)) return null

  const comas = (texto.match(/,/g) ?? []).length
  const puntos = (texto.match(/\./g) ?? []).length
  let normalizado: string

  if (comas > 0 && puntos > 0) {
    // Están los dos: el ÚLTIMO en aparecer es el decimal y el otro agrupa.
    normalizado =
      texto.lastIndexOf(',') > texto.lastIndexOf('.')
        ? texto.replace(/\./g, '').replace(',', '.')
        : texto.replace(/,/g, '')
  } else if (comas + puntos === 0) {
    normalizado = texto
  } else if (comas + puntos > 1) {
    // Varios separadores del mismo tipo sólo pueden ser millares: 1.234.567.
    normalizado = texto.replace(/[.,]/g, '')
  } else {
    // Un único separador. Lo que decide es cuántos dígitos lleva detrás:
    // "1.234" son mil doscientos treinta y cuatro (agrupación), mientras que
    // "12.34" son doce con treinta y cuatro. Tres dígitos exactos detrás es
    // agrupación; cualquier otra cosa, decimales.
    //
    // El caso ambiguo de verdad —"1.500" como mil quinientos o como uno con
    // quinientas milésimas— se resuelve a favor de los millares porque en un
    // extracto bancario los importes no llevan tres decimales.
    const separador = comas === 1 ? ',' : '.'
    const decimales = texto.length - texto.lastIndexOf(separador) - 1
    normalizado =
      decimales === 3
        ? texto.replace(/[.,]/g, '')
        : texto.replace(separador, '.')
  }

  const valor = Number(normalizado)
  if (!Number.isFinite(valor)) return null

  const centimos = Math.round(valor * 100)
  return negativo ? -centimos : centimos
}

/** Hash corto y estable (FNV-1a), igual que en Norma 43. */
function fingerprint(input: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(36)
}

/* ----------------------------------------------------------- reconocimiento */

const CABECERAS = {
  day: [
    'fecha operacion', 'f. operacion', 'f operacion', 'fecha de operacion',
    'fecha contable', 'fecha', 'data', 'date', 'started date', 'completed date',
    'transaction date', 'booking date', 'fecha movimiento',
  ],
  concept: [
    'concepto', 'descripcion', 'description', 'detalle', 'concepto ampliado',
    'movimiento', 'beneficiario', 'payee', 'name', 'referencia 1', 'observaciones',
    'mas datos', 'texto',
  ],
  amount: ['importe', 'amount', 'cantidad', 'importe eur', 'importe (eur)', 'valor'],
  debit: ['debe', 'cargo', 'cargos', 'paid out', 'debito', 'salida', 'pagos'],
  credit: ['haber', 'abono', 'abonos', 'paid in', 'credito', 'entrada', 'ingresos'],
  /**
   * Columnas que JAMÁS deben confundirse con el importe. El saldo son números
   * con pinta de dinero en la columna de al lado: si se escogiera, el extracto
   * entraría entero con cifras plausibles y equivocadas.
   */
  prohibidas: ['saldo', 'balance', 'saldo posterior', 'disponible'],
}

function matchColumn(headers: string[], candidatos: string[]): number {
  const normalizadas = headers.map(normalize)

  // Primero coincidencia exacta, después "empieza por", y sólo al final
  // "contiene": así "fecha valor" no gana a "fecha operación".
  for (const candidato of candidatos) {
    const i = normalizadas.indexOf(candidato)
    if (i !== -1) return i
  }
  for (const candidato of candidatos) {
    const i = normalizadas.findIndex((h) => h.startsWith(candidato))
    if (i !== -1) return i
  }
  for (const candidato of candidatos) {
    const i = normalizadas.findIndex((h) => h.includes(candidato))
    if (i !== -1) return i
  }
  return -1
}

/**
 * Localiza la fila de cabeceras. Los bancos escriben encima el titular, el
 * IBAN y el periodo, así que casi nunca es la primera línea.
 */
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 25); i += 1) {
    const fila = rows[i]
    if (fila.length < 2) continue
    const tieneFecha = matchColumn(fila, CABECERAS.day) !== -1
    const tieneImporte =
      matchColumn(fila, CABECERAS.amount) !== -1 ||
      (matchColumn(fila, CABECERAS.debit) !== -1 && matchColumn(fila, CABECERAS.credit) !== -1)
    if (tieneFecha && tieneImporte) return i
  }
  return -1
}

/* -------------------------------------------------------------------- lector */

export function parseCsv(text: string): CsvResult {
  const resultado: CsvResult = {
    account: null,
    from: null,
    to: null,
    movements: [],
    problems: [],
    totalLines: 0,
    columns: null,
    warnings: [],
  }

  const delimiter = detectDelimiter(text)
  const rows = splitRows(text, delimiter)
  resultado.totalLines = rows.length
  if (rows.length === 0) return resultado

  const headerIndex = findHeaderRow(rows)
  if (headerIndex === -1) {
    resultado.problems.push({
      line: 1,
      reason: 'no encuentro una fila de cabeceras con una fecha y un importe',
    })
    return resultado
  }

  const headers = rows[headerIndex]
  const iDay = matchColumn(headers, CABECERAS.day)
  const iConcept = matchColumn(headers, CABECERAS.concept)
  let iAmount = matchColumn(headers, CABECERAS.amount)
  const iDebit = matchColumn(headers, CABECERAS.debit)
  const iCredit = matchColumn(headers, CABECERAS.credit)

  // El saldo nunca es el importe, aunque su cabecera se parezca.
  if (iAmount !== -1 && CABECERAS.prohibidas.some((p) => normalize(headers[iAmount]).includes(p))) {
    iAmount = -1
  }

  const tieneDobleColumna = iDebit !== -1 && iCredit !== -1
  if (iAmount === -1 && !tieneDobleColumna) {
    resultado.problems.push({
      line: headerIndex + 1,
      reason: 'no encuentro la columna del importe',
    })
    return resultado
  }

  resultado.columns = {
    day: headers[iDay] ?? '',
    concept: iConcept === -1 ? null : headers[iConcept],
    amount: iAmount === -1 ? null : headers[iAmount],
    debit: tieneDobleColumna ? headers[iDebit] : null,
    credit: tieneDobleColumna ? headers[iCredit] : null,
  }

  const cuerpo = rows.slice(headerIndex + 1)

  /*
   * Si las filas de datos traen MÁS celdas que la cabecera, el separador está
   * partiendo algo por dentro. El caso real: un CSV separado por comas cuyos
   * importes llevan también coma decimal, donde "-47,85" se convierte en dos
   * celdas y la columna del importe se queda con "-47".
   *
   * Eso no se puede deshacer con certeza, y equivocarse aquí es exactamente el
   * fallo que no se detecta nunca: el gasto entra, tiene una pinta razonable, y
   * le faltan los céntimos. Así que se para y se dice.
   */
  const ancho = (fila: string[]) => {
    let n = fila.length
    while (n > 0 && fila[n - 1].trim() === '') n -= 1
    return n
  }
  const anchoCabecera = ancho(headers)
  const filasAnchas = cuerpo.filter((fila) => ancho(fila) > anchoCabecera).length
  if (cuerpo.length > 0 && filasAnchas / cuerpo.length > 0.5) {
    resultado.problems.push({
      line: headerIndex + 2,
      reason:
        `las filas traen más columnas que la cabecera (${anchoCabecera}): el separador «${delimiter}» ` +
        'está partiendo los importes por la coma decimal. Vuelve a exportar el extracto eligiendo ' +
        'punto y coma como separador, o descárgalo en Norma 43.',
    })
    return resultado
  }

  /*
   * Orden día/mes. "03/04/2026" es el 3 de abril en España y el 4 de marzo en
   * un export en inglés, y elegir mal desplaza los gastos meses enteros sin
   * que nada falle. Se decide mirando TODAS las filas antes de convertir
   * ninguna: basta un día mayor que 12 en una posición para saber cuál es.
   */
  let primeroMayorQue12 = false
  let segundoMayorQue12 = false
  let isoDirecto = false
  for (const fila of cuerpo) {
    const partes = dateParts(fila[iDay] ?? '')
    if (!partes) continue
    if (partes[0] > 31) {
      isoDirecto = true
      continue
    }
    if (partes[0] > 12) primeroMayorQue12 = true
    if (partes[1] > 12) segundoMayorQue12 = true
  }

  let orden: 'dmy' | 'mdy' | 'ymd' = 'dmy'
  if (isoDirecto) {
    orden = 'ymd'
  } else if (segundoMayorQue12 && !primeroMayorQue12) {
    orden = 'mdy'
  } else if (!primeroMayorQue12 && !segundoMayorQue12) {
    // Ningún número delata el orden: todas las fechas caen en los doce
    // primeros días del mes. Se asume el español, pero se dice.
    resultado.warnings.push(
      'Todas las fechas son ambiguas (ningún día pasa del 12). He supuesto día/mes, como escriben los bancos españoles. Compruébalo en la vista previa.'
    )
  }

  cuerpo.forEach((fila, index) => {
    const linea = headerIndex + index + 2
    const crudoFecha = (fila[iDay] ?? '').trim()
    if (!crudoFecha) return

    const partes = dateParts(crudoFecha)
    if (!partes) {
      resultado.problems.push({ line: linea, reason: `fecha ilegible: «${crudoFecha}»` })
      return
    }

    const [a, b, c] = partes
    const day =
      orden === 'ymd' ? toDayKey(a, b, c) : orden === 'mdy' ? toDayKey(c, a, b) : toDayKey(c, b, a)
    if (!day) {
      resultado.problems.push({ line: linea, reason: `fecha imposible: «${crudoFecha}»` })
      return
    }

    let centimos: Cents | null = null
    if (tieneDobleColumna) {
      const debe = parseCsvAmount(fila[iDebit] ?? '')
      const haber = parseCsvAmount(fila[iCredit] ?? '')
      if (debe) centimos = -Math.abs(debe)
      else if (haber) centimos = Math.abs(haber)
    } else {
      centimos = parseCsvAmount(fila[iAmount] ?? '')
    }

    if (centimos === null || centimos === 0) {
      resultado.problems.push({
        line: linea,
        reason: centimos === 0 ? 'importe cero' : `importe ilegible: «${fila[iAmount] ?? ''}»`,
      })
      return
    }

    const concept =
      iConcept === -1 ? 'Movimiento' : (fila[iConcept] ?? '').replace(/\s+/g, ' ').trim() || 'Movimiento'

    const movimiento: Norma43Movement = {
      day,
      valueDay: day,
      amountCents: Math.abs(centimos),
      isDebit: centimos < 0,
      concept,
      reference: '',
      externalId: `csv:${fingerprint(`${day}|${Math.abs(centimos)}|${centimos < 0 ? 'D' : 'H'}|${concept}`)}`,
    }
    resultado.movements.push(movimiento)
  })

  const dias = resultado.movements.map((m) => m.day).sort()
  resultado.from = dias[0] ?? null
  resultado.to = dias.at(-1) ?? null

  return resultado
}
