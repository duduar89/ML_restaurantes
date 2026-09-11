import { describe, expect, it } from 'vitest'
import {
  alignedCumulative,
  budgetStatus,
  burnRate,
  cumulativeSeries,
  dailySeries,
  ranked,
  projectionIsMeaningful,
  rollingAverage,
  type Bucket,
} from '../analytics'
import { sum } from '../money'
import type { Expense } from '@/db/types'

function bucket(cents: number, index = 0): Bucket {
  return { key: `d${index}`, label: String(index), cents, count: 0 }
}

function expense(partial: Partial<Expense>): Expense {
  return {
    id: 'x',
    spaceId: 's',
    amountCents: 100,
    kind: 'expense',
    concept: 'c',
    methodId: 'm',
    categoryId: 'k',
    day: '2026-09-01',
    note: '',
    source: 'manual',
    externalId: null,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: 0,
    ...partial,
  }
}

describe('dailySeries', () => {
  it('rellena con cero los días sin gasto', () => {
    // Sin los ceros, cualquier media posterior se calcula sólo sobre los días
    // con gasto y sale inflada.
    const series = dailySeries(
      [expense({ day: '2026-09-01' }), expense({ day: '2026-09-03', amountCents: 500 })],
      '2026-09-01',
      '2026-09-04'
    )
    expect(series).toHaveLength(4)
    expect(series.map((b) => b.cents)).toEqual([100, 0, 500, 0])
  })

  it('ignora los ingresos al sumar gasto', () => {
    const series = dailySeries(
      [expense({ day: '2026-09-01' }), expense({ day: '2026-09-01', kind: 'income', amountCents: 900 })],
      '2026-09-01',
      '2026-09-01'
    )
    expect(series[0].cents).toBe(100)
  })
})

describe('cumulativeSeries', () => {
  it('acumula', () => {
    const out = cumulativeSeries([bucket(100, 0), bucket(50, 1), bucket(0, 2)])
    expect(out.map((b) => b.cents)).toEqual([100, 150, 150])
  })
})

describe('rollingAverage', () => {
  it('promedia sobre la serie con ceros incluidos', () => {
    const series = [10, 0, 20, 0, 0, 30, 0].map((cents, i) => bucket(cents, i))
    const avg = rollingAverage(series, 3)
    expect(avg[0].cents).toBe(10)
    expect(avg[2].cents).toBe(10) // (10+0+20)/3
    expect(avg[5].cents).toBe(10) // (0+0+30)/3
  })
})

describe('alignedCumulative', () => {
  const long = Array.from({ length: 31 }, (_, i) => bucket(100, i))
  const short = Array.from({ length: 28 }, (_, i) => bucket(50, i))

  it('se trunca al mes más corto en vez de comparar días que no existen', () => {
    const aligned = alignedCumulative(long, short, 10)
    expect(aligned).toHaveLength(28)
    expect(aligned[27].previousCents).toBe(1400)
  })

  it('corta la línea del mes en curso en el día de hoy', () => {
    // Aplanarla hasta fin de mes se leería como "he dejado de gastar".
    const aligned = alignedCumulative(long, short, 10)
    expect(aligned[9].currentCents).toBe(1000)
    expect(aligned[10].currentCents).toBeNull()
  })
})

describe('budgetStatus', () => {
  it('marca el aviso y el exceso', () => {
    expect(budgetStatus(10000, 1000, 9).state).toBe('ok')
    expect(budgetStatus(10000, 9000, 2).state).toBe('warn')
    expect(budgetStatus(10000, 12000, 5).state).toBe('over')
  })

  it('reparte lo que queda entre los días que faltan', () => {
    expect(budgetStatus(10000, 1000, 9).perDayLeftCents).toBe(1000)
  })

  it('no recomienda ritmo si ya te has pasado', () => {
    const over = budgetStatus(10000, 12000, 5)
    expect(over.remainingCents).toBe(-2000)
    expect(over.perDayLeftCents).toBeNull()
  })
})

describe('burnRate', () => {
  it('reparte el presupuesto del viaje entre sus días', () => {
    const pace = burnRate(30000, 70000, '2026-09-01', '2026-09-07')
    expect(pace.daysTotal).toBe(7)
    expect(pace.targetPerDayCents).toBe(10000)
  })
})

describe('ranked', () => {
  it('agrupa la cola en «Otros» sin perder un céntimo', () => {
    const totals = new Map([['a', 500], ['b', 300], ['c', 100], ['d', 50], ['e', 25], ['f', 25]])
    const top = ranked(totals, new Map(), (key) => key, 3)
    expect(top).toHaveLength(3)
    expect(top[2].key).toBe('__otros__')
    expect(sum(top.map((b) => b.cents))).toBe(1000)
  })

  it('no toca la lista si cabe entera', () => {
    const totals = new Map([['a', 5], ['b', 3]])
    expect(ranked(totals, new Map(), (key) => key, 5)).toHaveLength(2)
  })
})

describe('projectionIsMeaningful', () => {
  it('no proyecta cuando un gasto puntual domina el total', () => {
    // Un alquiler el día 1 proyectaría una cifra absurda para todo el mes.
    const withRent = [
      expense({ day: '2026-09-01', amountCents: 90000 }),
      expense({ day: '2026-09-02', amountCents: 2000 }),
    ]
    // Mes ya cerrado: sin el guardia del gasto puntual, daría true.
    expect(projectionIsMeaningful('2020-01', withRent)).toBe(false)
  })

  it('proyecta un mes pasado con gasto repartido', () => {
    const spread = Array.from({ length: 10 }, (_, i) =>
      expense({ day: `2020-01-0${(i % 9) + 1}`, amountCents: 1000 })
    )
    expect(projectionIsMeaningful('2020-01', spread)).toBe(true)
  })

  it('no proyecta un mes futuro', () => {
    expect(projectionIsMeaningful('2099-01', [])).toBe(false)
  })
})
