import { createContext, use, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import { listCategories, listMethods, listSpaces } from '@/db/repo'
import { toDayKey } from '@/lib/dates'
import type { Category, PaymentMethod, Settings, Space } from '@/db/types'

/**
 * Catálogos y ajustes: datos pequeños que casi todas las pantallas necesitan.
 * `useLiveQuery` los mantiene al día solo — al escribir en Dexie, cada vista
 * que los usa se vuelve a pintar sin estado global que sincronizar a mano.
 * Los gastos NO viven aquí: se consultan por rango en cada pantalla para no
 * cargar el histórico entero en memoria.
 */
export interface AppData {
  spaces: Space[]
  methods: PaymentMethod[]
  categories: Category[]
  settings: Settings | undefined
  /** Apartado activo, con el predeterminado como red de seguridad. */
  activeSpace: Space | undefined
  /**
   * Apartado al que va un gasto nuevo si el usuario no toca nada. Durante un
   * viaje en curso es el viaje; el resto del tiempo, el apartado activo.
   */
  entrySpace: Space | undefined
  spaceById: (id: string) => Space | undefined
  methodById: (id: string) => PaymentMethod | undefined
  categoryById: (id: string) => Category | undefined
  ready: boolean
}

const AppDataContext = createContext<AppData | null>(null)

export function AppDataProvider({ children }: { children: ReactNode }) {
  const spaces = useLiveQuery(() => listSpaces(), [], undefined as Space[] | undefined)
  const methods = useLiveQuery(() => listMethods(), [], undefined as PaymentMethod[] | undefined)
  const categories = useLiveQuery(() => listCategories(), [], undefined as Category[] | undefined)
  const settings = useLiveQuery(() => db.settings.get('settings'), [], undefined as Settings | undefined)

  const value = useMemo<AppData>(() => {
    const spaceList = spaces ?? []
    const methodList = methods ?? []
    const categoryList = categories ?? []

    const spaceMap = new Map(spaceList.map((space) => [space.id, space]))
    const methodMap = new Map(methodList.map((method) => [method.id, method]))
    const categoryMap = new Map(categoryList.map((category) => [category.id, category]))

    const active =
      (settings?.activeSpaceId ? spaceMap.get(settings.activeSpaceId) : undefined) ??
      spaceList.find((space) => space.isDefault === 1) ??
      spaceList[0]

    // Si hay exactamente un apartado con fechas que incluya hoy, es el destino
    // natural de lo que se apunte. Sólo se aplica cuando el apartado activo es
    // el del día a día: si el usuario ha elegido otro a mano, manda él.
    const today = toDayKey()
    const ongoing = spaceList.filter(
      (space) =>
        space.isDefault === 0 &&
        space.startDay !== null &&
        space.endDay !== null &&
        space.startDay <= today &&
        today <= space.endDay
    )
    const entry = active?.isDefault === 1 && ongoing.length === 1 ? ongoing[0] : active

    return {
      spaces: spaceList,
      methods: methodList,
      categories: categoryList,
      settings,
      activeSpace: active,
      entrySpace: entry,
      spaceById: (id) => spaceMap.get(id),
      methodById: (id) => methodMap.get(id),
      categoryById: (id) => categoryMap.get(id),
      ready: spaces !== undefined && methods !== undefined && categories !== undefined,
    }
  }, [spaces, methods, categories, settings])

  return <AppDataContext value={value}>{children}</AppDataContext>
}

export function useAppData(): AppData {
  const context = use(AppDataContext)
  if (!context) throw new Error('useAppData debe usarse dentro de <AppDataProvider>')
  return context
}
