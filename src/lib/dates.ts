/**
 * El "día" de un gasto es una fecha civil local (YYYY-MM-DD), no un instante.
 * Guardar un timestamp UTC haría que un gasto de las 00:30 en Madrid apareciese
 * el día anterior. Por eso el dominio usa `DayKey` y sólo `createdAt` es epoch.
 */
export type DayKey = string // YYYY-MM-DD
export type MonthKey = string // YYYY-MM

const LOCALE = 'es-ES'

export function toDayKey(date: Date = new Date()): DayKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function toMonthKey(day: DayKey): MonthKey {
  return day.slice(0, 7)
}

export function currentMonthKey(): MonthKey {
  return toMonthKey(toDayKey())
}

/** Convierte YYYY-MM-DD a Date local (mediodía, para esquivar saltos de DST). */
export function fromDayKey(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0, 0)
}

export function addDays(day: DayKey, delta: number): DayKey {
  const date = fromDayKey(day)
  date.setDate(date.getDate() + delta)
  return toDayKey(date)
}

export function addMonths(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return toDayKey(date).slice(0, 7)
}

/** Primer y último día (inclusive) de un mes. */
export function monthRange(month: MonthKey): { from: DayKey; to: DayKey } {
  const [y, m] = month.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, '0')}` }
}

export function daysInMonth(month: MonthKey): number {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Nº de días entre dos DayKey, inclusive ambos extremos. */
export function daysBetween(from: DayKey, to: DayKey): number {
  const ms = fromDayKey(to).getTime() - fromDayKey(from).getTime()
  return Math.round(ms / 86_400_000) + 1
}

const dayLabel = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' })
const shortDayLabel = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
const monthLabel = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' })
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: 'short' })

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** "Hoy", "Ayer" o "martes, 4 de marzo". */
export function formatDayHeading(day: DayKey): string {
  const today = toDayKey()
  if (day === today) return 'Hoy'
  if (day === addDays(today, -1)) return 'Ayer'
  return capitalize(dayLabel.format(fromDayKey(day)))
}

export function formatDayShort(day: DayKey): string {
  return shortDayLabel.format(fromDayKey(day))
}

/** "Marzo 2026" */
export function formatMonth(month: MonthKey): string {
  return capitalize(monthLabel.format(fromDayKey(`${month}-01`)))
}

/** "mar" — para los ejes de las gráficas. */
export function formatMonthAbbr(month: MonthKey): string {
  return capitalize(monthShort.format(fromDayKey(`${month}-01`)).replace('.', ''))
}

/** Los últimos `count` meses terminando en `end`, del más antiguo al más reciente. */
export function lastMonths(count: number, end: MonthKey = currentMonthKey()): MonthKey[] {
  return Array.from({ length: count }, (_, i) => addMonths(end, i - count + 1))
}
