import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useAppData } from '@/app/store'
import { useExpenses } from '@/hooks/useExpenses'
import { SpaceSheet } from './SpaceSheet'
import { SpaceCard } from './SpaceCard'
import { totalSpent } from '@/lib/analytics'
import type { Space } from '@/db/types'
import './SpacesScreen.css'

/**
 * Los apartados: cada trozo de tu vida con su propia cuenta.
 *
 * Se carga el histórico completo una sola vez y se agrupa en memoria. Un
 * apartado de viaje se mide por su total acumulado, no por el mes en curso,
 * así que no hay un rango de fechas que acote la consulta.
 */
export function SpacesScreen() {
  const { spaces } = useAppData()
  const expenses = useExpenses({})
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Space | null>(null)

  const totalsBySpace = useMemo(() => {
    const out = new Map<string, number>()
    for (const space of spaces) {
      out.set(space.id, 0)
    }
    for (const expense of expenses ?? []) {
      if (expense.kind !== 'expense') continue
      out.set(expense.spaceId, (out.get(expense.spaceId) ?? 0) + expense.amountCents)
    }
    return out
  }, [expenses, spaces])

  const countsBySpace = useMemo(() => {
    const out = new Map<string, number>()
    for (const expense of expenses ?? []) {
      out.set(expense.spaceId, (out.get(expense.spaceId) ?? 0) + 1)
    }
    return out
  }, [expenses])

  const grandTotal = totalSpent(expenses ?? [])

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="screen-title">Apartados</h1>
        <button
          type="button"
          className="spaces-add"
          onClick={() => {
            setEditing(null)
            setSheetOpen(true)
          }}
        >
          + Nuevo
        </button>
      </header>

      <div className="screen-body">
        <p className="spaces-intro">
          Separa lo que quieras llevar aparte: un viaje, una reforma, un capricho. Cada apartado
          lleva su propia cuenta y su propio presupuesto.
        </p>

        <ul className="spaces-grid">
          {spaces.map((space) => (
            <li key={space.id}>
              <Link to={`/apartados/${space.id}`} className="spaces-link">
                <SpaceCard
                  space={space}
                  spentCents={totalsBySpace.get(space.id) ?? 0}
                  count={countsBySpace.get(space.id) ?? 0}
                />
              </Link>
            </li>
          ))}
        </ul>

        {grandTotal > 0 && (
          <p className="spaces-foot">
            {spaces.length} apartado{spaces.length === 1 ? '' : 's'} ·{' '}
            {(expenses ?? []).length} movimiento{(expenses ?? []).length === 1 ? '' : 's'} en total
          </p>
        )}
      </div>

      <SpaceSheet open={sheetOpen} onClose={() => setSheetOpen(false)} editing={editing} />
    </div>
  )
}
