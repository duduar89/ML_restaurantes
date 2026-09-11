import { db, now } from './db'
import { uuidv7 } from '@/lib/id'
import type { Category, PaymentMethod, Settings, Space } from './types'

const DEFAULT_CATEGORIES: Array<Pick<Category, 'name' | 'emoji' | 'colorIndex'>> = [
  { name: 'Súper', emoji: '🛒', colorIndex: 2 },
  { name: 'Restaurantes', emoji: '🍽️', colorIndex: 3 },
  { name: 'Transporte', emoji: '🚇', colorIndex: 1 },
  { name: 'Casa', emoji: '🏠', colorIndex: 7 },
  { name: 'Ocio', emoji: '🎬', colorIndex: 5 },
  { name: 'Compras', emoji: '🛍️', colorIndex: 0 },
  { name: 'Salud', emoji: '💊', colorIndex: 4 },
  { name: 'Suscripciones', emoji: '📺', colorIndex: 6 },
  { name: 'Viaje', emoji: '✈️', colorIndex: 1 },
  { name: 'Otros', emoji: '✨', colorIndex: 7 },
]

const DEFAULT_METHODS: Array<Pick<PaymentMethod, 'name' | 'emoji' | 'kind' | 'isDefault'>> = [
  { name: 'Tarjeta', emoji: '💳', kind: 'card', isDefault: 1 },
  { name: 'Efectivo', emoji: '💵', kind: 'cash', isDefault: 0 },
  { name: 'Bizum', emoji: '📲', kind: 'bizum', isDefault: 0 },
  { name: 'Transferencia', emoji: '🏦', kind: 'transfer', isDefault: 0 },
]

/**
 * Siembra los datos mínimos para que la app sea usable desde el primer segundo:
 * un apartado "Vida", los métodos de pago habituales y unas categorías.
 * Es idempotente: se puede llamar en cada arranque sin duplicar nada.
 */
export async function seedIfEmpty(): Promise<void> {
  await db.transaction('rw', db.spaces, db.methods, db.categories, db.settings, async () => {
    const stamp = now()

    if ((await db.spaces.count()) === 0) {
      const life: Space = {
        id: uuidv7(),
        name: 'Vida',
        emoji: '🏡',
        colorIndex: 0,
        kind: 'life',
        budgetCents: 0,
        startDay: null,
        endDay: null,
        isDefault: 1,
        archived: 0,
        sortOrder: 0,
        createdAt: stamp,
        updatedAt: stamp,
        deletedAt: 0,
      }
      await db.spaces.add(life)
    }

    if ((await db.methods.count()) === 0) {
      await db.methods.bulkAdd(
        DEFAULT_METHODS.map((method, index) => ({
          ...method,
          id: uuidv7(),
          archived: 0 as const,
          sortOrder: index,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: 0,
        }))
      )
    }

    if ((await db.categories.count()) === 0) {
      await db.categories.bulkAdd(
        DEFAULT_CATEGORIES.map((category, index) => ({
          ...category,
          id: uuidv7(),
          archived: 0 as const,
          sortOrder: index,
          createdAt: stamp,
          updatedAt: stamp,
          deletedAt: 0,
        }))
      )
    }

    if (!(await db.settings.get('settings'))) {
      const defaultSpace = await db.spaces.where('isDefault').equals(1).first()
      const defaultMethod = await db.methods.where('isDefault').equals(1).first()
      const settings: Settings = {
        id: 'settings',
        monthlyBudgetCents: 0,
        activeSpaceId: defaultSpace?.id ?? null,
        lastMethodId: defaultMethod?.id ?? null,
        onboardedAt: null,
        lastBackupAt: null,
      }
      await db.settings.add(settings)
    }
  })
}
