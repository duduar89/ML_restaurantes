/**
 * Lógica del teclado de importes, separada del componente para poder probarla
 * y porque es donde vive la regla de negocio: cómo se teclea un importe en
 * español.
 *
 * Entrada normal de izquierda a derecha con tecla de coma, NO acumulador de
 * céntimos. El acumulador (teclear 5 y que salga 0,05) es lo que hacen muchas
 * apps bancarias y cuesta tres pulsaciones para un café de 3 €; así cuesta
 * una, y la inmensa mayoría de los gastos del día a día son importes cortos.
 */
const MAX_INTEGER_DIGITS = 7
const MAX_DECIMALS = 2

export const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'] as const

export type KeypadKey = (typeof KEYPAD_KEYS)[number]

/** Aplica una pulsación al importe en crudo ("12", "12,5"). Pura. */
export function applyKey(raw: string, key: string): string {
  if (key === '⌫') return raw.slice(0, -1)

  if (key === ',') {
    if (raw.includes(',')) return raw
    return raw === '' ? '0,' : `${raw},`
  }

  const [integer = '', decimals] = raw.split(',')
  if (decimals === undefined) {
    if (integer.length >= MAX_INTEGER_DIGITS) return raw
    // Sin ceros a la izquierda: "0" + "5" debe dar "5", no "05".
    if (integer === '0') return key
    return raw + key
  }

  if (decimals.length >= MAX_DECIMALS) return raw
  return raw + key
}
