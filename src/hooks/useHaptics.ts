/**
 * Vibración corta al confirmar acciones. Sólo existe en Android/Chrome: iOS no
 * expone la Vibration API, así que esto es una mejora silenciosa, nunca un
 * requisito — ninguna interacción depende de ella.
 */
type Pattern = 'tap' | 'success' | 'warn'

const PATTERNS: Record<Pattern, number | number[]> = {
  tap: 10,
  success: [12, 40, 22],
  warn: [30, 60, 30],
}

export function haptic(pattern: Pattern = 'tap'): void {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return
  try {
    navigator.vibrate(PATTERNS[pattern])
  } catch {
    /* Algunos navegadores lo exponen pero lo bloquean sin gesto del usuario. */
  }
}
