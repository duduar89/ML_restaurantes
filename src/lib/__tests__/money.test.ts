import { describe, expect, it } from 'vitest'
import { formatMoney, parseAmount, percentChange, splitEvenly, sum } from '../money'
import { applyKey } from '../keypad'

describe('parseAmount', () => {
  it('entiende el formato español', () => {
    expect(parseAmount('12,50')).toBe(1250)
    expect(parseAmount('1.234,56')).toBe(123456)
    expect(parseAmount('12,5')).toBe(1250)
    expect(parseAmount('1234')).toBe(123400)
  })

  it('acepta también el formato anglosajón y el símbolo', () => {
    expect(parseAmount('12.50')).toBe(1250)
    expect(parseAmount('1,234.56')).toBe(123456)
    expect(parseAmount('12 €')).toBe(1200)
  })

  it('rechaza lo que no es un importe', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('abc')).toBeNull()
    expect(parseAmount(',')).toBeNull()
    expect(parseAmount('-')).toBeNull()
  })

  it('no pierde céntimos por coma flotante', () => {
    // 0.1 + 0.2 === 0.30000000000000004 en coma flotante; en céntimos, no.
    expect(parseAmount('0,10')! + parseAmount('0,20')!).toBe(30)
  })
})

describe('formatMoney', () => {
  it('mantiene el separador de miles también con cuatro dígitos', () => {
    // es-ES lo omite por defecto en 4 dígitos: la columna cambiaría de forma
    // a mitad de lista.
    expect(formatMoney(123450)).toMatch(/^1\.234,50/)
    expect(formatMoney(1234567)).toMatch(/^12\.345,67/)
    expect(formatMoney(0)).toMatch(/^0,00/)
  })
})

describe('splitEvenly', () => {
  it('reparte sin perder ni inventar céntimos', () => {
    expect(splitEvenly(100, 3)).toEqual([34, 33, 33])
    expect(sum(splitEvenly(100, 3))).toBe(100)
    expect(sum(splitEvenly(1, 4))).toBe(1)
    expect(splitEvenly(10, 0)).toEqual([])
  })
})

describe('percentChange', () => {
  it('calcula la variación', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(50, 100)).toBe(-50)
  })

  it('devuelve null cuando no hay base con la que comparar', () => {
    expect(percentChange(50, 0)).toBeNull()
  })
})

describe('applyKey', () => {
  it('teclea de izquierda a derecha, no acumulando céntimos', () => {
    // Un café de 3 € tiene que costar UNA pulsación.
    expect(parseAmount(applyKey('', '3'))).toBe(300)
    expect(applyKey('', '5')).toBe('5')
    expect(applyKey('1', '2')).toBe('12')
  })

  it('no deja ceros a la izquierda', () => {
    expect(applyKey('0', '5')).toBe('5')
  })

  it('admite una sola coma y como mucho dos decimales', () => {
    expect(applyKey('12', ',')).toBe('12,')
    expect(applyKey('12,', ',')).toBe('12,')
    expect(applyKey('', ',')).toBe('0,')
    expect(applyKey('12,5', '0')).toBe('12,50')
    expect(applyKey('12,50', '9')).toBe('12,50')
  })

  it('borra y topa los enteros', () => {
    expect(applyKey('12,50', '⌫')).toBe('12,5')
    expect(applyKey('', '⌫')).toBe('')
    expect(applyKey('1234567', '8')).toBe('1234567')
  })
})
