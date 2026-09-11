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

describe('avisos que NO son un gasto', () => {
  const aviso = (text: string) =>
    parseCapture(new URLSearchParams(`text=${encodeURIComponent(text)}`))

  it('descarta un pago rechazado', () => {
    // Un rechazo genera notificación igual que una compra. Si se apuntara, el
    // gasto sería falso y sólo se vería al descuadrar el mes.
    expect(aviso('Compra RECHAZADA de 23,45 EUR en MERCADONA')).toBeNull()
    expect(aviso('Operación denegada por 12,00 € en ZARA')).toBeNull()
    expect(aviso('Intento de compra de 40,00 EUR no autorizado')).toBeNull()
  })

  it('marca una devolución como ingreso, no como gasto', () => {
    const result = aviso('Devolución de 23,45 EUR de MERCADONA en tu tarjeta')
    expect(result?.kind).toBe('income')
    expect(result?.amountCents).toBe(2345)
  })

  it('marca un abono como ingreso', () => {
    expect(aviso('Abono de 1.200,00 EUR: NOMINA')?.kind).toBe('income')
  })

  it('una compra normal sigue siendo gasto', () => {
    expect(aviso('Compra de 23,45 EUR en MERCADONA')?.kind).toBe('expense')
  })
})

describe('texto en crudo con caracteres que parten la URL', () => {
  it('no pierde el comercio cuando el aviso lleva un &', () => {
    // "compra en H&M" partiría la cadena de consulta en dos: URLSearchParams
    // se quedaría con "Compra de 30,00 EUR en H" y perdería el resto.
    const search = '?auto=1&texto=Compra%20de%2030,00%20EUR%20en%20H&M%20GRAN%20VIA'
    const result = parseCapture(new URLSearchParams(search), search)
    expect(result?.amountCents).toBe(3000)
    expect(result?.concept).toContain('H&M')
  })

  it('un % suelto no tira por tierra el resto del texto', () => {
    // "EL CORTE INGLES 100%" acaba con un '%' que no abre ningún escape, y eso
    // hace que decodeURIComponent rechace la cadena ENTERA — incluidos los %20
    // que sí son válidos. El importe quedaba pegado a "%20EUR" y no se leía:
    // el gasto se perdía entero.
    const search = '?auto=1&texto=Compra%2045,00%20EUR%20en%20EL%20CORTE%20INGLES%20100%'
    const result = parseCapture(new URLSearchParams(search), search)
    expect(result?.amountCents).toBe(4500)
  })

  it('descodifica los acentos aunque el texto traiga un % suelto', () => {
    // Un acento son dos escapes seguidos (%C3%A9); hay que traducirlos juntos
    // o no sale la letra.
    const search = '?auto=1&texto=Compra%2010,00%20EUR%20en%20CAF%C3%89%20100%'
    const result = parseCapture(new URLSearchParams(search), search)
    expect(result?.amountCents).toBe(1000)
    expect(result?.concept).toContain('CAFÉ')
  })

  it('acepta el texto sin codificar', () => {
    // Si la automatización no codifica, el texto llega con espacios tal cual.
    const search = '?texto=Compra de 12,50 EUR en MERCADONA'
    const result = parseCapture(new URLSearchParams(search), search)
    expect(result?.amountCents).toBe(1250)
    expect(result?.concept).toContain('MERCADONA')
  })

  it('sobrevive a un % suelto sin reventar', () => {
    // decodeURIComponent lanza con un '%' que no forma una secuencia válida.
    const search = '?texto=Compra de 5,00 EUR en 100% NATURAL'
    const result = parseCapture(new URLSearchParams(search), search)
    expect(result?.amountCents).toBe(500)
  })

  it('el crudo tiene prioridad sobre el valor recortado', () => {
    const search = '?texto=Pago de 8,00 EUR en BAR&CO'
    const viaParams = new URLSearchParams(search)
    expect(viaParams.get('texto')).toBe('Pago de 8,00 EUR en BAR')
    expect(parseCapture(viaParams, search)?.concept).toContain('BAR&CO')
  })
})

describe('importes dentro del texto del aviso', () => {
  const aviso = (text: string) => {
    const search = `?texto=${encodeURIComponent(text)}`
    return parseCapture(new URLSearchParams(search), search)
  }

  it('no se come los decimales del formato inglés', () => {
    // El fallo más peligroso posible: el gasto se apunta, pero por menos
    // dinero del real, y nada lo delata.
    expect(aviso('Has gastado €2.50 en Filmin')?.amountCents).toBe(250)
    expect(aviso('Pago de €9.99 en Spotify')?.amountCents).toBe(999)
  })

  it('sigue leyendo bien el formato español', () => {
    expect(aviso('Has gastado 9,99 €')?.amountCents).toBe(999)
    expect(aviso('Compra de 1.056,42 EUR en IKEA')?.amountCents).toBe(105642)
    expect(aviso('Cargo de 23,45 € en MERCADONA')?.amountCents).toBe(2345)
  })

  it('no confunde el saldo con el importe', () => {
    // Revolut manda el saldo en la segunda línea. Si se colara, el gasto
    // apuntado sería el dinero que te queda en la cuenta.
    const result = aviso('Has gastado 9,99 €\nSaldo de EUR: 1.056,42 €')
    expect(result?.amountCents).toBe(999)
  })
})

describe('avisos de dinero que entra', () => {
  const aviso = (text: string) => {
    const search = `?texto=${encodeURIComponent(text)}`
    return parseCapture(new URLSearchParams(search), search)
  }

  it('"has recibido" es un ingreso, no un gasto', () => {
    expect(aviso('Has recibido 72,95 € de Marta')?.kind).toBe('income')
  })

  it('"te ha enviado" es un ingreso', () => {
    expect(aviso('Alex te ha enviado 38,70 €')?.kind).toBe('income')
  })

  it('"has enviado" sigue siendo un gasto', () => {
    // Sale dinero: es un gasto aunque no sea una compra.
    expect(aviso('Has enviado 2,50 € a Alex Ruiz')?.kind).toBe('expense')
  })

  it('un pago programado todavía no ha ocurrido', () => {
    expect(aviso('Tu pago de €2.50 a Alex está programado')).toBeNull()
  })
})
