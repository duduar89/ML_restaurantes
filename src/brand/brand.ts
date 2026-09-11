/**
 * Única fuente de verdad de la marca. El nombre, el color y el lema sólo se
 * escriben aquí; el manifiesto, el logo y la interfaz los leen de este módulo.
 *
 * Caudal: la RAE recoge dos acepciones vivas que encajan las dos a la vez —
 * "cantidad de agua que mana o corre" y "hacienda, bienes de cualquier
 * especie, y más comúnmente dinero". Una sola palabra española que significa
 * caudal y dinero es exactamente lo que es una app de gastos, y de ahí sale
 * todo el vocabulario: entradas, salidas y apartados por los que fluye.
 */
export const BRAND = {
  name: 'Caudal',
  /** Sin acentos: sirve para URLs, nombres de archivo y el id del manifiesto. */
  slug: 'caudal',
  /** <= 12 caracteres: Android e iOS truncan el rótulo del icono. */
  shortName: 'Caudal',
  tagline: 'Tu dinero, en movimiento',
  description:
    'Control de gastos personales. Apunta en segundos, separa por apartados y mira a dónde va tu dinero.',
  /* El color del tema es el lienzo, no el violeta: una barra de estado
     violeta pelea con el fondo de la app. */
  themeColor: '#0a0912',
  backgroundColor: '#0a0912',
  gradientFrom: '#35e0f5',
  gradientTo: '#7b5cff',
} as const
