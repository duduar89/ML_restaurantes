import { useMemo, useState } from 'react'
import { ChartFrame } from '@/components/charts/ChartFrame'
import { Bars } from '@/components/charts/Bars'
import { RankList } from '@/components/charts/RankList'
import { Donut } from '@/components/charts/Donut'
import { TrendLines } from '@/components/charts/TrendLines'
import { CalendarHeat } from '@/components/charts/CalendarHeat'
import { Sparkline } from '@/components/charts/Sparkline'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { ExpenseList } from '@/components/ExpenseList'
import { useAppData } from '@/app/store'
import { useExpenses } from '@/hooks/useExpenses'
import {
  alignedCumulative,
  biggest,
  countBy,
  dailySeries,
  groupBy,
  monthOverMonth,
  ranked,
  rollingAverage,
  totalSpent,
  type Bucket,
} from '@/lib/analytics'
import { formatMoney, percentChange } from '@/lib/money'
import {
  addMonths,
  currentMonthKey,
  daysBetween,
  formatMonth,
  formatMonthAbbr,
  lastMonths,
  monthRange,
  toDayKey,
  toMonthKey,
  type MonthKey,
} from '@/lib/dates'
import type { Expense } from '@/db/types'
import type { Cents } from '@/lib/money'
import './StatsScreen.css'

/**
 * Los módulos de análisis. Cada gráfica responde a UNA pregunta concreta:
 * ¿voy a más o a menos?, ¿en qué se me va?, ¿cómo pago?, ¿qué días gasto?
 * Una gráfica que no responde a una pregunta es decoración con coste.
 */
const MONTHS_IN_HISTORY = 6

/**
 * Variación mes a mes en una columna estrecha.
 *
 * Partiendo de casi cero, el porcentaje se dispara y deja de informar: pasar
 * de 2 € a 40 € es un +1900 % que sólo dice que antes no había nada. En ese
 * caso se enseña "nuevo", y por encima de mil por ciento se corta para que la
 * columna no se descuadre.
 */
function formatDelta(percent: number | null, previousCents: number): string {
  if (percent === null) return 'nuevo'
  if (previousCents < 500) return 'nuevo'
  if (percent > 999) return '+999%'
  if (percent < -999) return '−999%'
  return `${percent > 0 ? '+' : ''}${percent.toFixed(0)}%`
}

export function StatsScreen({ onSelectExpense }: { onSelectExpense: (expense: Expense) => void }) {
  const { categoryById, methodById, spaceById, spaces } = useAppData()
  const [month, setMonth] = useState<MonthKey>(currentMonthKey())
  const [filterSpaceId, setFilterSpaceId] = useState<string | null>(null)
  const [dayFocus, setDayFocus] = useState<string | null>(null)

  const range = monthRange(month)
  const previousMonth = addMonths(month, -1)
  const previousRange = monthRange(previousMonth)
  const historyFrom = monthRange(addMonths(month, -(MONTHS_IN_HISTORY - 1))).from

  const monthExpenses = useExpenses({ spaceId: filterSpaceId, from: range.from, to: range.to })
  const previousExpenses = useExpenses({
    spaceId: filterSpaceId,
    from: previousRange.from,
    to: previousRange.to,
  })
  const historyExpenses = useExpenses({ spaceId: filterSpaceId, from: historyFrom, to: range.to })

  const data = useMemo(() => {
    const list = monthExpenses ?? []
    const spent = totalSpent(list)
    const previousSpent = totalSpent(previousExpenses ?? [])

    const monthTotals = groupBy(historyExpenses ?? [], (expense) => toMonthKey(expense.day))
    const months: Bucket[] = lastMonths(MONTHS_IN_HISTORY, month).map((key) => ({
      key,
      label: formatMonthAbbr(key),
      cents: monthTotals.get(key) ?? 0,
      count: 0,
    }))

    const categories = ranked(
      groupBy(list, (expense) => expense.categoryId),
      countBy(list, (expense) => expense.categoryId),
      (key) => categoryById(key)?.name ?? 'Sin categoría'
    )

    const methods = ranked(
      groupBy(list, (expense) => expense.methodId),
      countBy(list, (expense) => expense.methodId),
      (key) => methodById(key)?.name ?? 'Otro'
    )

    const spacesRank = ranked(
      groupBy(list, (expense) => expense.spaceId),
      countBy(list, (expense) => expense.spaceId),
      (key) => spaceById(key)?.name ?? 'Apartado'
    )

    // Serie de seis meses por categoría: es lo que permite ver si una
    // categoría se está desmadrando o si el mes malo fue una excepción.
    const months6 = lastMonths(MONTHS_IN_HISTORY, month)
    const perCategory = new Map<string, Map<MonthKey, Cents>>()
    for (const expense of historyExpenses ?? []) {
      if (expense.kind !== 'expense') continue
      let byMonthKey = perCategory.get(expense.categoryId)
      if (!byMonthKey) {
        byMonthKey = new Map()
        perCategory.set(expense.categoryId, byMonthKey)
      }
      const key = toMonthKey(expense.day)
      byMonthKey.set(key, (byMonthKey.get(key) ?? 0) + expense.amountCents)
    }

    const trends = categories.slice(0, 4).map((item) => {
      const byMonthKey = perCategory.get(item.key) ?? new Map<MonthKey, Cents>()
      const series: Bucket[] = months6.map((key) => ({
        key,
        label: formatMonthAbbr(key),
        cents: byMonthKey.get(key) ?? 0,
        count: 0,
      }))
      const current = series.at(-1)?.cents ?? 0
      const previous = series.at(-2)?.cents ?? 0
      return { ...item, series, delta: percentChange(current, previous) }
    })

    const daily = dailySeries(list, range.from, range.to)
    const previousDaily = dailySeries(previousExpenses ?? [], previousRange.from, previousRange.to)
    const isCurrent = month === currentMonthKey()
    const throughDay = isCurrent ? daysBetween(range.from, toDayKey()) : daily.length

    return {
      spent,
      previousSpent,
      delta: monthOverMonth(spent, previousSpent),
      months,
      categories,
      // Como mucho cinco porciones: por encima de eso un donut en un móvil es
      // ilegible. `ranked` agrupa el resto en "Otros".
      donut: ranked(
        groupBy(list, (expense) => expense.categoryId),
        countBy(list, (expense) => expense.categoryId),
        (key) => categoryById(key)?.name ?? 'Sin categoría',
        5
      ),
      methods,
      spacesRank,
      daily,
      trends,
      averageLine: rollingAverage(daily, 7),
      aligned: alignedCumulative(daily, previousDaily, throughDay),
      top: biggest(list),
    }
  }, [
    monthExpenses,
    previousExpenses,
    historyExpenses,
    month,
    range.from,
    range.to,
    previousRange.from,
    previousRange.to,
    categoryById,
    methodById,
    spaceById,
  ])

  const change = percentChange(data.spent, data.previousSpent)
  const focusedExpenses = dayFocus
    ? (monthExpenses ?? []).filter((expense) => expense.day === dayFocus)
    : []

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="screen-title">Análisis</h1>
        <MonthSwitcher month={month} onChange={setMonth} />
      </header>

      <div className="screen-body">
        <div className="home-filters">
          <button
            type="button"
            className={`home-filter ${filterSpaceId === null ? 'home-filter--active' : ''}`}
            onClick={() => setFilterSpaceId(null)}
          >
            Todo
          </button>
          {spaces.map((space) => (
            <button
              key={space.id}
              type="button"
              className={`home-filter ${filterSpaceId === space.id ? 'home-filter--active' : ''}`}
              style={{ '--filter-accent': `var(--space-${space.colorIndex})` } as React.CSSProperties}
              onClick={() => setFilterSpaceId(space.id)}
            >
              {space.emoji} {space.name}
            </button>
          ))}
        </div>

        {data.spent === 0 && data.previousSpent === 0 ? (
          <div className="empty">
            <span className="empty-emoji">📊</span>
            <p className="empty-title">Todavía no hay nada que comparar</p>
            <p className="empty-text">
              En cuanto apuntes unos cuantos gastos, aquí verás en qué se te va el dinero y cómo
              cambia de un mes a otro.
            </p>
          </div>
        ) : (
          <>
            <ChartFrame
              title="Mes a mes"
              hint={`Últimos ${MONTHS_IN_HISTORY} meses`}
              summary={`Gasto de los últimos ${MONTHS_IN_HISTORY} meses. En ${formatMonth(month)} llevas ${formatMoney(data.spent)}.`}
              data={data.months}
            >
              <Bars data={data.months} activeKey={month} onSelect={(key) => setMonth(key)} />
            </ChartFrame>

            <ChartFrame
              title="Ritmo del mes"
              hint="Acumulado frente al mes anterior"
              summary={
                change === null
                  ? `Acumulado de ${formatMonth(month)}: ${formatMoney(data.spent)}.`
                  : `Acumulado de ${formatMonth(month)}: ${formatMoney(data.spent)}, un ${Math.abs(change).toFixed(0)}% ${data.delta.direction === 'up' ? 'más' : 'menos'} que el mes anterior.`
              }
              data={data.daily}
            >
              <TrendLines
                points={data.aligned}
                currentLabel={formatMonthAbbr(month)}
                previousLabel={formatMonthAbbr(previousMonth)}
              />
            </ChartFrame>

            {data.categories.length > 0 && (
              <ChartFrame
                title="En qué se te va"
                summary={`Reparto por categoría. La mayor es ${data.categories[0].label} con ${formatMoney(data.categories[0].cents)}.`}
                data={data.categories}
              >
                <div className="stats-split">
                  <Donut
                    data={data.donut}
                    total={data.spent}
                    centerLabel="este mes"
                    colorIndex={(key) => categoryById(key)?.colorIndex ?? 0}
                  />
                  <div className="stats-split-list">
                    <RankList
                      data={data.categories.slice(0, 5)}
                      total={data.spent}
                      emoji={(key) => categoryById(key)?.emoji}
                      colorIndex={(key) => categoryById(key)?.colorIndex ?? 0}
                    />
                  </div>
                </div>
              </ChartFrame>
            )}

            <ChartFrame
              title="Qué días gastas"
              hint="Cuanto más intenso, más gasto ese día"
              summary={`Mapa de calor del gasto diario de ${formatMonth(month)}.`}
              data={data.daily}
            >
              <CalendarHeat month={month} series={data.daily} onSelectDay={setDayFocus} />
            </ChartFrame>

            {dayFocus && focusedExpenses.length > 0 && (
              <section className="stats-focus">
                <header className="stats-focus-head">
                  <span>Movimientos del día</span>
                  <button type="button" onClick={() => setDayFocus(null)}>
                    Cerrar
                  </button>
                </header>
                <ExpenseList expenses={focusedExpenses} onSelect={onSelectExpense} showSpace />
              </section>
            )}

            {data.trends.some((trend) => trend.series.some((point) => point.cents > 0)) && (
              <ChartFrame
                title="Cómo evoluciona cada cosa"
                hint={`Tus ${data.trends.length} mayores categorías, últimos ${MONTHS_IN_HISTORY} meses`}
                summary={`Evolución de las mayores categorías en los últimos ${MONTHS_IN_HISTORY} meses.`}
                data={data.categories.slice(0, 4)}
              >
                <ul className="trends">
                  {data.trends.map((trend) => (
                    <li key={trend.key} className="trends-row">
                      <span className="trends-name">
                        {categoryById(trend.key)?.emoji} {trend.label}
                      </span>
                      <Sparkline
                        data={trend.series}
                        color={`var(--space-${categoryById(trend.key)?.colorIndex ?? 0})`}
                      />
                      <span
                        className={`trends-delta ${
                          trend.delta === null
                            ? ''
                            : trend.delta > 0
                              ? 'trends-delta--up'
                              : 'trends-delta--down'
                        }`}
                      >
                        {formatDelta(trend.delta, trend.series.at(-2)?.cents ?? 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </ChartFrame>
            )}

            {data.methods.length > 0 && (
              <ChartFrame
                title="Cómo pagas"
                hint="Lo que va en efectivo es lo único que hay que apuntar sí o sí"
                summary={`Reparto por método de pago. El más usado es ${data.methods[0].label}.`}
                data={data.methods}
              >
                <RankList
                  data={data.methods}
                  total={data.spent}
                  emoji={(key) => methodById(key)?.emoji}
                />
              </ChartFrame>
            )}

            {filterSpaceId === null && data.spacesRank.length > 1 && (
              <ChartFrame
                title="Por apartado"
                summary={`Reparto del mes entre apartados. El mayor es ${data.spacesRank[0].label}.`}
                data={data.spacesRank}
              >
                <RankList
                  data={data.spacesRank}
                  total={data.spent}
                  emoji={(key) => spaceById(key)?.emoji}
                  colorIndex={(key) => spaceById(key)?.colorIndex ?? 0}
                />
              </ChartFrame>
            )}

            {data.top && (
              <section className="chart-card stats-top">
                <h3 className="chart-title">El mayor del mes</h3>
                <p className="stats-top-concept">
                  {categoryById(data.top.categoryId)?.emoji} {data.top.concept}
                </p>
                <p className="stats-top-amount num">{formatMoney(data.top.amountCents)}</p>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
