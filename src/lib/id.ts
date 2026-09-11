/**
 * UUID v7: ordenable por tiempo. Los ids se generan en el cliente para que el
 * alta funcione sin red, y el prefijo temporal deja los índices de Dexie
 * ordenados por creación sin columna extra. Preparado para una sincronización
 * futura: un id generado en el móvil nunca colisiona con uno del portátil.
 */
export function uuidv7(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  const ms = Date.now()
  bytes[0] = (ms / 2 ** 40) & 0xff
  bytes[1] = (ms / 2 ** 32) & 0xff
  bytes[2] = (ms / 2 ** 24) & 0xff
  bytes[3] = (ms / 2 ** 16) & 0xff
  bytes[4] = (ms / 2 ** 8) & 0xff
  bytes[5] = ms & 0xff

  bytes[6] = (bytes[6] & 0x0f) | 0x70 // versión 7
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variante RFC 4122

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
