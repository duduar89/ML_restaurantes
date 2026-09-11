import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { LogoMark } from '@/brand/Logo'
import { ExpenseList } from '@/components/ExpenseList'
import { ProgressBar } from '@/components/charts/ProgressBar'
import { ChartFrame } from '@/components/charts/ChartFrame'
import { RankList } from '@/components/charts/RankList'
import { Bars } from '@/components/charts/Bars'
import { Sheet } from '@/components/Sheet'
import { useToast } from '@/components/Toast'
import { SpaceSheet } from './SpaceSheet'
import { useAppData } from '@/app/store'
import { useExpenses } from '@/hooks/useExpenses'
import { archiveSpace, deleteSpace } from '@/db/repo'
import type { BurnRate } from '@/lib/analytics'
import {
  budgetStatus,
  burnRate,
  countBy,
  dailyAverage,
  dailySeries,
  groupBy,
  ranked,
  totalSpent,
} from '@/lib/analytics'
import { formatMoney } from '@/lib/money'
import { daysBetween, formatDayShort, toDayKey } from '@/lib/dates'
import type { Expense } from '@/db/types'
import './SpaceScreen.css'

/**
 * Un apartado por dentro: su propio panel con su presupuesto, su ritmo de
 * gasto y sus movimientos. Es lo que pedía la idea de "vida propia": el viaje
 * se mira entero, no mes a mes.
 */
export function SpaceScreen({ onSelectExpense }: { onSelectExpense: (expense: Expense) => void }) {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { spaceById, categoryById, methodById } = useAppData()
  const [editOpen, setEditOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const space = spaceId ? spaceById(spaceId) : undefined
  const expenses = useExpenses({ spaceId: spaceId ?? null })

  const stats = useMemo(() => {
    const list = expenses ?? []
    const spent = totalSpent(list)

    const days = list.map((expense) => expense.day).sort()
    const from = space?.startDay ?? days[0] ?? toDayKey()
    const to = space?.endDay ?? days.at(-1) ?? toDayKey()

    return {
      spent,
      from,
      to,
      count: list.length,
      average: dailyAverage(spent, from, to > toDayKey() ? toDayKey() : to),
      categories: ranked(
        groupBy(list, (expense) => expense.categoryId),
        countBy(list, (expense) => expense.categoryId),
        (key) => categoryById(key)?.name ?? 'Sin categoría'
      ),
      methods: ranked(
        groupBy(list, (expense) => expense.methodId),
        countBy(list, (expense) => expense.methodId),
        (key) => methodById(key)?.name ?? 'Otro'
      ),
      daily: dailySeries(list, from, to).slice(-14),
    }
  }, [expenses, space?.startDay, space?.endDay, categoryById, methodById])

  if (!space) {
    return (
      <div className="screen">
        <div className="screen-body">
          <div className="empty">
            <span className="empty-emoji">🤷</span>
            <p className="empty-title">Ese apartado ya no existe</p>
          </div>
        </div>
      </div>
    )
  }

  const status = space.budgetCents > 0 ? budgetStatus(space.budgetCents, stats.spent, remainingDays(space.endDay)) : null
  const pace =
    space.budgetCents > 0 && space.startDay && space.endDay
      ? burnRate(stats.spent, space.budgetCents, space.startDay, space.endDay)
      : null

  return (
    <div className="screen">
      <header
        className="spacehead"
        style={{ '--card-grad': `var(--space-grad-${space.colorIndex})` } as React.CSSProperties}
      >
        <div className="spacehead-nav">
          <button type="button" className="spacehead-back" onClick={() => void navigate(-1)}>
            ‹ Apartados
          </button>
          <button type="button" className="spacehead-edit" onClick={() => setEditOpen(true)}>
            Editar
          </button>
        </div>

        <div className="spacehead-id">
          <span className="spacehead-emoji">{space.emoji}</span>
          <div>
            <h1 className="spacehead-name">{space.name}</h1>
            <p className="spacehead-dates">
              {space.startDay && space.endDay
                ? `${formatDayShort(space.startDay)} – ${formatDayShort(space.endDay)}`
                : `${stats.count} movimiento${stats.count === 1 ? '' : 's'}`}
            </p>
          </div>
          {status && (
            <span className="spacehead-gauge" title="Presupuesto consumido">
              <LogoMark size={44} level={Math.min(1, status.ratio)} />
            </span>
          )}
        </div>

        <p className="spacehead-total num">{formatMoney(stats.spent)}</p>
      </header>

      <div className="screen-body">
        {status && (
          <section className="chart-card">
            <ProgressBar
              status={status}
              paceRatio={pace ? pace.daysElapsed / pace.daysTotal : null}
              caption={
                status.perDayLeftCents !== null
                  ? `${formatMoney(status.perDayLeftCents)} al día para llegar`
                  : undefined
              }
            />
            {pace && <PaceNote pace={pace} />}
          </section>
        )}

        <section className="quickstats">
          <Stat label="Apuntes" value={String(stats.count)} />
          <Stat label="Media/día" value={formatMoney(stats.average)} />
          <Stat
            label="Mayor"
            value={formatMoney(Math.max(0, ...(expenses ?? []).map((expense) => expense.amountCents)))}
          />
        </section>

        {stats.categories.length > 0 && (
          <ChartFrame
            title="En qué se ha ido"
            summary={`Reparto por categoría. La mayor es ${stats.categories[0].label} con ${formatMoney(stats.categories[0].cents)}.`}
            data={stats.categories}
          >
            <RankList
              data={stats.categories}
              total={stats.spent}
              emoji={(key) => categoryById(key)?.emoji}
              colorIndex={(key) => categoryById(key)?.colorIndex ?? 0}
            />
          </ChartFrame>
        )}

        {stats.daily.length > 1 && (
          <ChartFrame
            title="Últimos días"
            hint="Gasto diario del apartado"
            summary={`Gasto por día de los últimos ${stats.daily.length} días.`}
            data={stats.daily}
          >
            <Bars data={stats.daily} />
          </ChartFrame>
        )}

        {stats.methods.length > 0 && (
          <ChartFrame
            title="Cómo se ha pagado"
            hint="El efectivo es lo único que hay que apuntar siempre a mano"
            summary={`Reparto por método de pago. El más usado es ${stats.methods[0].label}.`}
            data={stats.methods}
          >
            <RankList
              data={stats.methods}
              total={stats.spent}
              emoji={(key) => methodById(key)?.emoji}
            />
          </ChartFrame>
        )}

        {expenses && expenses.length > 0 ? (
          <ExpenseList expenses={expenses} onSelect={onSelectExpense} />
        ) : (
          <div className="empty">
            <span className="empty-emoji">🌊</span>
            <p className="empty-title">Este apartado está vacío</p>
            <p className="empty-text">Apunta un gasto y elígelo aquí para empezar a llenarlo.</p>
          </div>
        )}

        {space.isDefault === 0 && (
          <div className="spacehead-actions">
            <button
              type="button"
              className="space-archive"
              onClick={() => {
                void archiveSpace(space.id, true)
                toast.show('Apartado archivado', {
                  label: 'Deshacer',
                  run: () => void archiveSpace(space.id, false),
                })
                void navigate('/apartados')
              }}
            >
              Archivar
            </button>
            <button type="button" className="sheet-danger" onClick={() => setConfirmOpen(true)}>
              Eliminar apartado
            </button>
          </div>
        )}
      </div>

      <SpaceSheet open={editOpen} onClose={() => setEditOpen(false)} editing={space} />

      <Sheet open={confirmOpen} onClose={() => setConfirmOpen(false)} title="¿Eliminar el apartado?">
        <div className="confirm">
          <p className="confirm-text">
            Se borrarán también sus {stats.count} movimiento{stats.count === 1 ? '' : 's'} por{' '}
            {formatMoney(stats.spent)}. Si sólo quieres quitarlo de en medio, archívalo.
          </p>
          <button
            type="button"
            className="sheet-danger"
            onClick={() => {
              void deleteSpace(space.id)
              toast.show(`Apartado «${space.name}» eliminado`)
              setConfirmOpen(false)
              void navigate('/apartados')
            }}
          >
            Sí, eliminar
          </button>
          <button type="button" className="confirm-cancel" onClick={() => setConfirmOpen(false)}>
            Cancelar
          </button>
        </div>
      </Sheet>
    </div>
  )
}

/**
 * Ritmo de gasto en tres bandas.
 *
 * Con dos bandas el texto se contradecía solo: 103,65 € frente a 100,00 €
 * previstos se anunciaba como "dentro del ritmo" porque la diferencia no
 * llegaba al umbral, y quien compara las dos cifras ve lo contrario de lo que
 * lee. La banda central existe para ese caso.
 */
function PaceNote({ pace }: { pace: BurnRate }) {
  const tone = pace.pace > 1.05 ? 'over' : pace.pace < 0.95 ? 'under' : 'even'
  const text =
    tone === 'over'
      ? `Vas por encima del ritmo: ${formatMoney(pace.actualPerDayCents)} al día frente a ${formatMoney(pace.targetPerDayCents)} previstos.`
      : tone === 'under'
        ? `Vas por debajo del ritmo: ${formatMoney(pace.actualPerDayCents)} al día frente a ${formatMoney(pace.targetPerDayCents)} previstos.`
        : `Vas justo en el ritmo previsto: unos ${formatMoney(pace.targetPerDayCents)} al día.`

  return <p className={`pace pace--${tone}`}>{text}</p>
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value num">{value}</span>
    </div>
  )
}

/** Días que quedan hasta el final, o null si el apartado no tiene fecha fin. */
function remainingDays(endDay: string | null): number | null {
  if (!endDay) return null
  const today = toDayKey()
  if (today > endDay) return 0
  return daysBetween(today, endDay)
}
