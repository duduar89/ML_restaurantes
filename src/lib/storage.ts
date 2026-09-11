/**
 * Durabilidad del almacenamiento. `persist()` es una PETICIÓN, no una garantía:
 * Safari la concede por heurísticas de uso, así que se pide después de la
 * primera escritura real (la señal de interés más fuerte) y nunca al cargar.
 * Aun concedida, no sustituye a las copias de seguridad.
 */
let requested = false

export async function requestPersistence(): Promise<boolean> {
  if (requested) return false
  requested = true

  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false
  try {
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export interface StorageInfo {
  persisted: boolean
  usageBytes: number | null
  quotaBytes: number | null
}

export async function storageInfo(): Promise<StorageInfo> {
  const out: StorageInfo = { persisted: false, usageBytes: null, quotaBytes: null }
  if (typeof navigator === 'undefined' || !navigator.storage) return out

  try {
    if (navigator.storage.persisted) out.persisted = await navigator.storage.persisted()
  } catch {
    /* ignorado */
  }

  // estimate() no llegó a iOS hasta la 17, cuatro versiones después de
  // persist(): hay que comprobarlos por separado.
  try {
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate()
      out.usageBytes = estimate.usage ?? null
      out.quotaBytes = estimate.quota ?? null
    }
  } catch {
    /* ignorado */
  }

  return out
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
