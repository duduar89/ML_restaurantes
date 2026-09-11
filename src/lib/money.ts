/**
 * Dinero en céntimos (enteros). Nunca floats: 0.1 + 0.2 !== 0.3.
 * Todo el dominio trabaja con `Cents` y sólo se formatea en el borde de la UI.
 */
export type Cents = number

const LOCALE = 'es-ES'
const CURRENCY = 'EUR'

// useGrouping 'always': es-ES omite el separador de miles en cifras de 4
// dígitos (1234,50 €) pero lo pone en 5 (12.345,67 €). Forzarlo evita que una
// columna de importes cambie de formato a mitad de lista.
const eur = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

const eurCompact = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
  useGrouping: 'always',
})

/** 1234 -> "12,34 €" */
export function formatMoney(cents: Cents): string {
  return eur.format(cents / 100)
}

/** 123456 -> "1.235 €" (para ejes de gráficas y titulares) */
export function formatMoneyCompact(cents: Cents): string {
  return eurCompact.format(Math.round(cents / 100))
}

const plain = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always',
})

/** Sólo el número, sin símbolo: 1234 -> "12,34" */
export function formatAmount(cents: Cents): string {
  return plain.format(cents / 100)
}

/** Puntos que agrupan millares en vez de separar decimales: 1.234, 12.345.678 */
const GROUPED_THOUSANDS = /^-?\d{1,3}(?:\.\d{3})+$/

/**
 * Parsea lo que el usuario teclea ("12,50", "12.50", "1.234,56") a céntimos.
 * Devuelve null si no es un importe válido.
 */
export function parseAmount(input: string): Cents | null {
  const raw = input.trim().replace(/\s|€/g, '')
  if (!raw) return null

  const lastComma = raw.lastIndexOf(',')
  const lastDot = raw.lastIndexOf('.')
  let normalized: string

  if (lastComma === -1 && lastDot === -1) {
    normalized = raw
  } else if (lastComma > lastDot) {
    // Formato español: la coma es el decimal, los puntos son miles.
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (GROUPED_THOUSANDS.test(raw)) {
    // "1.234" sin decimales son mil doscientos treinta y cuatro, no uno coma
    // doscientos treinta y cuatro. Lo que lo distingue es el tamaño del grupo:
    // sólo son miles si tras CADA punto vienen exactamente tres dígitos, así
    // que "1.23" sigue siendo un decimal.
    normalized = raw.replace(/\./g, '')
  } else {
    // Formato anglosajón: el punto es el decimal, las comas son miles.
    normalized = raw.replace(/,/g, '')
  }

  if (!/^-?\d*\.?\d*$/.test(normalized) || normalized === '.' || normalized === '-') return null

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null

  return Math.round(value * 100)
}

export function sum(values: Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0)
}

/** Variación porcentual entre dos periodos. null cuando no hay base con la que comparar. */
export function percentChange(current: Cents, previous: Cents): number | null {
  if (previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}
