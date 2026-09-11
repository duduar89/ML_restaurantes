import { haptic } from '@/hooks/useHaptics'
import './Chips.css'

export interface ChipOption {
  id: string
  label: string
  emoji?: string
  /** Índice de la paleta de apartados; tiñe la píldora cuando está activa. */
  colorIndex?: number
}

/**
 * Fila de píldoras con scroll horizontal. Elegir método, categoría o apartado
 * es un toque, sin desplegables: un <select> en móvil abre una rueda del
 * sistema que rompe el ritmo del alta rápida.
 */
export function Chips({
  options,
  value,
  onChange,
  label,
  onAdd,
}: {
  options: ChipOption[]
  value: string | null
  onChange: (id: string) => void
  label: string
  /** Cuando existe, añade una píldora "+" al final de la fila. */
  onAdd?: () => void
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((option) => {
        const active = option.id === value
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            className={`chip ${active ? 'chip--active' : ''}`}
            style={
              active && option.colorIndex !== undefined
                ? ({ '--chip-accent': `var(--space-${option.colorIndex})` } as React.CSSProperties)
                : undefined
            }
            onClick={() => {
              haptic('tap')
              onChange(option.id)
            }}
          >
            {option.emoji && <span className="chip-emoji">{option.emoji}</span>}
            {option.label}
          </button>
        )
      })}
      {onAdd && (
        <button type="button" className="chip chip--add" onClick={onAdd} aria-label={`Añadir a ${label}`}>
          +
        </button>
      )}
    </div>
  )
}
