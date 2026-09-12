import { describe, expect, it } from 'vitest'
import { parseCsv, parseCsvAmount } from '../csv'

describe('importes de un extracto', () => {
  it.each([
    ['1.234,56', 123456],
    ['1,234.56', 123456],
    ['1234.56', 123456],
    ['1234,56', 123456],
    ['-12,34', -1234],
    ['12,34-', -1234],
    ['(12,34)', -1234],
    ['+45,00', 4500],
    ['1.234.567,89', 123456789],
    ['0,99', 99],
    ['-1.234,56 €', -123456],
    ['12,00 EUR', 1200],
  ])('%s → %d céntimos', (texto, esperado) => {
    expect(parseCsvAmount(texto)).toBe(esperado)
  })

  it('un separador con tres dígitos detrás agrupa millares', () => {
    // "1.234" en un extracto son mil doscientos treinta y cuatro euros. Leerlo
    // como 1,234 € convertiría un gasto de mil euros en uno de un euro.
    expect(parseCsvAmount('1.234')).toBe(123400)
    expect(parseCsvAmount('1,500')).toBe(150000)
  })

  it('un separador con uno o dos dígitos detrás son decimales', () => {
    expect(parseCsvAmount('12.34')).toBe(1234)
    expect(parseCsvAmount('12,5')).toBe(1250)
  })

  it('devuelve null con lo que no es un importe', () => {
    expect(parseCsvAmount('')).toBeNull()
    expect(parseCsvAmount('n/d')).toBeNull()
    expect(parseCsvAmount('Saldo')).toBeNull()
  })
})

describe('extracto con punto y coma y preámbulo', () => {
  // La forma habitual de un CSV de banco español: tres líneas de cabecera con
  // el titular y el periodo, y sólo después la tabla.
  const CSV = `Extracto de cuenta
Titular: EDUARDO A.
IBAN: ES12 3456 7890 1234 5678 9012

Fecha;Fecha valor;Concepto;Importe;Saldo
03/09/2026;03/09/2026;COMPRA EN MERCADONA;-47,85;1.234,10
05/09/2026;05/09/2026;NOMINA SEPTIEMBRE;1.850,00;3.084,10
15/09/2026;15/09/2026;RECIBO LUZ;-62,40;3.021,70`

  const resultado = parseCsv(CSV)

  it('encuentra los tres movimientos', () => {
    expect(resultado.movements).toHaveLength(3)
  })

  it('lee el importe y el signo', () => {
    expect(resultado.movements[0]).toMatchObject({
      day: '2026-09-03',
      amountCents: 4785,
      isDebit: true,
      concept: 'COMPRA EN MERCADONA',
    })
  })

  it('un abono entra como ingreso', () => {
    expect(resultado.movements[1]).toMatchObject({ amountCents: 185000, isDebit: false })
  })

  it('NO confunde el saldo con el importe', () => {
    // El saldo es la trampa de este formato: son números con pinta de dinero
    // en la columna de al lado. Si se escogiera, el extracto entraría entero
    // con cifras creíbles y equivocadas.
    expect(resultado.columns?.amount).toBe('Importe')
    expect(resultado.movements.some((m) => m.amountCents === 123410)).toBe(false)
  })

  it('prefiere la fecha de operación a la fecha valor', () => {
    expect(resultado.columns?.day).toBe('Fecha')
  })

  it('saca el periodo de los movimientos', () => {
    expect(resultado.from).toBe('2026-09-03')
    expect(resultado.to).toBe('2026-09-15')
  })
})

describe('extracto estilo Revolut', () => {
  const CSV = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2026-09-02 08:14:33,2026-09-02 10:02:11,Starbucks,-4.50,0.00,EUR,COMPLETED,120.30
TOPUP,Current,2026-09-03 11:00:00,2026-09-03 11:00:05,Payment from Ana,25.00,0.00,EUR,COMPLETED,145.30`

  const resultado = parseCsv(CSV)

  it('lee las dos filas', () => {
    expect(resultado.movements).toHaveLength(2)
  })

  it('entiende la fecha ISO con hora detrás', () => {
    expect(resultado.movements[0].day).toBe('2026-09-02')
  })

  it('entiende el decimal con punto', () => {
    expect(resultado.movements[0]).toMatchObject({ amountCents: 450, isDebit: true })
    expect(resultado.movements[1]).toMatchObject({ amountCents: 2500, isDebit: false })
  })
})

describe('extracto con columnas de cargo y abono', () => {
  const CSV = `Fecha\tDescripción\tCargo\tAbono
04/09/2026\tGASOLINERA REPSOL\t58,20\t
06/09/2026\tDEVOLUCION ZARA\t\t19,95`

  const resultado = parseCsv(CSV)

  it('reconoce las dos columnas', () => {
    expect(resultado.columns?.debit).toBe('Cargo')
    expect(resultado.columns?.credit).toBe('Abono')
  })

  it('el cargo es gasto y el abono ingreso', () => {
    expect(resultado.movements[0]).toMatchObject({ amountCents: 5820, isDebit: true })
    expect(resultado.movements[1]).toMatchObject({ amountCents: 1995, isDebit: false })
  })
})

describe('celdas entrecomilladas', () => {
  it('no parte una celda por la coma de dentro', () => {
    // "MERCADONA, S.A." es UNA celda. Partirla desplazaría todas las columnas
    // siguientes, y el desplazamiento no rompe nada visiblemente: las fechas
    // seguirían pareciendo fechas.
    const CSV = `Fecha,Concepto,Importe
07/09/2026,"MERCADONA, S.A.",-30.00`
    const resultado = parseCsv(CSV)
    expect(resultado.movements[0].concept).toBe('MERCADONA, S.A.')
    expect(resultado.movements[0].amountCents).toBe(3000)
  })

  it('entiende las comillas dobladas dentro de una celda', () => {
    const CSV = `Fecha,Concepto,Importe
07/09/2026,"BAR ""EL RINCON""",-12.50`
    expect(parseCsv(CSV).movements[0].concept).toBe('BAR "EL RINCON"')
  })
})

describe('orden de día y mes', () => {
  it('deduce día/mes cuando algún día pasa del 12', () => {
    const CSV = `Fecha;Concepto;Importe
25/03/2026;UNO;-10,00
04/03/2026;DOS;-20,00`
    const resultado = parseCsv(CSV)
    expect(resultado.movements[0].day).toBe('2026-03-25')
    expect(resultado.movements[1].day).toBe('2026-03-04')
    expect(resultado.warnings).toHaveLength(0)
  })

  it('deduce mes/día cuando el que pasa de 12 es el segundo', () => {
    const CSV = `Fecha,Concepto,Importe
03/25/2026,UNO,-10.00
03/04/2026,DOS,-20.00`
    expect(parseCsv(CSV).movements[0].day).toBe('2026-03-25')
  })

  it('avisa cuando el orden es indeducible', () => {
    // Si todos los días caen entre el 1 y el 12, nada delata el orden. Elegir
    // mal desplaza los gastos meses enteros sin que falle nada, así que se
    // asume el español pero se dice en voz alta.
    const CSV = `Fecha;Concepto;Importe
03/04/2026;UNO;-10,00
05/06/2026;DOS;-20,00`
    const resultado = parseCsv(CSV)
    expect(resultado.movements[0].day).toBe('2026-04-03')
    expect(resultado.warnings[0]).toMatch(/ambiguas/)
  })
})

describe('cuando no se entiende el archivo', () => {
  it('lo dice en vez de inventarse columnas', () => {
    const resultado = parseCsv('esto no es un extracto\nni de lejos\n')
    expect(resultado.movements).toHaveLength(0)
    expect(resultado.problems[0].reason).toMatch(/cabeceras/)
  })

  it('apunta las filas ilegibles sin tirar las buenas', () => {
    const CSV = `Fecha;Concepto;Importe
03/09/2026;BUENA;-10,00
no-es-fecha;MALA;-20,00
05/09/2026;OTRA BUENA;-30,00`
    const resultado = parseCsv(CSV)
    expect(resultado.movements).toHaveLength(2)
    expect(resultado.problems).toHaveLength(1)
    expect(resultado.problems[0].line).toBe(3)
  })
})

describe('no duplicar al reimportar', () => {
  it('la misma fila da siempre la misma huella', () => {
    const CSV = `Fecha;Concepto;Importe
03/09/2026;MERCADONA;-47,85`
    expect(parseCsv(CSV).movements[0].externalId).toBe(parseCsv(CSV).movements[0].externalId)
  })

  it('dos importes distintos dan huellas distintas', () => {
    const a = parseCsv(`Fecha;Concepto;Importe\n03/09/2026;MERCADONA;-47,85`)
    const b = parseCsv(`Fecha;Concepto;Importe\n03/09/2026;MERCADONA;-47,86`)
    expect(a.movements[0].externalId).not.toBe(b.movements[0].externalId)
  })
})

describe('el separador choca con la coma decimal', () => {
  it('se planta en vez de importar los céntimos equivocados', () => {
    // Separado por comas y con comas decimales: "-47,85" se parte en dos
    // celdas y la columna del importe se queda con "-47". Importarlo daría un
    // gasto de 47,00 € con toda la pinta de ser correcto. Es justo el fallo
    // que no se detecta hasta que ya no te acuerdas de qué importaste.
    const CSV = `Fecha,Concepto,Importe
03/09/2026,MERCADONA,-47,85
05/09/2026,PANADERIA,-3,20`
    const resultado = parseCsv(CSV)
    expect(resultado.movements).toHaveLength(0)
    expect(resultado.problems[0].reason).toMatch(/separador/)
  })

  it('el mismo extracto con punto y coma entra bien', () => {
    const CSV = `Fecha;Concepto;Importe
03/09/2026;MERCADONA;-47,85
05/09/2026;PANADERIA;-3,20`
    const resultado = parseCsv(CSV)
    expect(resultado.movements).toHaveLength(2)
    expect(resultado.movements[0].amountCents).toBe(4785)
    expect(resultado.movements[1].amountCents).toBe(320)
  })
})
