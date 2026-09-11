import { useLiveQuery } from 'dexie-react-hooks'
import { listExpenses, recentExpenses } from '@/db/repo'
import type { Expense } from '@/db/types'
import type { DayKey } from '@/lib/dates'

/**
 * Gastos de un rango, reactivos. Se consulta por rango (no todo el histórico)
 * porque el índice [spaceId+day] de Dexie lo resuelve sin recorrer la tabla.
 */
export function useExpenses(range: {
  spaceId?: string | null
  from?: DayKey
  to?: DayKey
}): Expense[] | undefined {
  const { spaceId, from, to } = range
  return useLiveQuery(
    () => listExpenses({ spaceId, from, to }),
    [spaceId, from, to],
    undefined as Expense[] | undefined
  )
}

/** Conceptos recientes distintos: alimentan las sugerencias de alta rápida. */
export function useRecentExpenses(limit = 8, spaceId?: string | null): Expense[] {
  return useLiveQuery(() => recentExpenses(limit, spaceId), [limit, spaceId], [] as Expense[])
}
