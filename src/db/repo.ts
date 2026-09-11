import { db, now } from './db'
import { uuidv7 } from '@/lib/id'
import { toDayKey, type DayKey } from '@/lib/dates'
import type { Cents } from '@/lib/money'
import type {
  Category,
  Expense,
  ExpenseSource,
  PaymentMethod,
  Settings,
  Space,
  SpaceKind,
} from './types'

/* ------------------------------------------------------------------ gastos */

export interface NewExpense {
  amountCents: Cents
  concept: string
  methodId: string
  categoryId: string
  spaceId: string
  kind?: 'expense' | 'income'
  day?: DayKey
  note?: string
  source?: ExpenseSource
  externalId?: string | null
}

/**
 * Alta de un gasto. La fecha se pone sola (hoy) salvo que se indique otra, que
 * es exactamente lo que pide el flujo de "importe, método, concepto y listo".
 * Recuerda el método usado para que el siguiente alta venga ya relleno.
 */
export async function addExpense(input: NewExpense): Promise<string> {
  const stamp = now()
  const expense: Expense = {
    id: uuidv7(),
    spaceId: input.spaceId,
    amountCents: Math.abs(Math.round(input.amountCents)),
    kind: input.kind ?? 'expense',
    concept: input.concept.trim(),
    methodId: input.methodId,
    categoryId: input.categoryId,
    day: input.day ?? toDayKey(),
    note: input.note?.trim() ?? '',
    source: input.source ?? 'manual',
    externalId: input.externalId ?? null,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: 0,
  }

  await db.transaction('rw', db.expenses, db.settings, async () => {
    await db.expenses.add(expense)
    await db.settings.update('settings', { lastMethodId: input.methodId })
  })

  return expense.id
}

export async function updateExpense(id: string, patch: Partial<NewExpense>): Promise<void> {
  const changes: Partial<Expense> = { updatedAt: now() }
  if (patch.amountCents !== undefined) changes.amountCents = Math.abs(Math.round(patch.amountCents))
  if (patch.concept !== undefined) changes.concept = patch.concept.trim()
  if (patch.methodId !== undefined) changes.methodId = patch.methodId
  if (patch.categoryId !== undefined) changes.categoryId = patch.categoryId
  if (patch.spaceId !== undefined) changes.spaceId = patch.spaceId
  if (patch.day !== undefined) changes.day = patch.day
  if (patch.kind !== undefined) changes.kind = patch.kind
  if (patch.note !== undefined) changes.note = patch.note.trim()
  await db.expenses.update(id, changes)
}

/** Borrado lógico: permite deshacer y no rompe una sincronización futura. */
export async function deleteExpense(id: string): Promise<void> {
  const stamp = now()
  await db.expenses.update(id, { deletedAt: stamp, updatedAt: stamp })
}

export async function restoreExpense(id: string): Promise<void> {
  await db.expenses.update(id, { deletedAt: 0, updatedAt: now() })
}

/** Gastos vivos de un rango de días, del más reciente al más antiguo. */
export async function listExpenses(options: {
  spaceId?: string | null
  from?: DayKey
  to?: DayKey
} = {}): Promise<Expense[]> {
  const { spaceId, from, to } = options

  let rows: Expense[]
  if (spaceId) {
    rows = await db.expenses
      .where('[spaceId+day]')
      .between([spaceId, from ?? '0000-00-00'], [spaceId, to ?? '9999-99-99'], true, true)
      .toArray()
  } else if (from || to) {
    rows = await db.expenses
      .where('day')
      .between(from ?? '0000-00-00', to ?? '9999-99-99', true, true)
      .toArray()
  } else {
    rows = await db.expenses.toArray()
  }

  return rows
    .filter((expense) => expense.deletedAt === 0)
    .sort((a, b) => (a.day === b.day ? b.createdAt - a.createdAt : b.day.localeCompare(a.day)))
}

/** Últimos conceptos distintos, para las sugerencias de alta rápida. */
export async function recentExpenses(limit = 8, spaceId?: string | null): Promise<Expense[]> {
  const rows = await db.expenses.orderBy('createdAt').reverse().limit(200).toArray()
  const seen = new Set<string>()
  const out: Expense[] = []
  for (const expense of rows) {
    if (expense.deletedAt !== 0) continue
    if (spaceId && expense.spaceId !== spaceId) continue
    const key = expense.concept.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(expense)
    if (out.length >= limit) break
  }
  return out
}

/* -------------------------------------------------------------- apartados */

export interface NewSpace {
  name: string
  emoji: string
  colorIndex: number
  kind: SpaceKind
  budgetCents?: Cents
  startDay?: DayKey | null
  endDay?: DayKey | null
}

export async function addSpace(input: NewSpace): Promise<string> {
  const stamp = now()
  const count = await db.spaces.count()
  const space: Space = {
    id: uuidv7(),
    name: input.name.trim(),
    emoji: input.emoji,
    colorIndex: input.colorIndex,
    kind: input.kind,
    budgetCents: input.budgetCents ?? 0,
    startDay: input.startDay ?? null,
    endDay: input.endDay ?? null,
    isDefault: 0,
    archived: 0,
    sortOrder: count,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: 0,
  }
  await db.spaces.add(space)
  return space.id
}

export async function updateSpace(id: string, patch: Partial<NewSpace>): Promise<void> {
  const changes: Partial<Space> = { updatedAt: now() }
  if (patch.name !== undefined) changes.name = patch.name.trim()
  if (patch.emoji !== undefined) changes.emoji = patch.emoji
  if (patch.colorIndex !== undefined) changes.colorIndex = patch.colorIndex
  if (patch.kind !== undefined) changes.kind = patch.kind
  if (patch.budgetCents !== undefined) changes.budgetCents = patch.budgetCents
  if (patch.startDay !== undefined) changes.startDay = patch.startDay
  if (patch.endDay !== undefined) changes.endDay = patch.endDay
  await db.spaces.update(id, changes)
}

export async function archiveSpace(id: string, archived: boolean): Promise<void> {
  await db.spaces.update(id, { archived: archived ? 1 : 0, updatedAt: now() })
}

/**
 * Elimina un apartado y todos sus gastos. El apartado predeterminado no se
 * puede borrar: es donde aterrizan los gastos del día a día.
 */
export async function deleteSpace(id: string): Promise<void> {
  await db.transaction('rw', db.spaces, db.expenses, db.settings, async () => {
    const space = await db.spaces.get(id)
    if (!space || space.isDefault === 1) return

    const stamp = now()
    const expenses = await db.expenses.where('spaceId').equals(id).toArray()
    await db.expenses.bulkUpdate(
      expenses.map((expense) => ({ key: expense.id, changes: { deletedAt: stamp, updatedAt: stamp } }))
    )
    await db.spaces.update(id, { deletedAt: stamp, updatedAt: stamp, archived: 1 })

    const settings = await db.settings.get('settings')
    if (settings?.activeSpaceId === id) {
      const fallback = await db.spaces.where('isDefault').equals(1).first()
      await db.settings.update('settings', { activeSpaceId: fallback?.id ?? null })
    }
  })
}

export async function listSpaces(includeArchived = false): Promise<Space[]> {
  const rows = await db.spaces.orderBy('sortOrder').toArray()
  return rows.filter((space) => space.deletedAt === 0 && (includeArchived || space.archived === 0))
}

/* ------------------------------------------------- métodos y categorías */

export async function listMethods(): Promise<PaymentMethod[]> {
  const rows = await db.methods.orderBy('sortOrder').toArray()
  return rows.filter((method) => method.deletedAt === 0 && method.archived === 0)
}

export async function listCategories(): Promise<Category[]> {
  const rows = await db.categories.orderBy('sortOrder').toArray()
  return rows.filter((category) => category.deletedAt === 0 && category.archived === 0)
}

export async function addCategory(name: string, emoji: string, colorIndex: number): Promise<string> {
  const stamp = now()
  const count = await db.categories.count()
  const id = uuidv7()
  await db.categories.add({
    id,
    name: name.trim(),
    emoji,
    colorIndex,
    archived: 0,
    sortOrder: count,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: 0,
  })
  return id
}

export async function addMethod(
  name: string,
  emoji: string,
  kind: PaymentMethod['kind']
): Promise<string> {
  const stamp = now()
  const count = await db.methods.count()
  const id = uuidv7()
  await db.methods.add({
    id,
    name: name.trim(),
    emoji,
    kind,
    isDefault: 0,
    archived: 0,
    sortOrder: count,
    createdAt: stamp,
    updatedAt: stamp,
    deletedAt: 0,
  })
  return id
}

/* ----------------------------------------------------------------- ajustes */

export async function getSettings(): Promise<Settings | undefined> {
  return db.settings.get('settings')
}

export async function patchSettings(patch: Partial<Omit<Settings, 'id'>>): Promise<void> {
  await db.settings.update('settings', patch)
}

/**
 * Método de pago más usado en un apartado, mirando sus últimos apuntes.
 *
 * Se calcula por apartado y no de forma global a propósito: en un viaje manda
 * el efectivo y en el día a día la tarjeta, así que un único "último método"
 * acertaría la mitad de las veces.
 */
export async function suggestMethodForSpace(spaceId: string, sample = 25): Promise<string | null> {
  const rows = await db.expenses
    .where('[spaceId+day]')
    .between([spaceId, '0000-00-00'], [spaceId, '9999-99-99'], true, true)
    .toArray()

  const recent = rows
    .filter((expense) => expense.deletedAt === 0)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, sample)

  if (recent.length === 0) return null

  const counts = new Map<string, number>()
  for (const expense of recent) {
    counts.set(expense.methodId, (counts.get(expense.methodId) ?? 0) + 1)
  }

  let best: string | null = null
  let bestCount = 0
  for (const [methodId, count] of counts) {
    if (count > bestCount) {
      best = methodId
      bestCount = count
    }
  }
  return best
}

/* -------------------------------------------------- importación y duplicados */

/**
 * ¿Ya existe este apunte? Los movimientos importados llevan una huella
 * determinista (`externalId`), así que volver a lanzar el mismo atajo o
 * reimportar un extracto solapado no crea duplicados.
 */
export async function findByExternalId(externalId: string): Promise<Expense | undefined> {
  const rows = await db.expenses.where('externalId').equals(externalId).toArray()
  return rows.find((expense) => expense.deletedAt === 0)
}

/**
 * Busca un gasto apuntado a mano que probablemente sea el mismo movimiento que
 * el que llega del banco.
 *
 * Nunca fusiona sola: devuelve el candidato para que la persona decida. Un
 * emparejamiento silencioso equivocado destruye la confianza en los totales, y
 * además el aviso del banco trae el importe autorizado mientras que el
 * extracto trae el liquidado —propinas, repostajes y divisas difieren—, así
 * que se admite una holgura de días y de céntimos.
 */
export async function findLikelyDuplicate(candidate: {
  amountCents: Cents
  day: DayKey
  concept: string
}, options: { dayWindow?: number; centsTolerance?: number } = {}): Promise<Expense | undefined> {
  const dayWindow = options.dayWindow ?? 4
  const tolerance = options.centsTolerance ?? 0

  const rows = await db.expenses
    .where('day')
    .between(addDaysKey(candidate.day, -dayWindow), addDaysKey(candidate.day, dayWindow), true, true)
    .toArray()

  const normalized = normalizeConcept(candidate.concept)

  return rows
    .filter((expense) => expense.deletedAt === 0)
    .filter((expense) => Math.abs(expense.amountCents - candidate.amountCents) <= tolerance)
    .sort((a, b) => {
      // Se prefiere el que además coincide en concepto, y luego el más cercano
      // en fecha.
      const aConcept = normalizeConcept(a.concept) === normalized ? 0 : 1
      const bConcept = normalizeConcept(b.concept) === normalized ? 0 : 1
      if (aConcept !== bConcept) return aConcept - bConcept
      return Math.abs(dayDistance(a.day, candidate.day)) - Math.abs(dayDistance(b.day, candidate.day))
    })[0]
}

function normalizeConcept(concept: string): string {
  return concept
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function addDaysKey(day: DayKey, delta: number): DayKey {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y, m - 1, d + delta, 12)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function dayDistance(a: DayKey, b: DayKey): number {
  return new Date(a).getTime() - new Date(b).getTime()
}

/** Alta en bloque de un extracto, saltándose lo que ya estaba importado. */
export async function importExpenses(
  rows: Array<NewExpense & { externalId: string }>
): Promise<{ added: number; skipped: number }> {
  let added = 0
  let skipped = 0

  for (const row of rows) {
    if (await findByExternalId(row.externalId)) {
      skipped += 1
      continue
    }
    await addExpense({ ...row, source: 'import' })
    added += 1
  }

  return { added, skipped }
}
