import { describe, expect, it } from 'vitest'
import { parseCapture } from '../parseCapture'

function capture(query: string) {
  return parseCapture(new URLSearchParams(query))
}

describe('parseCapture', () => {
  it('lee los parámetros explícitos de un atajo', () => {
    const result = capture('importe=12,50&concepto=Mercadona&fecha=2026-09-05&metodo=tarjeta')
    expect(result?.amountCents).toBe(1250)
    expect(result?.concept).toBe('Mercadona')
    expect(result?.day).toBe('2026-09-05')
    expect(result?.methodHint).toBe('tarjeta')
    expect(result?.source).toBe('automation')
  })

  it('acepta los nombres en inglés', () => {
    expect(capture('amount=9.99&merchant=Spotify')?.amountCents).toBe(999)
  })

  it('saca importe y comercio del aviso del banco compartido', () => {
    const result = capture(
      'text=' + encodeURIComponent('Compra de 23,45 EUR en MERCADONA con tu tarjeta acabada en 1234')
    )
    expect(result?.amountCents).toBe(2345)
    expect(result?.concept).toContain('MERCADONA')
    expect(result?.source).toBe('share')
  })

  it('reconoce el símbolo delante y detrás', () => {
    expect(capture('text=' + encodeURIComponent('Cargo €4,20'))?.amountCents).toBe(420)
    expect(capture('text=' + encodeURIComponent('Cargo 4,20 €'))?.amountCents).toBe(420)
  })

  it('devuelve null si no hay importe', () => {
    expect(capture('concepto=Nada')).toBeNull()
    expect(capture('')).toBeNull()
  })

  it('da la misma huella al mismo movimiento y otra a uno distinto', () => {
    // Volver a lanzar el atajo no puede crear un segundo gasto.
    const a = capture('importe=10&concepto=Bar&fecha=2026-09-05')
    const b = capture('importe=10&concepto=bar&fecha=2026-09-05')
    const c = capture('importe=11&concepto=Bar&fecha=2026-09-05')
    expect(a?.externalId).toBe(b?.externalId)
    expect(a?.externalId).not.toBe(c?.externalId)
  })

  it('respeta un identificador propio de la automatización', () => {
    expect(capture('importe=10&id=abc123')?.externalId).toBe('automation:abc123')
  })

  it('sólo guarda sin preguntar si se pide explícitamente', () => {
    expect(capture('importe=10')?.auto).toBe(false)
    expect(capture('importe=10&auto=1')?.auto).toBe(true)
  })

  it('usa hoy cuando la fecha falta o es inválida', () => {
    expect(capture('importe=10&fecha=noesunafecha')?.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
