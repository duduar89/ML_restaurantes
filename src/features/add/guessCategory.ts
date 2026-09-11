import type { Category } from '@/db/types'

/**
 * Adivina la categoría a partir del concepto. No pretende acertar siempre:
 * pretende que en el caso habitual ("Mercadona", "café", "metro") el usuario
 * no tenga que tocar nada más, que es la diferencia entre apuntar un gasto y
 * no apuntarlo.
 *
 * Las claves se comparan sin acentos y en minúsculas.
 */
const HINTS: Record<string, string[]> = {
  Súper: ['mercadona', 'super', 'carrefour', 'lidl', 'dia', 'aldi', 'alcampo', 'eroski', 'compra', 'fruteria', 'panaderia', 'carniceria'],
  Restaurantes: ['cafe', 'cafeteria', 'bar', 'restaurante', 'cena', 'comida', 'menu', 'desayuno', 'tapas', 'cerveza', 'pizza', 'burger', 'sushi', 'glovo', 'ubereats', 'just eat'],
  Transporte: ['metro', 'bus', 'autobus', 'taxi', 'uber', 'cabify', 'gasolina', 'gasolinera', 'parking', 'peaje', 'renfe', 'cercanias', 'tren', 'bicimad', 'patinete', 'itv', 'taller'],
  Casa: ['luz', 'agua', 'gas', 'internet', 'alquiler', 'hipoteca', 'comunidad', 'limpieza', 'ikea', 'ferreteria', 'seguro hogar'],
  Ocio: ['cine', 'concierto', 'teatro', 'museo', 'entrada', 'libro', 'juego', 'padel', 'gimnasio', 'gym', 'futbol'],
  Compras: ['ropa', 'zara', 'amazon', 'zapatos', 'regalo', 'decathlon', 'primark', 'electronica', 'movil'],
  Salud: ['farmacia', 'medico', 'dentista', 'optica', 'fisio', 'psicologo', 'analitica'],
  Suscripciones: ['netflix', 'spotify', 'hbo', 'disney', 'amazon prime', 'movistar', 'vodafone', 'orange', 'icloud', 'suscripcion', 'cuota'],
  Viaje: ['hotel', 'airbnb', 'vuelo', 'ryanair', 'vueling', 'iberia', 'booking', 'maleta', 'excursion', 'souvenir'],
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/** Devuelve el id de la categoría más probable, o null si no hay pista clara. */
export function guessCategoryId(concept: string, categories: Category[]): string | null {
  const text = normalize(concept)
  if (text.length < 3) return null

  for (const [categoryName, keywords] of Object.entries(HINTS)) {
    if (!keywords.some((keyword) => text.includes(keyword))) continue
    const match = categories.find((category) => category.name === categoryName)
    if (match) return match.id
  }

  return null
}
