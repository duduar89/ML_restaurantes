import { haptic } from '@/hooks/useHaptics'
import { applyKey, KEYPAD_KEYS } from '@/lib/keypad'
import './Keypad.css'

/**
 * Teclado numérico propio en vez de <input type="number">.
 *
 * No es una cuestión de estética. En iOS 26.2 hay una regresión confirmada por
 * Apple (FB22063448) por la que los campos numéricos insertan un punto en vez
 * de una coma en los idiomas de coma decimal —el español entre ellos—, y los
 * teclados nativos a menudo emiten una coma que el campo luego rechaza. Con un
 * teclado propio el separador lo decidimos nosotros.
 *
 * Además el teclado del sistema tarda en aparecer, empuja la vista, hace zoom
 * si la fuente baja de 17px y iOS no lo abre desde un `autofocus`. Un teclado
 * propio aparece instantáneo y no mueve nada: es lo que permite apuntar un
 * gasto en menos de cinco segundos.
 */
export function Keypad({
  value,
  onChange,
}: {
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div className="keypad" role="group" aria-label="Teclado numérico">
      {KEYPAD_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={`keypad-key ${key === '⌫' ? 'keypad-key--action' : ''}`}
          aria-label={key === '⌫' ? 'Borrar' : key === ',' ? 'Coma decimal' : key}
          /* onPointerDown y no onClick: la tecla responde en cuanto el dedo
             toca, sin esperar a que lo levante. */
          onPointerDown={() => {
            haptic('tap')
            onChange(applyKey(value, key))
          }}
        >
          {key}
        </button>
      ))}
    </div>
  )
}
