import { useEffect, useRef, useState } from 'react'
import { LogoLockup } from '@/brand/Logo'
import { BRAND } from '@/brand/brand'
import { useToast } from '@/components/Toast'
import { Sheet } from '@/components/Sheet'
import { useAppData } from '@/app/store'
import { useExpenses } from '@/hooks/useExpenses'
import { addCategory, addMethod, patchSettings } from '@/db/repo'
import { formatBytes, requestPersistence, storageInfo, type StorageInfo } from '@/lib/storage'
import { formatAmount, formatMoney, parseAmount } from '@/lib/money'
import { buildBackup, backupToFile, deliverBackup, restoreBackup, toCsv } from './backup'
import { useInstall } from './useInstall'
import { AutomationGuide } from './AutomationGuide'
import { ImportSection } from './ImportSection'
import './SettingsScreen.css'

const THEME_KEY = 'caudal-theme'

export function SettingsScreen() {
  const toast = useToast()
  const { settings, spaces, methods, categories, spaceById, methodById, categoryById } = useAppData()
  const install = useInstall()
  const expenses = useExpenses({})
  const restoreRef = useRef<HTMLInputElement>(null)

  const [budget, setBudget] = useState('')
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(readTheme)
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null)
  /**
   * La copia se prepara ANTES de que el usuario pulse: `navigator.share` exige
   * que el gesto siga vivo y cualquier `await` previo lo invalida en iOS.
   */
  const [backupFile, setBackupFile] = useState<File | null>(null)

  useEffect(() => {
    setBudget(settings?.monthlyBudgetCents ? formatAmount(settings.monthlyBudgetCents) : '')
  }, [settings?.monthlyBudgetCents])

  useEffect(() => {
    void storageInfo().then(setStorage)
  }, [])

  useEffect(() => {
    if (!expenses) return
    void buildBackup().then((backup) => setBackupFile(backupToFile(backup)))
  }, [expenses])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      /* Modo privado o almacenamiento bloqueado: el tema sólo dura la sesión. */
    }
  }, [theme])

  function saveBudget() {
    const cents = parseAmount(budget) ?? 0
    void patchSettings({ monthlyBudgetCents: cents })
    toast.show(cents > 0 ? `Presupuesto: ${formatMoney(cents)} al mes` : 'Presupuesto quitado')
  }

  function shareBackup() {
    if (!backupFile) return
    void deliverBackup(backupFile).then((outcome) => {
      if (outcome === 'cancelled') return
      toast.show(outcome === 'shared' ? 'Copia compartida' : 'Copia descargada')
      void storageInfo().then(setStorage)
    })
  }

  function shareCsv() {
    const csv = toCsv(expenses ?? [], {
      space: (id) => spaceById(id)?.name ?? '',
      method: (id) => methodById(id)?.name ?? '',
      category: (id) => categoryById(id)?.name ?? '',
    })
    void deliverBackup(new File([csv], 'caudal.csv', { type: 'text/csv' }))
  }

  const lastBackup = settings?.lastBackupAt
  const backupIsStale =
    !lastBackup || Date.now() - lastBackup > 14 * 24 * 60 * 60 * 1000

  return (
    <div className="screen">
      <header className="screen-head">
        <h1 className="screen-title">Ajustes</h1>
      </header>

      <div className="screen-body">
        {/* --- Presupuesto --- */}
        <section className="settings-card">
          <h2 className="settings-section-title">Presupuesto mensual</h2>
          <p className="settings-hint">
            Lo que quieres gastar al mes en el día a día. Déjalo vacío si prefieres sólo llevar la
            cuenta.
          </p>
          <div className="settings-inline">
            <input
              className="field-input num"
              type="text"
              inputMode="decimal"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              onBlur={saveBudget}
              placeholder="0,00"
              enterKeyHint="done"
            />
            <button type="button" className="settings-action" onClick={saveBudget}>
              Guardar
            </button>
          </div>
        </section>

        {/* --- Copia de seguridad --- */}
        <section className="settings-card">
          <h2 className="settings-section-title">Copia de seguridad</h2>
          <p className="settings-hint">
            Tus gastos viven sólo en este móvil. Eso los hace privados y hace que la app funcione
            sin conexión, pero también significa que si se borran los datos del navegador se van
            contigo. Guarda una copia de vez en cuando.
          </p>

          {backupIsStale && (expenses?.length ?? 0) > 0 && (
            <p className="settings-warn">
              {lastBackup
                ? 'Hace más de dos semanas de tu última copia.'
                : 'Todavía no has hecho ninguna copia.'}
            </p>
          )}

          <button type="button" className="sheet-cta" onClick={shareBackup} disabled={!backupFile}>
            Guardar copia
          </button>
          <button type="button" className="settings-action" onClick={shareCsv}>
            Exportar a CSV
          </button>

          <input
            ref={restoreRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) return
              void file.text().then(setConfirmRestore)
            }}
          />
          <button
            type="button"
            className="settings-action settings-action--quiet"
            onClick={() => restoreRef.current?.click()}
          >
            Restaurar una copia…
          </button>

          <dl className="settings-facts">
            <div>
              <dt>Movimientos guardados</dt>
              <dd className="num">{expenses?.length ?? 0}</dd>
            </div>
            {storage?.usageBytes !== null && storage?.usageBytes !== undefined && (
              <div>
                <dt>Espacio usado</dt>
                <dd className="num">{formatBytes(storage.usageBytes)}</dd>
              </div>
            )}
            <div>
              <dt>Almacenamiento protegido</dt>
              <dd>
                {storage?.persisted ? (
                  'Sí'
                ) : (
                  <button
                    type="button"
                    className="settings-link"
                    onClick={() =>
                      void requestPersistence().then((granted) => {
                        void storageInfo().then(setStorage)
                        toast.show(
                          granted
                            ? 'Almacenamiento protegido'
                            : 'El navegador no lo ha concedido; instala la app y sigue haciendo copias'
                        )
                      })
                    }
                  >
                    Pedirlo
                  </button>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* --- Importación --- */}
        <section className="settings-card">
          <ImportSection />
        </section>

        {/* --- Automatización de la tarjeta --- */}
        <AutomationGuide />

        {/* --- Instalación --- */}
        {!install.installed && (
          <section className="settings-card">
            <h2 className="settings-section-title">Instalar en el móvil</h2>
            <p className="settings-hint">
              Instalada ocupa toda la pantalla, arranca al instante y —esto es lo importante— el
              sistema deja de borrar sus datos por falta de uso.
            </p>
            {install.canPrompt ? (
              <button type="button" className="sheet-cta" onClick={install.promptInstall}>
                Instalar Caudal
              </button>
            ) : install.isIos ? (
              <p className="settings-steps">
                Toca <strong>Compartir</strong> en la barra de Safari y luego{' '}
                <strong>Añadir a pantalla de inicio</strong>.
              </p>
            ) : (
              <p className="settings-steps">
                Abre el menú del navegador y busca <strong>Instalar aplicación</strong>.
              </p>
            )}
          </section>
        )}

        {/* --- Catálogos --- */}
        <section className="settings-card">
          <h2 className="settings-section-title">Métodos y categorías</h2>
          <CatalogEditor
            label="Métodos de pago"
            items={methods.map((method) => `${method.emoji} ${method.name}`)}
            placeholder="Tarjeta BBVA"
            onAdd={(name, emoji) => {
              void addMethod(name, emoji, 'card')
              toast.show(`Método «${name}» añadido`)
            }}
            defaultEmoji="💳"
          />
          <CatalogEditor
            label="Categorías"
            items={categories.map((category) => `${category.emoji} ${category.name}`)}
            placeholder="Mascota"
            onAdd={(name, emoji) => {
              void addCategory(name, emoji, categories.length % 8)
              toast.show(`Categoría «${name}» añadida`)
            }}
            defaultEmoji="✨"
          />
        </section>

        {/* --- Apariencia --- */}
        <section className="settings-card">
          <h2 className="settings-section-title">Apariencia</h2>
          <div className="settings-segment">
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : ''}
              onClick={() => setTheme('dark')}
            >
              Oscuro
            </button>
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : ''}
              onClick={() => setTheme('light')}
            >
              Claro
            </button>
          </div>
        </section>

        <footer className="settings-foot">
          <LogoLockup size={26} level={0.61} />
          <p>{BRAND.tagline}</p>
          <p className="settings-foot-note">
            {spaces.length} apartados · {expenses?.length ?? 0} movimientos · todo en este
            dispositivo
          </p>
        </footer>
      </div>

      <Sheet
        open={confirmRestore !== null}
        onClose={() => setConfirmRestore(null)}
        title="¿Restaurar la copia?"
      >
        <div className="confirm">
          <p className="confirm-text">
            Se sustituirá TODO lo que hay ahora por el contenido de la copia. Lo que no esté en ella
            se pierde.
          </p>
          <button
            type="button"
            className="sheet-danger"
            onClick={() => {
              const raw = confirmRestore
              setConfirmRestore(null)
              if (!raw) return
              void restoreBackup(raw).then(
                (summary) => toast.show(`Restaurados ${summary.expenses} movimientos`),
                (error: Error) => toast.show(error.message)
              )
            }}
          >
            Sí, restaurar
          </button>
          <button type="button" className="confirm-cancel" onClick={() => setConfirmRestore(null)}>
            Cancelar
          </button>
        </div>
      </Sheet>
    </div>
  )
}

/** Alta rápida de un método o una categoría, sin salir de Ajustes. */
function CatalogEditor({
  label,
  items,
  placeholder,
  onAdd,
  defaultEmoji,
}: {
  label: string
  items: string[]
  placeholder: string
  onAdd: (name: string, emoji: string) => void
  defaultEmoji: string
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(defaultEmoji)

  return (
    <div className="catalog">
      <span className="field-label">{label}</span>
      <ul className="catalog-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="settings-inline">
        <input
          className="field-input catalog-emoji"
          type="text"
          value={emoji}
          onChange={(event) => setEmoji(event.target.value.slice(0, 2) || defaultEmoji)}
          aria-label={`Icono para ${label}`}
        />
        <input
          className="field-input"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={placeholder}
          enterKeyHint="done"
          maxLength={24}
        />
        <button
          type="button"
          className="settings-action"
          disabled={!name.trim()}
          onClick={() => {
            onAdd(name.trim(), emoji)
            setName('')
            setEmoji(defaultEmoji)
          }}
        >
          Añadir
        </button>
      </div>
    </div>
  )
}

function readTheme(): 'dark' | 'light' {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}
