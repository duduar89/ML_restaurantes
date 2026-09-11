import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  daysBetween,
  daysInMonth,
  lastMonths,
  monthRange,
  toDayKey,
  toMonthKey,
} from '../dates'

describe('toDayKey', () => {
  it('usa la fecha civil local, no la UTC', () => {
    // Un gasto a las 00:30 en Madrid es del día 5. Con toISOString() sería del
    // 4 y, a fin de mes, del mes anterior y del presupuesto equivocado.
    expect(toDayKey(new Date(2026, 8, 5, 0, 30))).toBe('2026-09-05')
    expect(toDayKey(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01')
  })
})

describe('aritmética de días y meses', () => {
  it('cruza meses y años bisiestos', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
  })

  it('no se descuadra con el cambio de hora', () => {
    // Último domingo de octubre: el día dura 25 horas en España.
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(3)
  })

  it('cuenta los extremos', () => {
    expect(daysBetween('2026-09-01', '2026-09-01')).toBe(1)
    expect(daysBetween('2026-09-01', '2026-09-30')).toBe(30)
  })
})

describe('rangos', () => {
  it('acota el mes con su último día real', () => {
    expect(monthRange('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    expect(monthRange('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(daysInMonth('2026-09')).toBe(30)
  })

  it('enumera los últimos meses en orden', () => {
    expect(lastMonths(3, '2026-01')).toEqual(['2025-11', '2025-12', '2026-01'])
  })

  it('extrae el mes de un día', () => {
    expect(toMonthKey('2026-09-05')).toBe('2026-09')
  })
})
