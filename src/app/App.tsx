import { useCallback, useState } from 'react'
import { Route, Routes } from 'react-router'
import { TabBar } from '@/components/TabBar'
import { ToastProvider } from '@/components/Toast'
import { AddSheet } from '@/features/add/AddSheet'
import { DeepLinkCapture } from '@/features/capture/DeepLinkCapture'
import { HomeScreen } from '@/features/home/HomeScreen'
import { SpacesScreen } from '@/features/spaces/SpacesScreen'
import { SpaceScreen } from '@/features/spaces/SpaceScreen'
import { StatsScreen } from '@/features/stats/StatsScreen'
import { SettingsScreen } from '@/features/settings/SettingsScreen'
import { UpdatePrompt } from '@/components/UpdatePrompt'
import { useAppData } from './store'
import type { Expense } from '@/db/types'
import './App.css'

export function App() {
  const { ready } = useAppData()
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)

  const openAdd = useCallback(() => {
    setEditing(null)
    setAddOpen(true)
  }, [])

  const openEdit = useCallback((expense: Expense) => {
    setEditing(expense)
    setAddOpen(true)
  }, [])

  const closeAdd = useCallback(() => {
    setAddOpen(false)
    setEditing(null)
  }, [])

  // La siembra ya corrió antes de montar, así que esto sólo cubre el instante
  // en que Dexie aún no ha devuelto los catálogos.
  if (!ready) return <div className="boot" />

  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<HomeScreen onSelectExpense={openEdit} onAdd={openAdd} />} />
        <Route path="/apartados" element={<SpacesScreen />} />
        <Route path="/apartados/:spaceId" element={<SpaceScreen onSelectExpense={openEdit} />} />
        <Route path="/analisis" element={<StatsScreen onSelectExpense={openEdit} />} />
        <Route path="/ajustes" element={<SettingsScreen />} />
        {/* Punto de entrada de las automatizaciones (Atajos de iOS, MacroDroid)
            y del menú de compartir de Android. */}
        <Route path="/add" element={<DeepLinkCapture />} />
        <Route path="/compartir" element={<DeepLinkCapture />} />
        <Route path="*" element={<HomeScreen onSelectExpense={openEdit} onAdd={openAdd} />} />
      </Routes>

      <TabBar onAdd={openAdd} />
      <AddSheet open={addOpen} onClose={closeAdd} editing={editing} />
      <UpdatePrompt />
    </ToastProvider>
  )
}
