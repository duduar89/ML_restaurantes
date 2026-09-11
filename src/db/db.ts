import Dexie, { type EntityTable } from 'dexie'
import type { CaptureLog, Category, Expense, PaymentMethod, Settings, Space } from './types'

/**
 * IndexedDB vía Dexie. La app es local-first: todo vive en el móvil y funciona
 * sin red. Los índices compuestos cubren las consultas reales de la app
 * (gastos de un apartado en un rango de días, gastos de un mes) para no tener
 * que recorrer la tabla entera en el hilo principal.
 */
class AppDatabase extends Dexie {
  expenses!: EntityTable<Expense, 'id'>
  spaces!: EntityTable<Space, 'id'>
  methods!: EntityTable<PaymentMethod, 'id'>
  categories!: EntityTable<Category, 'id'>
  settings!: EntityTable<Settings, 'id'>
  captures!: EntityTable<CaptureLog, 'id'>

  constructor() {
    super('caudal-db')

    this.version(1).stores({
      expenses:
        'id, day, spaceId, methodId, categoryId, createdAt, deletedAt, externalId, [spaceId+day], [deletedAt+day], [deletedAt+spaceId]',
      spaces: 'id, sortOrder, archived, isDefault, deletedAt',
      methods: 'id, sortOrder, archived, isDefault, kind, deletedAt',
      categories: 'id, sortOrder, archived, deletedAt',
      settings: 'id',
    })

    // v2: registro de lo que llega por automatización. Sólo añade una tabla,
    // así que Dexie la crea al abrir y no hay nada que migrar.
    this.version(2).stores({
      captures: 'id, receivedAt, outcome',
    })
  }
}

export const db = new AppDatabase()

/** Marca de tiempo de escritura, aislada para poder falsearla en tests. */
export function now(): number {
  return Date.now()
}
