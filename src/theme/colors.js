// src/theme/colors.js
// -----------------------------------------------------------------------------
// Paleta SEMÁNTICA del rediseño editorial de App Chef.
// Acento bermellón (sustituye al gold antiguo #D4A853), fondo marfil, tinta casi
// negra. Todos los valores de color de la app salen de aquí — ni un hex suelto en
// los componentes.
// -----------------------------------------------------------------------------

export const colors = {
  // Acento
  accent: '#BF4726', // bermellón: CTAs, precios destacados, pines, badge, tab activa
  onAccent: '#F1EADD', // texto/icono sobre el acento

  // Fondos y superficies
  background: '#F1EADD', // marfil: fondo de todas las pantallas
  surface: '#E7DECC', // bloques del mapa / superficies secundarias
  surfaceAlt: '#EBE3D3', // base del mapa

  // Texto
  textPrimary: '#1A1613', // tinta: titulares, cuerpo principal, iconos
  textSecondary: '#5F574A', // standfirst en serif itálica
  textMuted: '#8B8072', // metadatos, versalitas, precios secundarios

  // Líneas
  border: '#1A1613', // filetes fuertes (reglas de portada, marcos, botones outline)
  borderHairline: 'rgba(26,22,19,0.14)', // filetes finos entre items de lista

  // Comercio
  price: '#1A1613', // precio en fichas (mono)
  badge: '#BF4726', // fondo del contador de mensajes no leídos
  onBadge: '#F1EADD', // texto del badge

  // Placeholder de imagen (donde irá un <Image> real)
  imagePlaceholder: '#221D16',
  onImageMuted: 'rgba(241,234,221,0.32)',

  // Mapa (alphas ya horneados para no necesitar tokens de opacidad)
  mapWater: '#DDD4C0',
  mapPark: '#E3DBC8',
  mapRoad: 'rgba(26,22,19,0.5)',
  mapRoadFaint: 'rgba(26,22,19,0.3)',
  locationDot: '#1A1613',
  locationHalo: 'rgba(26,22,19,0.14)',

  // Chrome
  scrim: 'rgba(26,22,19,0.28)', // home indicator / velos
};
