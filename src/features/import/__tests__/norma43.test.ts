import { describe, expect, it } from 'vitest'
import { parseNorma43 } from '../norma43'

/** Construye un registro de 80 caracteres colocando campos por posición 1-based. */
function record(pairs: Array<[number, string]>): string {
  const line = Array<string>(80).fill(' ')
  for (const [start, value] of pairs) {
    for (let i = 0; i < value.length; i += 1) line[start - 1 + i] = value[i]
  }
  return line.join('')
}

const header = record([
  [1, '11'],
  [3, '0182'],
  [7, '1234'],
  [11, '0123456789'],
  [21, '260901'],
  [27, '260930'],
  [33, '2'],
  [34, '00000000150000'],
  [48, '978'],
])

/** Cargo de 12,50 € el 5 de septiembre de 2026. */
const debit = record([
  [1, '22'],
  [11, '260905'],
  [17, '260905'],
  [23, '12'],
  [25, '003'],
  [28, '1'],
  [29, '00000000001250'],
  [43, '0000000001'],
  [53, 'REF123456789'],
  [65, 'TARJETA 1234'],
])

const debitConcept = record([[1, '23'], [3, '01'], [5, 'COMPRA EN MERCADONA'], [43, 'MADRID']])

/** Abono de 1.200,00 € el 25 de septiembre. */
const credit = record([
  [1, '22'],
  [11, '260925'],
  [17, '260925'],
  [28, '2'],
  [29, '00000000120000'],
  [53, 'NOMINA'],
])

const footer = record([[1, '33'], [3, '0182']])
const eof = record([[1, '88']])
const lines = [header, debit, debitConcept, credit, footer, eof]

describe('parseNorma43', () => {
  it('lee la cabecera de cuenta', () => {
    const parsed = parseNorma43(lines.join('\n'))
    expect(parsed.account).toBe('0182 1234 0123456789')
    expect(parsed.from).toBe('2026-09-01')
    expect(parsed.to).toBe('2026-09-30')
    expect(parsed.problems).toEqual([])
  })

  it('interpreta los decimales implícitos del importe', () => {
    const [first] = parseNorma43(lines.join('\n')).movements
    // 14 dígitos con dos decimales implícitos: 12,50 € = 1250 céntimos.
    expect(first.amountCents).toBe(1250)
  })

  it('distingue debe de haber', () => {
    const [first, second] = parseNorma43(lines.join('\n')).movements
    expect(first.isDebit).toBe(true) // signo 1 = sale dinero
    expect(second.isDebit).toBe(false) // signo 2 = entra dinero
    expect(second.amountCents).toBe(120000)
  })

  it('junta los registros 23 en el concepto', () => {
    const [first, second] = parseNorma43(lines.join('\n')).movements
    expect(first.concept).toBe('COMPRA EN MERCADONA MADRID')
    expect(second.concept).toBe('Movimiento') // sin registro 23
  })

  it('genera una huella estable y distinta por movimiento', () => {
    // Es lo único que impide duplicar todo al reimportar un rango solapado:
    // los movimientos de Norma 43 no traen identificador propio.
    const a = parseNorma43(lines.join('\n')).movements
    const b = parseNorma43(lines.join('\n')).movements
    expect(a[0].externalId).toBe(b[0].externalId)
    expect(a[0].externalId).not.toBe(a[1].externalId)
  })

  it('trocea por bloques de 80 si el fichero no trae saltos de línea', () => {
    const block = parseNorma43(lines.join(''))
    expect(block.movements).toHaveLength(2)
    expect(block.movements[0].amountCents).toBe(1250)
  })

  it('reporta las líneas corruptas en vez de tragárselas', () => {
    const broken = parseNorma43([header, record([[1, '22'], [11, 'XXXXXX'], [28, '1']]), eof].join('\n'))
    expect(broken.movements).toHaveLength(0)
    expect(broken.problems).toEqual([{ line: 2, reason: 'fecha ilegible' }])
  })

  it('avisa de los registros que no conoce', () => {
    const odd = parseNorma43([header, record([[1, '99']]), eof].join('\n'))
    expect(odd.problems[0].reason).toContain('99')
  })
})
