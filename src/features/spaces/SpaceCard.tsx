import { formatMoney } from '@/lib/money'
import { budgetStatus } from '@/lib/analytics'
import { daysBetween, formatDayShort, toDayKey } from '@/lib/dates'
import type { Space } from '@/db/types'
import './SpaceCard.css'

/**
 * Tarjeta de un apartado. El color del apartado manda: es lo que permite
 * reconocerlo de un vistazo en la lista, en las gráficas y en los movimientos.
 */
export function SpaceCard({
  space,
  spentCents,
  count,
}: {
  space: Space
  spentCents: number
  count: number
}) {
  const status = space.budgetCents > 0 ? budgetStatus(space.budgetCents, spentCents, null) : null
  const timing = describeTiming(space)

  return (
    <article className="spacecard" style={{ '--card-grad': `var(--space-grad-${space.colorIndex})` } as React.CSSProperties}>
      <div className="spacecard-top">
        <span className="spacecard-emoji">{space.emoji}</span>
        <div className="spacecard-id">
          <h2 className="spacecard-name">{space.name}</h2>
          <p className="spacecard-meta">
            {count} movimiento{count === 1 ? '' : 's'}
            {timing && ` · ${timing}`}
          </p>
        </div>
      </div>

      <p className="spacecard-total num">{formatMoney(spentCents)}</p>

      {status && (
        <div className="spacecard-budget">
          <div className="spacecard-track">
            <span
              className={`spacecard-fill spacecard-fill--${status.state}`}
              style={{ width: `${Math.min(100, status.ratio * 100)}%` }}
            />
          </div>
          <span className="spacecard-left num">
            {status.remainingCents >= 0
              ? `Quedan ${formatMoney(status.remainingCents)}`
              : `${formatMoney(-status.remainingCents)} de más`}
          </span>
        </div>
      )}
    </article>
  )
}

/** "Faltan 12 días", "Día 3 de 7" o "Terminado el 4 mar". */
function describeTiming(space: Space): string | null {
  if (!space.startDay || !space.endDay) return null
  const today = toDayKey()

  if (today < space.startDay) {
    return `Empieza en ${daysBetween(today, space.startDay) - 1} días`
  }
  if (today > space.endDay) {
    return `Terminó el ${formatDayShort(space.endDay)}`
  }
  return `Día ${daysBetween(space.startDay, today)} de ${daysBetween(space.startDay, space.endDay)}`
}
