import type { Expense } from '@/db/types'
import type { Cents } from './money'
import {
  addDays,
  daysBetween,
  daysInMonth,
  monthRange,
  toDayKey,
  toMonthKey,
  type DayKey,
  type MonthKey,
} from './dates'

/**
 * Selectores puros sobre una lista de gastos ya cargada. Se calculan en
 * memoria porque un histórico personal cabe de sobra (miles de filas), y así
 * las gráficas se recalculan sin volver a tocar IndexedDB.
 */

export interface Bucket {
  key: string
  label: string
  cents: Cents
  count: number
}

function isSpend(expense: Expense): boolean {
  return expense.kind === 'expense'
}

export function totalSpent(expenses: Expense[]): Cents {
  return expenses.reduce((acc, expense) => (isSpend(expense) ? acc + expense.amountCents : acc), 0)
}

export function totalIncome(expenses: Expense[]): Cents {
  return expenses.reduce((acc, expense) => (isSpend(expense) ? acc : acc + expense.amountCents), 0)
}

/** Agrupa por una clave arbitraria; el orden lo decide quien lo consuma. */
export function groupBy(expenses: Expense[], key: (expense: Expense) => string): Map<string, Cents> {
  const out = new Map<string, Cents>()
  for (const expense of expenses) {
    if (!isSpend(expense)) continue
    const bucket = key(expense)
    out.set(bucket, (out.get(bucket) ?? 0) + expense.amountCents)
  }
  return out
}

export function countBy(expenses: Expense[], key: (expense: Expense) => string): Map<string, number> {
  const out = new Map<string, number>()
  for (const expense of expenses) {
    if (!isSpend(expense)) continue
    const bucket = key(expense)
    out.set(bucket, (out.get(bucket) ?? 0) + 1)
  }
  return out
}

/** Serie diaria continua (incluye días a cero) entre dos fechas. */
export function dailySeries(expenses: Expense[], from: DayKey, to: DayKey): Bucket[] {
  const totals = groupBy(expenses, (expense) => expense.day)
  const counts = countBy(expenses, (expense) => expense.day)
  const out: Bucket[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) {
    out.push({ key: day, label: day.slice(8), cents: totals.get(day) ?? 0, count: counts.get(day) ?? 0 })
  }
  return out
}

/** Gasto acumulado día a día: la curva que se compara contra el mes anterior. */
export function cumulativeSeries(series: Bucket[]): Bucket[] {
  let running = 0
  return series.map((bucket) => {
    running += bucket.cents
    return { ...bucket, cents: running }
  })
}

export function byMonth(expenses: Expense[]): Map<MonthKey, Cents> {
  return groupBy(expenses, (expense) => toMonthKey(expense.day))
}

/** Ranking de mayor a menor, con el resto agrupado si hay demasiadas porciones. */
export function ranked(
  totals: Map<string, Cents>,
  counts: Map<string, number>,
  label: (key: string) => string,
  limit?: number
): Bucket[] {
  const all = [...totals.entries()]
    .map(([key, cents]) => ({ key, label: label(key), cents, count: counts.get(key) ?? 0 }))
    .sort((a, b) => b.cents - a.cents)

  if (!limit || all.length <= limit) return all

  const head = all.slice(0, limit - 1)
  const tail = all.slice(limit - 1)
  head.push({
    key: '__otros__',
    label: 'Otros',
    cents: tail.reduce((acc, bucket) => acc + bucket.cents, 0),
    count: tail.reduce((acc, bucket) => acc + bucket.count, 0),
  })
  return head
}

/** Media diaria del periodo, contando sólo días transcurridos. */
export function dailyAverage(totalCents: Cents, from: DayKey, to: DayKey): Cents {
  const days = Math.max(1, daysBetween(from, to))
  return Math.round(totalCents / days)
}

/**
 * Proyección de cierre de mes: lo gastado hasta hoy extrapolado al ritmo
 * actual. Para meses pasados devuelve el total real.
 */
export function projectMonthEnd(monthTotal: Cents, month: MonthKey): Cents {
  const today = toDayKey()
  const { from, to } = monthRange(month)
  if (today > to) return monthTotal
  if (today < from) return 0
  const elapsed = daysBetween(from, today)
  return Math.round((monthTotal / elapsed) * daysInMonth(month))
}

export interface BudgetStatus {
  budgetCents: Cents
  spentCents: Cents
  remainingCents: Cents
  ratio: number
  /** Ritmo recomendado por día para no pasarse con los días que quedan. */
  perDayLeftCents: Cents | null
  state: 'ok' | 'warn' | 'over'
}

export function budgetStatus(
  budgetCents: Cents,
  spentCents: Cents,
  daysLeft: number | null
): BudgetStatus {
  const remainingCents = budgetCents - spentCents
  const ratio = budgetCents > 0 ? spentCents / budgetCents : 0
  return {
    budgetCents,
    spentCents,
    remainingCents,
    ratio,
    perDayLeftCents:
      daysLeft && daysLeft > 0 && remainingCents > 0 ? Math.round(remainingCents / daysLeft) : null,
    state: ratio > 1 ? 'over' : ratio >= 0.85 ? 'warn' : 'ok',
  }
}

export function biggest(expenses: Expense[]): Expense | null {
  let top: Expense | null = null
  for (const expense of expenses) {
    if (!isSpend(expense)) continue
    if (!top || expense.amountCents > top.amountCents) top = expense
  }
  return top
}

/* ------------------------------------------------- comparativas temporales */

export interface MonthDelta {
  currentCents: Cents
  previousCents: Cents
  /** Variación porcentual, o null si el mes anterior fue cero. */
  percent: number | null
  direction: 'up' | 'down' | 'flat'
}

export function monthOverMonth(currentCents: Cents, previousCents: Cents): MonthDelta {
  const diff = currentCents - previousCents
  return {
    currentCents,
    previousCents,
    percent: previousCents === 0 ? null : (diff / previousCents) * 100,
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat',
  }
}

/**
 * Media móvil sobre una serie diaria. Debe recibir la salida de `dailySeries`,
 * que rellena los días sin gasto con cero: promediar sólo los días con gasto
 * infla la media y da una sensación falsa de ritmo.
 */
export function rollingAverage(series: Bucket[], window: number): Bucket[] {
  const out: Bucket[] = []
  let running = 0
  for (let i = 0; i < series.length; i += 1) {
    running += series[i].cents
    if (i >= window) running -= series[i - window].cents
    const span = Math.min(i + 1, window)
    out.push({ ...series[i], cents: Math.round(running / span) })
  }
  return out
}

/**
 * Dos meses superpuestos por día del mes, no por fecha. Unirlos por fecha
 * rompe en silencio cuando los meses tienen distinta longitud (31 vs 28).
 * La serie se trunca al mes más corto.
 */
export interface AlignedPoint {
  dayOfMonth: number
  currentCents: Cents | null
  previousCents: Cents
}

export function alignedCumulative(
  currentSeries: Bucket[],
  previousSeries: Bucket[],
  /** Día del mes hasta el que hay datos reales del mes en curso. */
  throughDay: number
): AlignedPoint[] {
  const current = cumulativeSeries(currentSeries)
  const previous = cumulativeSeries(previousSeries)
  const length = Math.min(current.length, previous.length)

  return Array.from({ length }, (_, index) => ({
    dayOfMonth: index + 1,
    // Más allá de hoy no hay dato: la línea del mes en curso se corta ahí en
    // lugar de aplanarse, que parecería "he dejado de gastar".
    currentCents: index + 1 <= throughDay ? current[index].cents : null,
    previousCents: previous[index].cents,
  }))
}

export interface BurnRate {
  /** Lo que tocaría gastar al día para cuadrar con el presupuesto. */
  targetPerDayCents: Cents
  actualPerDayCents: Cents
  /** >1 significa ir por encima del ritmo previsto. */
  pace: number
  daysElapsed: number
  daysTotal: number
  projectedTotalCents: Cents
}

/** Ritmo de gasto de un viaje o proyecto con presupuesto y fechas. */
export function burnRate(
  spentCents: Cents,
  budgetCents: Cents,
  from: DayKey,
  to: DayKey
): BurnRate {
  const today = toDayKey()
  const daysTotal = Math.max(1, daysBetween(from, to))
  const clamped = today < from ? from : today > to ? to : today
  const daysElapsed = Math.max(1, daysBetween(from, clamped))

  const targetPerDayCents = budgetCents > 0 ? Math.round(budgetCents / daysTotal) : 0
  const actualPerDayCents = Math.round(spentCents / daysElapsed)

  return {
    targetPerDayCents,
    actualPerDayCents,
    pace: targetPerDayCents > 0 ? actualPerDayCents / targetPerDayCents : 0,
    daysElapsed,
    daysTotal,
    projectedTotalCents: actualPerDayCents * daysTotal,
  }
}

/**
 * Cuándo tiene sentido enseñar la proyección de cierre de mes.
 *
 * La extrapolación lineal miente en dos casos y los dos se dan a menudo:
 *  1. Al principio del mes. Con dos días transcurridos, cualquier cifra se
 *     multiplica por quince.
 *  2. Cuando un gasto puntual domina el total. Un alquiler de 900 € el día 1
 *     proyecta 27.000 € al mes, que no es información: es ruido con pinta de
 *     dato.
 * En ambos casos la interfaz enseña otra cosa en vez de una cifra falsa.
 */
export const MIN_DAYS_FOR_PROJECTION = 6
const MAX_SINGLE_EXPENSE_SHARE = 0.3

export function projectionIsMeaningful(month: MonthKey, expenses: Expense[] = []): boolean {
  const today = toDayKey()
  const { from, to } = monthRange(month)
  if (today < from) return false

  if (today <= to && daysBetween(from, today) < MIN_DAYS_FOR_PROJECTION) return false

  const total = totalSpent(expenses)
  if (total > 0) {
    const top = biggest(expenses)
    if (top && top.amountCents / total > MAX_SINGLE_EXPENSE_SHARE) return false
  }

  return true
}
