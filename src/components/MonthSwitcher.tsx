import { addMonths, currentMonthKey, formatMonth, type MonthKey } from '@/lib/dates'
import { haptic } from '@/hooks/useHaptics'
import { ChevronLeft, ChevronRight } from './Icons'
import './MonthSwitcher.css'

/**
 * Navegación entre meses. No deja avanzar más allá del mes en curso: no hay
 * nada que ver en el futuro y adelantarse sólo produce pantallas vacías.
 */
export function MonthSwitcher({
  month,
  onChange,
}: {
  month: MonthKey
  onChange: (month: MonthKey) => void
}) {
  const atCurrent = month >= currentMonthKey()

  return (
    <div className="monthsw">
      <button
        type="button"
        className="monthsw-arrow"
        aria-label="Mes anterior"
        onClick={() => {
          haptic('tap')
          onChange(addMonths(month, -1))
        }}
      >
        <ChevronLeft size={18} />
      </button>
      <span className="monthsw-label">{formatMonth(month)}</span>
      <button
        type="button"
        className="monthsw-arrow"
        aria-label="Mes siguiente"
        disabled={atCurrent}
        onClick={() => {
          haptic('tap')
          onChange(addMonths(month, 1))
        }}
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
