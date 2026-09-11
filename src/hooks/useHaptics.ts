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

  // Sin un toque previo del usuario el navegador bloquea la vibración y deja
  // un error en la consola. Pasa de verdad: un gasto que entra por un enlace
  // de automatización llega por navegación, no por un toque. Se comprueba
  // antes en lugar de provocar el error y taparlo.
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
    .userActivation
  if (activation && !activation.hasBeenActive) return

  try {
    navigator.vibrate(PATTERNS[pattern])
  } catch {
    /* Algunos navegadores la exponen y la bloquean igualmente. */
  }
}
