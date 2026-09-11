import { formatMoney } from '@/lib/money'
import type { BudgetStatus } from '@/lib/analytics'

/**
 * Presupuesto en barra lineal con una marca de "ritmo": dónde deberías ir hoy
 * si el gasto fuese uniforme. Sin esa marca, un 60% consumido no dice nada —
 * es estupendo el día 25 y alarmante el día 8.
 */
export function ProgressBar({
  status,
  paceRatio,
  caption,
  compact = false,
}: {
  status: BudgetStatus
  /** Fracción del periodo transcurrida (0-1). null si el periodo no aplica. */
  paceRatio?: number | null
  caption?: string
  /**
   * Oculta la cifra de cabecera. Se usa cuando lo gastado ya preside la
   * pantalla justo encima: repetir el mismo número dos veces seguidas no
   * informa, sólo compite consigo mismo por la atención.
   */
  compact?: boolean
}) {
  const percent = Math.min(100, Math.round(status.ratio * 100))
  const overflow = status.ratio > 1

  return (
    <div className={`progress ${compact ? 'progress--compact' : ''}`}>
      <div className="progress-head">
        {compact ? (
          <span className="progress-budget num">Presupuesto {formatMoney(status.budgetCents)}</span>
        ) : (
          <>
            <span className="progress-spent num">{formatMoney(status.spentCents)}</span>
            <span className="progress-budget num">de {formatMoney(status.budgetCents)}</span>
          </>
        )}
      </div>

      <div
        className={`progress-track progress-track--${status.state}`}
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Presupuesto consumido"
      >
        <span className="progress-fill" style={{ translate: `${percent - 100}% 0` }} />
        {paceRatio !== null && paceRatio !== undefined && paceRatio > 0 && paceRatio < 1 && (
          <span
            className="progress-pace"
            style={{ left: `${Math.min(100, paceRatio * 100)}%` }}
            title="Ritmo previsto para hoy"
          />
        )}
      </div>

      <div className="progress-foot">
        <span className={overflow ? 'progress-over' : 'progress-left'}>
          {overflow
            ? `${formatMoney(-status.remainingCents)} de más`
            : `Quedan ${formatMoney(status.remainingCents)}`}
        </span>
        {caption && <span className="progress-caption">{caption}</span>}
      </div>
    </div>
  )
}
