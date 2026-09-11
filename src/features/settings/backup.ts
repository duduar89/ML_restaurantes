import { db, now } from '@/db/db'
import { patchSettings } from '@/db/repo'
import { toDayKey } from '@/lib/dates'
import type { Category, Expense, PaymentMethod, Settings, Space } from '@/db/types'

/**
 * Copias de seguridad.
 *
 * No es una función de lujo: el almacenamiento del navegador se puede vaciar.
 * `navigator.storage.persist()` es una PETICIÓN que Safari concede por
 * heurística, e iOS borra el almacenamiento de los sitios que no se usan. Una
 * app de gastos que se olvida de tu historial tras unas vacaciones está
 * muerta, así que la copia manual es parte del producto.
 *
 * La copia es COMPLETA, tumbas incluidas (`deletedAt`): restaurar sin ellas
 * resucitaría gastos borrados en cuanto hubiese sincronización.
 */
export const BACKUP_SCHEMA_VERSION = 1

export interface Backup {
  app: 'caudal'
  schemaVersion: number
  exportedAt: number
  tables: {
    expenses: Expense[]
    spaces: Space[]
    methods: PaymentMethod[]
    categories: Category[]
    settings: Settings[]
  }
}

export async function buildBackup(): Promise<Backup> {
  const [expenses, spaces, methods, categories, settings] = await Promise.all([
    db.expenses.toArray(),
    db.spaces.toArray(),
    db.methods.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
  ])

  return {
    app: 'caudal',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: now(),
    tables: { expenses, spaces, methods, categories, settings },
  }
}

export function backupFileName(): string {
  return `caudal-${toDayKey()}.json`
}

export function backupToFile(backup: Backup): File {
  return new File([JSON.stringify(backup)], backupFileName(), { type: 'application/json' })
}

/**
 * Entrega el fichero al usuario.
 *
 * En una PWA instalada en iOS los enlaces `<a download>` con blob están rotos
 * —funcionan en una pestaña de Safari y fallan justo en el caso real—, así que
 * la vía principal es el menú de compartir del sistema y el enlace queda sólo
 * de reserva para escritorio.
 *
 * El fichero tiene que venir YA construido: `navigator.share` exige el gesto
 * del usuario todavía vivo, y cualquier `await` previo lo invalida en iOS.
 */
export async function deliverBackup(file: File): Promise<'shared' | 'downloaded' | 'cancelled'> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Copia de Caudal' })
      await patchSettings({ lastBackupAt: now() })
      return 'shared'
    } catch (error) {
      // El usuario cerró la hoja de compartir: no es un fallo.
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    }
  }

  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.click()
  URL.revokeObjectURL(url)
  await patchSettings({ lastBackupAt: now() })
  return 'downloaded'
}

export interface RestoreSummary {
  expenses: number
  spaces: number
  methods: number
  categories: number
}

/**
 * Restaura una copia sustituyendo TODO el contenido actual.
 *
 * Es reemplazo y no fusión a propósito: una copia se restaura para volver a un
 * estado conocido, y fusionar dejaría un híbrido que no es ni lo uno ni lo
 * otro. Va en una transacción: o entra entera o no entra nada.
 */
export async function restoreBackup(raw: string): Promise<RestoreSummary> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }

  const backup = parsed as Partial<Backup>
  if (backup?.app !== 'caudal' || !backup.tables) {
    throw new Error('Ese archivo no es una copia de Caudal.')
  }
  if ((backup.schemaVersion ?? 0) > BACKUP_SCHEMA_VERSION) {
    throw new Error('La copia viene de una versión más nueva de la app. Actualízala primero.')
  }

  const { expenses = [], spaces = [], methods = [], categories = [], settings = [] } = backup.tables

  await db.transaction(
    'rw',
    db.expenses,
    db.spaces,
    db.methods,
    db.categories,
    db.settings,
    async () => {
      await Promise.all([
        db.expenses.clear(),
        db.spaces.clear(),
        db.methods.clear(),
        db.categories.clear(),
        db.settings.clear(),
      ])
      await Promise.all([
        db.expenses.bulkAdd(expenses),
        db.spaces.bulkAdd(spaces),
        db.methods.bulkAdd(methods),
        db.categories.bulkAdd(categories),
        db.settings.bulkAdd(settings),
      ])
    }
  )

  return {
    expenses: expenses.length,
    spaces: spaces.length,
    methods: methods.length,
    categories: categories.length,
  }
}

/**
 * Exportación a CSV: es un informe, no una copia. Pierde identificadores y
 * tumbas, así que sirve para abrirlo en una hoja de cálculo y nunca para
 * restaurar.
 */
export function toCsv(
  expenses: Expense[],
  lookup: {
    space: (id: string) => string
    method: (id: string) => string
    category: (id: string) => string
  }
): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
  const rows = [
    ['Fecha', 'Concepto', 'Importe', 'Tipo', 'Método', 'Categoría', 'Apartado', 'Origen'].join(';'),
  ]

  for (const expense of expenses) {
    if (expense.deletedAt !== 0) continue
    rows.push(
      [
        expense.day,
        escape(expense.concept),
        // Coma decimal y punto y coma de separador: es lo que espera Excel en
        // español, y con coma decimal el separador no puede ser la coma.
        (expense.amountCents / 100).toFixed(2).replace('.', ','),
        expense.kind === 'income' ? 'Ingreso' : 'Gasto',
        escape(lookup.method(expense.methodId)),
        escape(lookup.category(expense.categoryId)),
        escape(lookup.space(expense.spaceId)),
        expense.source,
      ].join(';')
    )
  }

  // BOM para que Excel reconozca el UTF-8 y no destroce los acentos.
  return `﻿${rows.join('\r\n')}`
}
