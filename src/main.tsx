import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from './app/App'
import { AppDataProvider } from './app/store'
import { seedIfEmpty } from './db/seed'
import './styles/base.css'

// La siembra va antes del primer pintado para que la app nunca aparezca vacía
// ni con selectores sin opciones. Es idempotente.
await seedIfEmpty()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppDataProvider>
        <App />
      </AppDataProvider>
    </BrowserRouter>
  </StrictMode>
)
