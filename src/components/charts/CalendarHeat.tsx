import { daysInMonth, formatDayShort, fromDayKey, type MonthKey } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { Bucket } from '@/lib/analytics'

/**
 * Mapa de calor de un MES. A propósito no hay vista de año: con 365 celdas en
 * 360 px cada una baja de 7 px, por debajo de lo legible y muy por debajo del
 * área mínima táctil.
 */
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

export function CalendarHeat({
  month,
  series,
  onSelectDay,
}: {
  month: MonthKey
  series: Bucket[]
  onSelectDay?: (day: string) => void
}) {
  const total = daysInMonth(month)
  const max = Math.max(1, ...series.map((bucket) => bucket.cents))
  const byDay = new Map(series.map((bucket) => [bucket.key, bucket.cents]))

  // getDay() devuelve 0 para domingo; en España la semana empieza en lunes.
  const firstWeekday = (fromDayKey(`${month}-01`).getDay() + 6) % 7

  return (
    <div className="heat">
      <div className="heat-weekdays">
        {WEEKDAYS.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>
      <div className="heat-grid">
        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`pad-${index}`} className="heat-cell heat-cell--pad" />
        ))}
        {Array.from({ length: total }, (_, index) => {
          const dayNumber = index + 1
          const day = `${month}-${String(dayNumber).padStart(2, '0')}`
          const cents = byDay.get(day) ?? 0
          // Escala en raíz cuadrada: con escala lineal un solo día caro deja
          // el resto del mes indistinguible del fondo.
          const intensity = cents === 0 ? 0 : Math.sqrt(cents / max)

          return (
            <button
              key={day}
              type="button"
              className="heat-cell"
              style={{ '--heat': intensity } as React.CSSProperties}
              onClick={onSelectDay ? () => onSelectDay(day) : undefined}
              disabled={!onSelectDay || cents === 0}
              aria-label={`${formatDayShort(day)}: ${formatMoney(cents)}`}
            >
              <span>{dayNumber}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
