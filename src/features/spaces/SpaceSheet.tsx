import { useEffect, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { addSpace, updateSpace } from '@/db/repo'
import { parseAmount, formatAmount } from '@/lib/money'
import { toDayKey, type DayKey } from '@/lib/dates'
import { haptic } from '@/hooks/useHaptics'
import type { Space, SpaceKind } from '@/db/types'
import './SpaceSheet.css'

/**
 * Crear o editar un apartado.
 *
 * Un apartado es "un trozo de tu vida con cuenta propia": el día a día, un
 * viaje, una reforma. Los de tipo viaje o proyecto admiten presupuesto y
 * fechas; con fechas que incluyan hoy, la app apunta ahí por defecto.
 */
const EMOJIS = ['✈️', '🏖️', '🏔️', '🎒', '🏡', '🔨', '🚗', '🎓', '💍', '🎁', '🐣', '🎸', '🍼', '🏥', '💻', '🎉']
const COLORS = [0, 1, 2, 3, 4, 5, 6, 7]

const KINDS: Array<{ id: SpaceKind; label: string; hint: string }> = [
  { id: 'trip', label: 'Viaje', hint: 'Con fechas y presupuesto' },
  { id: 'project', label: 'Proyecto', hint: 'Una reforma, una obra…' },
  { id: 'life', label: 'General', hint: 'Sin fechas' },
]

export function SpaceSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: Space | null
}) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('✈️')
  const [colorIndex, setColorIndex] = useState(1)
  const [kind, setKind] = useState<SpaceKind>('trip')
  const [budget, setBudget] = useState('')
  const [startDay, setStartDay] = useState<DayKey | ''>('')
  const [endDay, setEndDay] = useState<DayKey | ''>('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setEmoji(editing.emoji)
      setColorIndex(editing.colorIndex)
      setKind(editing.kind)
      setBudget(editing.budgetCents > 0 ? formatAmount(editing.budgetCents) : '')
      setStartDay(editing.startDay ?? '')
      setEndDay(editing.endDay ?? '')
    } else {
      setName('')
      setEmoji('✈️')
      setColorIndex(1)
      setKind('trip')
      setBudget('')
      setStartDay(toDayKey())
      setEndDay('')
    }
  }, [open, editing])

  const withDates = kind !== 'life'
  const canSave = name.trim().length > 0

  async function save() {
    if (!canSave) return

    const payload = {
      name,
      emoji,
      colorIndex,
      kind,
      budgetCents: parseAmount(budget) ?? 0,
      startDay: withDates && startDay ? startDay : null,
      endDay: withDates && endDay ? endDay : null,
    }

    if (editing) {
      await updateSpace(editing.id, payload)
      toast.show('Apartado actualizado')
    } else {
      await addSpace(payload)
      toast.show(`Apartado «${name.trim()}» creado`)
    }
    haptic('success')
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={editing ? 'Editar apartado' : 'Nuevo apartado'}>
      <div className="spacesheet">
        <label className="field">
          <span className="field-label">Nombre</span>
          <input
            className="field-input"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Viaje a Japón"
            enterKeyHint="done"
            maxLength={40}
          />
        </label>

        <div className="field">
          <span className="field-label">Icono</span>
          <div className="emoji-grid">
            {EMOJIS.map((option) => (
              <button
                key={option}
                type="button"
                className={`emoji-cell ${option === emoji ? 'emoji-cell--active' : ''}`}
                onClick={() => setEmoji(option)}
                aria-label={`Icono ${option}`}
                aria-pressed={option === emoji}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Color</span>
          <div className="color-row">
            {COLORS.map((index) => (
              <button
                key={index}
                type="button"
                className={`color-dot ${index === colorIndex ? 'color-dot--active' : ''}`}
                style={{ background: `var(--space-grad-${index})` }}
                onClick={() => setColorIndex(index)}
                aria-label={`Color ${index + 1}`}
                aria-pressed={index === colorIndex}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <span className="field-label">Tipo</span>
          <div className="kind-row">
            {KINDS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`kind-card ${option.id === kind ? 'kind-card--active' : ''}`}
                onClick={() => setKind(option.id)}
                aria-pressed={option.id === kind}
              >
                <strong>{option.label}</strong>
                <span>{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Presupuesto (opcional)</span>
          <input
            className="field-input num"
            type="text"
            /* decimal + coma: en es-ES el separador decimal es la coma y el
               teclado numérico del móvil debe ofrecerla. */
            inputMode="decimal"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
            placeholder="0,00"
            enterKeyHint="done"
          />
        </label>

        {withDates && (
          <div className="field-row">
            <label className="field">
              <span className="field-label">Desde</span>
              <input
                className="field-input"
                type="date"
                value={startDay}
                onChange={(event) => setStartDay(event.target.value as DayKey)}
              />
            </label>
            <label className="field">
              <span className="field-label">Hasta</span>
              <input
                className="field-input"
                type="date"
                value={endDay}
                min={startDay || undefined}
                onChange={(event) => setEndDay(event.target.value as DayKey)}
              />
            </label>
          </div>
        )}

        <button type="button" className="sheet-cta" disabled={!canSave} onClick={() => void save()}>
          {editing ? 'Guardar cambios' : 'Crear apartado'}
        </button>
      </div>
    </Sheet>
  )
}
