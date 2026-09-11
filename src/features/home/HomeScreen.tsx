import { useMemo, useState } from 'react'
import { LogoLockup } from '@/brand/Logo'
import { ExpenseList } from '@/components/ExpenseList'
import { ProgressBar } from '@/components/charts/ProgressBar'
import { MonthSwitcher } from '@/components/MonthSwitcher'
import { useAppData } from '@/app/store'
import { useExpenses } from '@/hooks/useExpenses'
import { patchSettings } from '@/db/repo'
import {
  biggest,
  budgetStatus,
  dailyAverage,
  monthOverMonth,
  projectMonthEnd,
  projectionIsMeaningful,
  totalIncome,
  totalSpent,
} from '@/lib/analytics'
import { formatMoney, formatMoneyCompact, percentChange } from '@/lib/money'
import {
  addMonths,
  currentMonthKey,
  daysBetween,
  daysInMonth,
  monthRange,
  toDayKey,
  type MonthKey,
} from '@/lib/dates'
import type { Expense } from '@/db/types'
import './HomeScreen.css'

/**
 * Pantalla principal: cuánto llevas gastado este mes y qué has apuntado.
 * Un solo número grande arriba —la pregunta que uno se hace al abrir la app—
 * y debajo el detalle.
 */
export function HomeScreen({
  onSelectExpense,
  onAdd,
}: {
  onSelectExpense: (expense: Expense) => void
  onAdd: () => void
}) {
  const { spaces, settings } = useAppData()
  const [month, setMonth] = useState<MonthKey>(currentMonthKey())
  /** null = todos los apartados juntos. */
  const [filterSpaceId, setFilterSpaceId] = useState<string | null>(null)

  const range = monthRange(month)
  const previousRange = monthRange(addMonths(month, -1))

  const expenses = useExpenses({ spaceId: filterSpaceId, from: range.from, to: range.to })
  const previousExpenses = useExpenses({
    spaceId: filterSpaceId,
    from: previousRange.from,
    to: previousRange.to,
  })

  const stats = useMemo(() => {
    const list = expenses ?? []
    const spent = totalSpent(list)
    const income = totalIncome(list)
    const previousSpent = totalSpent(previousExpenses ?? [])

    const today = toDayKey()
    const isCurrentMonth = month === currentMonthKey()
    const throughDay = isCurrentMonth ? today : range.to
    const elapsed = daysBetween(range.from, throughDay)

    return {
      spent,
      income,
      previousSpent,
      delta: monthOverMonth(spent, previousSpent),
      todaySpent: totalSpent(list.filter((expense) => expense.day === today)),
      top: biggest(list)?.amountCents ?? 0,
      average: dailyAverage(spent, range.from, throughDay),
      projected: projectMonthEnd(spent, month),
      showProjection: isCurrentMonth && projectionIsMeaningful(month, list),
      paceRatio: isCurrentMonth ? elapsed / daysInMonth(month) : null,
    }
  }, [expenses, previousExpenses, month, range.from, range.to])

  const budgetCents = settings?.monthlyBudgetCents ?? 0
  const showBudget = budgetCents > 0 && filterSpaceId === null
  const status = budgetStatus(budgetCents, stats.spent, null)
  const change = percentChange(stats.spent, stats.previousSpent)

  return (
    <div className="screen">
      <header className="screen-head">
        <LogoLockup size={28} />
        <MonthSwitcher month={month} onChange={setMonth} />
      </header>

      <div className="screen-body">
        <section className="hero">
          <p className="hero-label">Gastado este mes</p>
          <p className="hero-figure num">{formatMoney(stats.spent)}</p>

          {change !== null && (
            <p className={`hero-delta hero-delta--${stats.delta.direction}`}>
              {stats.delta.direction === 'up' ? '▲' : stats.delta.direction === 'down' ? '▼' : '='}{' '}
              {Math.abs(change).toFixed(0)}% respecto al mes anterior
            </p>
          )}

          {showBudget && (
            <div className="hero-budget">
              <ProgressBar
                compact
                status={status}
                paceRatio={stats.paceRatio}
                caption={stats.paceRatio !== null ? 'La marca, el ritmo de hoy' : undefined}
              />
            </div>
          )}
        </section>

        {/* Con el mes a cero las tres casillas dirían 0,00 € tres veces: en el
            primer arranque estorban más de lo que informan. */}
        {stats.spent > 0 && (
        <section className="quickstats">
          <Stat label="Hoy" value={statValue(stats.todaySpent)} />
          <Stat label="Media/día" value={statValue(stats.average)} />
          {stats.showProjection ? (
            <Stat label="Previsto" value={statValue(stats.projected)} />
          ) : stats.income > 0 ? (
            <Stat label="Ingresos" value={statValue(stats.income)} tone="positive" />
          ) : (
            // Ni previsión fiable ni ingresos: el mayor gasto del mes siempre
            // dice algo, y un "0,00 €" no dice nada.
            <Stat label="Mayor gasto" value={statValue(stats.top)} />
          )}
        </section>
        )}

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
              onClick={() => {
                setFilterSpaceId(space.id)
                // Elegir un apartado aquí también lo deja como destino por
                // defecto del siguiente gasto: "estoy en el viaje".
                void patchSettings({ activeSpaceId: space.id })
              }}
            >
              {space.emoji} {space.name}
            </button>
          ))}
        </div>

        {expenses === undefined ? null : expenses.length === 0 ? (
          <div className="empty">
            <span className="empty-emoji">🧾</span>
            <p className="empty-title">Aún no hay nada apuntado</p>
            <p className="empty-text">
              Toca el botón + y apunta tu primer gasto. Importe, método y concepto: la fecha se
              pone sola.
            </p>
            <button type="button" className="empty-cta" onClick={onAdd}>
              Apuntar un gasto
            </button>
          </div>
        ) : (
          <ExpenseList expenses={expenses} onSelect={onSelectExpense} showSpace={filterSpaceId === null} />
        )}
      </div>
    </div>
  )
}

/**
 * En una casilla de 100 px no caben céntimos de una cifra de cuatro dígitos.
 * A partir de 1.000 € se redondean: la precisión al céntimo no aporta nada en
 * una media ni en una previsión, y en cambio recortar el número sí estorba.
 */
function statValue(cents: number): string {
  return cents >= 100_000 ? formatMoneyCompact(cents) : formatMoney(cents)
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'positive'
}) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value num ${tone === 'positive' ? 'stat-value--positive' : ''}`}>
        {value}
      </span>
    </div>
  )
}
