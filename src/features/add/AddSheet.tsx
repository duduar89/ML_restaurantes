import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '@/components/Sheet'
import { Keypad } from '@/components/Keypad'
import { Chips } from '@/components/Chips'
import { ChevronDown } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { useAppData } from '@/app/store'
import { useRecentExpenses } from '@/hooks/useExpenses'
import { addExpense, deleteExpense, suggestMethodForSpace, updateExpense } from '@/db/repo'
import { requestPersistence } from '@/lib/storage'
import { haptic } from '@/hooks/useHaptics'
import { parseAmount } from '@/lib/money'
import { formatDayShort, toDayKey, addDays, type DayKey } from '@/lib/dates'
import { guessCategoryId } from './guessCategory'
import type { Expense } from '@/db/types'
import './AddSheet.css'

/**
 * Alta (y edición) de un gasto. Toda la pantalla está diseñada alrededor de un
 * objetivo: importe, método, concepto y guardar en menos de cinco segundos.
 * Por eso el método y el apartado vienen ya elegidos, la fecha es hoy sin
 * preguntar y la categoría se adivina del concepto.
 */
export function AddSheet({
  open,
  onClose,
  editing,
}: {
  open: boolean
  onClose: () => void
  editing?: Expense | null
}) {
  const { methods, categories, spaces, settings, entrySpace } = useAppData()
  const toast = useToast()

  const [raw, setRaw] = useState('')
  const [concept, setConcept] = useState('')
  const [methodId, setMethodId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [day, setDay] = useState<DayKey>(toDayKey())
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  /** Una vez el usuario elige categoría a mano, la adivinanza deja de pisarla. */
  const [categoryTouched, setCategoryTouched] = useState(false)
  /**
   * Categoría, apartado y día empiezan plegados.
   *
   * Lo imprescindible para apuntar un gasto es importe, método y concepto: los
   * otros tres tienen un valor por defecto acertado casi siempre (la categoría
   * se adivina, el apartado es el activo, el día es hoy). Enseñarlos todos
   * dejaba el teclado y el botón de guardar fuera de pantalla en un móvil
   * normal, que es exactamente lo que rompe el alta en cinco segundos.
   */
  const [detailsOpen, setDetailsOpen] = useState(false)

  const recent = useRecentExpenses(6, null)

  // Al abrir: o se precarga el gasto que se edita, o se parte de los valores
  // por defecto (último método usado, apartado activo, hoy).
  useEffect(() => {
    if (!open) return
    if (editing) {
      setRaw(String(editing.amountCents / 100).replace('.', ','))
      setConcept(editing.concept)
      setMethodId(editing.methodId)
      setCategoryId(editing.categoryId)
      setSpaceId(editing.spaceId)
      setDay(editing.day)
      setKind(editing.kind)
      setCategoryTouched(true)
    } else {
      setRaw('')
      setConcept('')
      setMethodId(settings?.lastMethodId ?? methods[0]?.id ?? null)
      setCategoryId(categories[0]?.id ?? null)
      setSpaceId(entrySpace?.id ?? null)
      setDay(toDayKey())
      setKind('expense')
      setCategoryTouched(false)
      setDetailsOpen(false)
    }
  }, [open, editing, settings?.lastMethodId, methods, categories, entrySpace?.id])

  // Al cambiar de apartado, propone el método que más se usa ahí: en un viaje
  // suele ser efectivo y en el día a día tarjeta.
  useEffect(() => {
    if (!open || editing || !spaceId) return
    let cancelled = false
    void suggestMethodForSpace(spaceId).then((suggested) => {
      if (!cancelled && suggested) setMethodId(suggested)
    })
    return () => {
      cancelled = true
    }
  }, [open, editing, spaceId])

  // Adivina la categoría mientras se escribe, hasta que el usuario decida.
  useEffect(() => {
    if (categoryTouched || !concept) return
    const guess = guessCategoryId(concept, categories)
    if (guess) setCategoryId(guess)
  }, [concept, categories, categoryTouched])

  const amountCents = parseAmount(raw) ?? 0
  const canSave = amountCents > 0 && methodId !== null && categoryId !== null && spaceId !== null

  const display = useMemo(() => {
    if (!raw) return '0'
    // Se muestra tal cual se teclea (incluida la coma suelta de "12,") para
    // que el número del display sea exactamente lo que el usuario pulsó.
    return raw
  }, [raw])

  const today = toDayKey()
  const dayOptions: Array<{ key: DayKey; label: string }> = [
    { key: today, label: 'Hoy' },
    { key: addDays(today, -1), label: 'Ayer' },
    { key: addDays(today, -2), label: formatDayShort(addDays(today, -2)) },
  ]

  const selectedCategory = categories.find((category) => category.id === categoryId)
  const selectedSpace = spaces.find((space) => space.id === spaceId)
  const dayLabel = dayOptions.find((option) => option.key === day)?.label ?? formatDayShort(day)

  async function save() {
    if (!canSave || !methodId || !categoryId || !spaceId) return

    const category = categories.find((item) => item.id === categoryId)
    const finalConcept = concept.trim() || category?.name || 'Gasto'

    if (editing) {
      await updateExpense(editing.id, {
        amountCents,
        concept: finalConcept,
        methodId,
        categoryId,
        spaceId,
        day,
        kind,
      })
      haptic('success')
      toast.show('Gasto actualizado')
    } else {
      const id = await addExpense({
        amountCents,
        concept: finalConcept,
        methodId,
        categoryId,
        spaceId,
        day,
        kind,
      })
      haptic('success')
      toast.show(kind === 'income' ? 'Ingreso guardado' : 'Gasto guardado', {
        label: 'Deshacer',
        run: () => void deleteExpense(id),
      })
      // La petición de almacenamiento persistente se hace aquí, tras una
      // escritura real: es la señal de interés que Safari valora, y pedirla
      // al cargar la app se deniega casi siempre.
      void requestPersistence()
    }

    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} full>
      <div className="add">
        <header className="add-display">
          <button
            type="button"
            className={`add-kind ${kind === 'income' ? 'add-kind--income' : ''}`}
            onClick={() => setKind(kind === 'expense' ? 'income' : 'expense')}
          >
            {kind === 'expense' ? 'Gasto' : 'Ingreso'}
          </button>
          <div className={`add-amount num ${amountCents > 0 ? '' : 'add-amount--empty'}`}>
            <span>{display}</span>
            <span className="add-currency">€</span>
          </div>
        </header>

        <div className="add-fields">
          <input
            className="add-concept"
            type="text"
            value={concept}
            onChange={(event) => setConcept(event.target.value)}
            placeholder="¿En qué?"
            /* enterkeyhint + autoCapitalize: el teclado del móvil muestra
               "Listo" y capitaliza como un nombre propio, no como una frase. */
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoComplete="off"
            spellCheck={false}
            maxLength={60}
          />

          {!concept && recent.length > 0 && (
            <div className="add-recent">
              {recent.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="add-recent-chip"
                  onClick={() => {
                    // Repetir un gasto reciente rellena concepto, categoría y
                    // método de una vez: el caso "el café de siempre".
                    setConcept(item.concept)
                    setCategoryId(item.categoryId)
                    setMethodId(item.methodId)
                    setCategoryTouched(true)
                    haptic('tap')
                  }}
                >
                  {item.concept}
                </button>
              ))}
            </div>
          )}

          <Chips
            label="Método de pago"
            options={methods.map((method) => ({
              id: method.id,
              label: method.name,
              emoji: method.emoji,
            }))}
            value={methodId}
            onChange={setMethodId}
          />

          <button
            type="button"
            className="add-details-toggle"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
          >
            <span>
              {selectedCategory?.emoji} {selectedCategory?.name} · {selectedSpace?.emoji}{' '}
              {selectedSpace?.name} · {dayLabel}
            </span>
            <span className={`add-details-caret ${detailsOpen ? 'is-open' : ''}`}>
              <ChevronDown size={16} />
            </span>
          </button>

          {detailsOpen && (
            <>
              <Chips
                label="Categoría"
                options={categories.map((category) => ({
                  id: category.id,
                  label: category.name,
                  emoji: category.emoji,
                  colorIndex: category.colorIndex,
                }))}
                value={categoryId}
                onChange={(id) => {
                  setCategoryId(id)
                  setCategoryTouched(true)
                }}
              />

              <Chips
                label="Apartado"
                options={spaces.map((space) => ({
                  id: space.id,
                  label: space.name,
                  emoji: space.emoji,
                  colorIndex: space.colorIndex,
                }))}
                value={spaceId}
                onChange={setSpaceId}
              />

              <Chips
                label="Día"
                options={dayOptions.map((option) => ({ id: option.key, label: option.label }))}
                value={day}
                onChange={(value) => setDay(value as DayKey)}
              />
            </>
          )}
        </div>

        <footer className="add-footer">
          <Keypad value={raw} onChange={setRaw} />
          <button
            type="button"
            className="add-save"
            disabled={!canSave}
            onClick={() => void save()}
          >
            {editing ? 'Guardar cambios' : 'Guardar'}
          </button>
        </footer>
      </div>
    </Sheet>
  )
}
