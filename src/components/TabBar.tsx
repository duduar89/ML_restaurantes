import { NavLink } from 'react-router'
import { haptic } from '@/hooks/useHaptics'
import './TabBar.css'

/**
 * Barra inferior con un botón central elevado.
 *
 * Todo lo que se usa a diario vive abajo: en un móvil sujeto con una mano el
 * pulgar llega cómodo a la franja inferior y no llega a las esquinas de
 * arriba. Por eso "añadir gasto" —la acción que más se repite— es un botón
 * central y no un icono en la cabecera.
 *
 * El botón de añadir NO es una pestaña: no navega, abre una hoja.
 */
const TABS = [
  { to: '/', label: 'Hoy', icon: HoyIcon, end: true },
  { to: '/apartados', label: 'Apartados', icon: ApartadosIcon, end: false },
  { to: '/analisis', label: 'Análisis', icon: AnalisisIcon, end: false },
  { to: '/ajustes', label: 'Ajustes', icon: AjustesIcon, end: false },
]

export function TabBar({ onAdd }: { onAdd: () => void }) {
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      {TABS.slice(0, 2).map((tab) => (
        <Tab key={tab.to} {...tab} />
      ))}

      <button
        type="button"
        className="tabbar-fab"
        onClick={() => {
          haptic('tap')
          onAdd()
        }}
        aria-label="Añadir gasto"
      >
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {TABS.slice(2).map((tab) => (
        <Tab key={tab.to} {...tab} />
      ))}
    </nav>
  )
}

function Tab({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: () => React.ReactElement
  end: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `tabbar-tab ${isActive ? 'tabbar-tab--active' : ''}`}
    >
      <Icon />
      <span>{label}</span>
    </NavLink>
  )
}

/* Iconos en línea: seis rutas SVG pesan menos que cualquier librería y se
   tiñen solas con currentColor. */

function HoyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ApartadosIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="8" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="8" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3" y="13" width="8" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="8" height="7" rx="2.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function AnalisisIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M5 19V11M12 19V5M19 19v-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function AjustesIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  )
}
