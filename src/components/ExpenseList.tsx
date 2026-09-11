import { Fragment } from 'react'
import { formatMoney } from '@/lib/money'
import { formatDayHeading } from '@/lib/dates'
import { useAppData } from '@/app/store'
import type { Expense } from '@/db/types'
import './ExpenseList.css'

/**
 * Lista de movimientos agrupada por día, con el total de cada día en la
 * cabecera. Agrupar por día es la forma en que la gente recuerda el gasto
 * ("el sábado me pasé"), y el total diario responde esa pregunta sin abrir nada.
 */
export function ExpenseList({
  expenses,
  onSelect,
  showSpace = false,
}: {
  expenses: Expense[]
  onSelect: (expense: Expense) => void
  /** En la vista global interesa saber a qué apartado fue cada gasto. */
  showSpace?: boolean
}) {
  const { methodById, categoryById, spaceById } = useAppData()

  const groups: Array<{ day: string; items: Expense[]; total: number }> = []
  for (const expense of expenses) {
    let group = groups.at(-1)
    if (!group || group.day !== expense.day) {
      group = { day: expense.day, items: [], total: 0 }
      groups.push(group)
    }
    group.items.push(expense)
    group.total += expense.kind === 'expense' ? expense.amountCents : -expense.amountCents
  }

  return (
    <div className="explist">
      {groups.map((group) => (
        <Fragment key={group.day}>
          <header className="explist-day">
            <span>{formatDayHeading(group.day)}</span>
            <span className="explist-day-total num">{formatMoney(group.total)}</span>
          </header>

          <ul className="explist-items">
            {group.items.map((expense) => {
              const category = categoryById(expense.categoryId)
              const method = methodById(expense.methodId)
              const space = showSpace ? spaceById(expense.spaceId) : undefined

              return (
                <li key={expense.id}>
                  <button type="button" className="exprow" onClick={() => onSelect(expense)}>
                    <span
                      className="exprow-icon"
                      style={{
                        background: `color-mix(in srgb, var(--space-${category?.colorIndex ?? 0}) 18%, transparent)`,
                      }}
                    >
                      {category?.emoji ?? '💸'}
                    </span>

                    <span className="exprow-main">
                      <span className="exprow-concept">{expense.concept}</span>
                      <span className="exprow-meta">
                        {method?.emoji} {method?.name}
                        {space && ` · ${space.emoji} ${space.name}`}
                        {expense.source !== 'manual' && ' · importado'}
                      </span>
                    </span>

                    <span
                      className={`exprow-amount num ${
                        expense.kind === 'income' ? 'exprow-amount--income' : ''
                      }`}
                    >
                      {expense.kind === 'income' ? '+' : ''}
                      {formatMoney(expense.amountCents)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Fragment>
      ))}
    </div>
  )
}
