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
  /* El color del tema es el lienzo, no el de marca: una barra de estado
     naranja pelearía con el fondo de la app. */
  themeColor: '#16110e',
  backgroundColor: '#16110e',
  /*
   * El aro es barro cocido y el caudal de dentro es verde agua. No es un
   * degradado decorativo entre dos tonos: son los dos materiales de los que
   * habla el nombre, una vasija y el agua que lleva.
   */
  vessel: '#e0763f',
  vesselLight: '#ee9668',
  water: '#4fb3a4',
  waterLight: '#6fc7b9',
} as const
