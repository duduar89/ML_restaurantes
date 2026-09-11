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

/**
 * Qué ha pasado con un aviso que llegó por automatización o por compartir.
 *
 * Existe porque la cadena "el banco avisa → la macro lo lee → Caudal lo
 * apunta" es larga y falla en silencio: si el móvil está en el bolsillo, la
 * pantalla que dice "no he podido leer el importe" no la ve nadie y el gasto
 * simplemente no aparece. Sin este registro, la única forma de enterarse sería
 * descuadrar el mes.
 *
 * Se guarda el texto que llegó, recortado, porque sin él no hay forma de
 * arreglar el reconocimiento de un banco concreto. Vive sólo en el móvil y se
 * puede borrar de un toque desde Ajustes.
 */
export interface CaptureLog {
  id: string
  receivedAt: number
  /** El texto del aviso tal y como llegó. Recortado a 300 caracteres. */
  raw: string
  outcome: CaptureOutcome
  amountCents: Cents | null
  concept: string | null
  /** El gasto que se creó, si se creó alguno. */
  expenseId: string | null
}

/**
 *  - saved:      apuntado.
 *  - pending:    entendido, esperando a que la persona confirme (sin auto=1).
 *  - duplicate:  ya estaba; no se duplicó.
 *  - discarded:  entendido y descartado a propósito (pago rechazado,
 *                programado...). NO es un fallo.
 *  - unreadable: no se pudo sacar el importe. Esto sí es un fallo, y es el que
 *                hay que poder ver.
 */
export type CaptureOutcome = 'saved' | 'pending' | 'duplicate' | 'discarded' | 'unreadable'
