import type { Cents } from '@/lib/money'
import type { DayKey } from '@/lib/dates'

/**
 * Todas las entidades comparten `updatedAt` y `deletedAt` (borrado lógico) para
 * que una sincronización futura pueda resolver conflictos por last-write-wins
 * sin migrar datos. `deletedAt === 0` significa vivo: Dexie no indexa
 * `undefined`, así que un 0 explícito mantiene el índice utilizable.
 */
export interface Syncable {
  id: string
  createdAt: number
  updatedAt: number
  deletedAt: number
}

/** Un "apartado": la vida diaria, un viaje, una reforma... con vida propia. */
export interface Space extends Syncable {
  name: string
  emoji: string
  /** Índice del degradado de marca (ver `spaceGradients`). */
  colorIndex: number
  kind: SpaceKind
  /** Presupuesto total del apartado (viajes/proyectos). 0 = sin presupuesto. */
  budgetCents: Cents
  /** Rango del viaje. Vacío en apartados sin fechas. */
  startDay: DayKey | null
  endDay: DayKey | null
  /** Un único apartado es el predeterminado: donde caen los gastos del día a día. */
  isDefault: 0 | 1
  archived: 0 | 1
  sortOrder: number
}

export type SpaceKind = 'life' | 'trip' | 'project'

/** Cómo se pagó. El efectivo es el que siempre habrá que apuntar a mano. */
export interface PaymentMethod extends Syncable {
  name: string
  kind: PaymentKind
  emoji: string
  isDefault: 0 | 1
  archived: 0 | 1
  sortOrder: number
}

export type PaymentKind = 'cash' | 'card' | 'transfer' | 'bizum' | 'other'

export interface Category extends Syncable {
  name: string
  emoji: string
  colorIndex: number
  archived: 0 | 1
  sortOrder: number
}

/**
 * De dónde salió el gasto. Importa para no duplicar y para saber qué se puede
 * tocar: lo que el usuario escribió a mano nunca lo pisa una importación.
 *  - manual:     lo apuntó la persona.
 *  - automation: lo mandó un atajo de iOS o una macro de Android al recibir
 *                el aviso del banco.
 *  - share:      llegó por el menú de compartir del móvil.
 *  - import:     salió de un extracto bancario (Norma 43).
 */
export type ExpenseSource = 'manual' | 'automation' | 'share' | 'import'

export interface Expense extends Syncable {
  spaceId: string
  /** Siempre positivo y en céntimos. Los ingresos van en `kind`. */
  amountCents: Cents
  kind: 'expense' | 'income'
  concept: string
  methodId: string
  categoryId: string
  /** Fecha civil local del gasto (YYYY-MM-DD), automática al registrar. */
  day: DayKey
  note: string
  source: ExpenseSource
  /**
   * Huella del apunte original cuando viene de un extracto bancario.
   * Es la clave para no duplicar lo que ya se apuntó a mano.
   */
  externalId: string | null
}

/** Ajustes de la app. Fila única con id 'settings'. */
export interface Settings {
  id: 'settings'
  /** Presupuesto mensual del día a día. 0 = sin presupuesto. */
  monthlyBudgetCents: Cents
  activeSpaceId: string | null
  lastMethodId: string | null
  onboardedAt: number | null
  /** Aviso de copia de seguridad: epoch de la última exportación. */
  lastBackupAt: number | null
}
