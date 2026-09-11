/**
 * Iconos dibujados, no glifos.
 *
 * Un «‹» de la tipografía o un «⌫» de Unicode se ven distintos en cada
 * sistema, no comparten grosor con el resto de la interfaz y ni siquiera están
 * garantizados en todas las fuentes. Estos están trazados sobre la misma
 * rejilla de 24 y con el mismo grosor, y toman el color de su contenedor.
 */
type IconProps = {
  size?: number
  /** Grosor del trazo. El valor por defecto es el del resto de la interfaz. */
  stroke?: number
}

function Icon({
  size = 20,
  stroke = 2,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

export function ChevronLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M14.5 6 9 12l5.5 6" />
    </Icon>
  )
}

export function ChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 6 15 12l-5.5 6" />
    </Icon>
  )
}

export function ChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 9.5 12 15l6-5.5" />
    </Icon>
  )
}

/** Tecla de borrado: la forma de la tecla real, no el glifo del sistema. */
export function Backspace({ size = 22, stroke = 1.8 }: IconProps) {
  return (
    <Icon size={size} stroke={stroke}>
      <path d="M9 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-6-7 6-7Z" />
      <path d="M14 9.5 10.5 14M10.5 9.5 14 14" />
    </Icon>
  )
}

/** Flecha de variación. `direction` decide hacia dónde apunta. */
export function Trend({
  direction,
  size = 12,
}: {
  direction: 'up' | 'down' | 'flat'
  size?: number
}) {
  return (
    <Icon size={size} stroke={2.6}>
      {direction === 'flat' ? (
        <path d="M5 12h14" />
      ) : direction === 'up' ? (
        <path d="M12 19V5M6 11l6-6 6 6" />
      ) : (
        <path d="M12 5v14M6 13l6 6 6-6" />
      )}
    </Icon>
  )
}
