import { useRef, useState } from 'react'
import { useToast } from '@/components/Toast'
import { useAppData } from '@/app/store'
import { importExpenses } from '@/db/repo'
import { guessCategoryId } from '@/features/add/guessCategory'
import { parseNorma43 } from '@/features/import/norma43'
import { parseCsv, type CsvResult } from '@/features/import/csv'
import { formatMoney } from '@/lib/money'
import { formatDayShort } from '@/lib/dates'
import './ImportSection.css'

/**
 * Importar el extracto del banco en formato Norma 43.
 *
 * Es la vía que no depende de avisos ni de automatizaciones frágiles: lo
 * descargas de la banca electrónica una vez al mes y no se deja ni un
 * movimiento. Todos los bancos españoles lo exportan igual.
 *
 * SIEMPRE con vista previa. Importar a ciegas un fichero de ancho fijo es la
 * forma más rápida de meter basura en los totales sin enterarse.
 */
export function ImportSection() {
  const toast = useToast()
  const { spaces, methods, categories, entrySpace } = useAppData()
  const inputRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<CsvResult | null>(null)
  const [spaceId, setSpaceId] = useState<string | null>(null)
  const [includeIncome, setIncludeIncome] = useState(true)
  const [busy, setBusy] = useState(false)

  async function onFile(file: File) {
    // Los ficheros de banco españoles suelen venir en latin1; si el texto sale
    // con caracteres de reemplazo, se reintenta.
    let text = await file.text()
    if (text.includes('�')) {
      text = new TextDecoder('iso-8859-1').decode(await file.arrayBuffer())
    }

    // Se elige por el contenido, no por la extensión: los bancos bautizan los
    // ficheros como les parece y un Norma 43 llega tan a menudo como .txt que
    // como .n43. Norma 43 es de ancho fijo y sus registros empiezan por un
    // código de dos dígitos, así que se reconoce solo.
    const pareceNorma43 = /^(11|22|23|33|88)/.test(text.trimStart().slice(0, 2))
    const parsed: CsvResult = pareceNorma43
      ? { ...parseNorma43(text), columns: null, warnings: [] }
      : parseCsv(text)

    if (parsed.movements.length === 0) {
      // Se enseña el motivo. "No he encontrado movimientos" a secas deja a la
      // persona sin saber si el fichero está mal, si es el formato equivocado
      // o si la app no sirve.
      toast.show(parsed.problems[0]?.reason ?? 'No he encontrado movimientos en ese archivo')
      return
    }
    setPreview(parsed)
    setSpaceId(entrySpace?.id ?? spaces[0]?.id ?? null)
  }

  async function confirmImport() {
    if (!preview || !spaceId) return
    setBusy(true)

    const cardMethod = methods.find((method) => method.kind === 'card') ?? methods[0]
    const rows = preview.movements
      .filter((movement) => includeIncome || movement.isDebit)
      .map((movement) => ({
        amountCents: movement.amountCents,
        concept: movement.concept,
        methodId: cardMethod?.id ?? '',
        categoryId: guessCategoryId(movement.concept, categories) ?? categories.at(-1)?.id ?? '',
        spaceId,
        day: movement.day,
        kind: movement.isDebit ? ('expense' as const) : ('income' as const),
        externalId: movement.externalId,
      }))

    const { added, skipped } = await importExpenses(rows)
    setBusy(false)
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''

    toast.show(
      skipped > 0
        ? `${added} movimientos importados · ${skipped} ya los tenías`
        : `${added} movimientos importados`
    )
  }

  const debits = preview?.movements.filter((movement) => movement.isDebit) ?? []
  const credits = preview?.movements.filter((movement) => !movement.isDebit) ?? []

  return (
    <section className="importsec">
      <h2 className="settings-section-title">Importar extracto del banco</h2>
      <p className="settings-hint">
        Descarga el extracto desde la web de tu banco y suéltalo aquí. Vale tanto{' '}
        <strong>Norma 43</strong> («Cuaderno 43», el que exportan igual BBVA, Santander, CaixaBank,
        Sabadell y Bankinter) como un <strong>CSV</strong> corriente, que es lo que suele estar más
        a mano y lo único que dan Revolut y N26. Lo que ya tengas apuntado no se duplica.
      </p>
      <p className="settings-hint">
        Si tu banco te deja elegir el separador del CSV, coge <strong>punto y coma</strong>: con
        comas, los céntimos se confunden con el separador y el archivo no se puede leer sin riesgo.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".n43,.q43,.txt,.043,.csv,.tsv,text/plain,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void onFile(file)
        }}
      />

      <button type="button" className="settings-action" onClick={() => inputRef.current?.click()}>
        Elegir archivo…
      </button>

      {preview && (
        <div className="importsec-preview">
          <header className="importsec-head">
            <span>Vista previa</span>
            <button type="button" onClick={() => setPreview(null)}>
              Cancelar
            </button>
          </header>

          <dl className="importsec-summary">
            <div>
              <dt>Cuenta</dt>
              <dd>{preview.account ?? '—'}</dd>
            </div>
            <div>
              <dt>Periodo</dt>
              <dd>
                {preview.from && preview.to
                  ? `${formatDayShort(preview.from)} – ${formatDayShort(preview.to)}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Cargos</dt>
              <dd className="num">
                {debits.length} · {formatMoney(debits.reduce((acc, m) => acc + m.amountCents, 0))}
              </dd>
            </div>
            <div>
              <dt>Abonos</dt>
              <dd className="num">
                {credits.length} ·{' '}
                {formatMoney(credits.reduce((acc, m) => acc + m.amountCents, 0))}
              </dd>
            </div>
          </dl>

          {preview.warnings.map((warning) => (
            <p key={warning} className="importsec-warning">
              {warning}
            </p>
          ))}

          {preview.columns && (
            <p className="importsec-columns">
              He leído la fecha de «{preview.columns.day}», el concepto de «
              {preview.columns.concept ?? '—'}» y el importe de «
              {preview.columns.amount ?? `${preview.columns.debit} / ${preview.columns.credit}`}».
            </p>
          )}

          {preview.problems.length > 0 && (
            <p className="importsec-problems">
              {preview.problems.length} línea{preview.problems.length === 1 ? '' : 's'} sin leer (
              {preview.problems[0].reason}). El resto se importa igual.
            </p>
          )}

          <ul className="importsec-rows">
            {preview.movements.slice(0, 6).map((movement) => (
              <li key={movement.externalId}>
                <span className="importsec-day">{formatDayShort(movement.day)}</span>
                <span className="importsec-concept">{movement.concept}</span>
                <span className={`importsec-amount num ${movement.isDebit ? '' : 'importsec-amount--in'}`}>
                  {movement.isDebit ? '' : '+'}
                  {formatMoney(movement.amountCents)}
                </span>
              </li>
            ))}
            {preview.movements.length > 6 && (
              <li className="importsec-more">y {preview.movements.length - 6} más…</li>
            )}
          </ul>

          <label className="settings-row settings-row--toggle">
            <span>Importar también los ingresos</span>
            <input
              type="checkbox"
              checked={includeIncome}
              onChange={(event) => setIncludeIncome(event.target.checked)}
            />
          </label>

          <div className="field">
            <span className="field-label">Apartado de destino</span>
            <div className="chips">
              {spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  className={`chip ${space.id === spaceId ? 'chip--active' : ''}`}
                  style={{ '--chip-accent': `var(--space-${space.colorIndex})` } as React.CSSProperties}
                  onClick={() => setSpaceId(space.id)}
                >
                  {space.emoji} {space.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="sheet-cta"
            disabled={busy || !spaceId}
            onClick={() => void confirmImport()}
          >
            {busy ? 'Importando…' : `Importar ${includeIncome ? preview.movements.length : debits.length} movimientos`}
          </button>
        </div>
      )}
    </section>
  )
}
