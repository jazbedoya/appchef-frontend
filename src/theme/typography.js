// src/theme/typography.js
// -----------------------------------------------------------------------------
// Dos personalidades: SERIF de portada (Newsreader) para masthead/titulares y
// SANS (Hanken Grotesk) para cuerpo, más un MONO (Space Mono) para versalitas,
// precios y botones.
//
// Fuentes @expo-google-fonts a instalar:
//   expo install @expo-google-fonts/newsreader \
//                @expo-google-fonts/hanken-grotesk \
//                @expo-google-fonts/space-mono expo-font
//
// Carga con useFonts (ver App.js). Con fuentes de Google en RN, la variante de
// peso ES la familia (p. ej. 'Newsreader_500Medium'); el fontWeight se deja como
// referencia pero la familia es la que manda.
// -----------------------------------------------------------------------------

export const fonts = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_400Regular_Italic',
  sans: 'HankenGrotesk_400Regular',
  sansMedium: 'HankenGrotesk_500Medium',
  sansSemiBold: 'HankenGrotesk_600SemiBold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
};

// Estilos de texto listos para hacer spread: { ...typography.dinnerTitle }
export const typography = {
  // Wordmark del masthead — "APP CHEF"
  masthead: { fontFamily: fonts.serifMedium, fontWeight: '500', fontSize: 27, lineHeight: 32, letterSpacing: 10 },
  // Titular de portada / nombre gigante
  coverTitle: { fontFamily: fonts.serif, fontWeight: '400', fontSize: 42, lineHeight: 41, letterSpacing: -0.8 },
  // Título de sección grande (Mensajes)
  sectionTitle: { fontFamily: fonts.serif, fontWeight: '400', fontSize: 40, lineHeight: 42, letterSpacing: -0.6 },
  // Título de sección medio ("3 cenas cerca de ti")
  sectionTitleSm: { fontFamily: fonts.serif, fontWeight: '400', fontSize: 26, lineHeight: 29, letterSpacing: -0.3 },
  // Título de una cena en lista / conversación
  dinnerTitle: { fontFamily: fonts.serif, fontWeight: '400', fontSize: 18, lineHeight: 21, letterSpacing: 0 },
  // Standfirst en serif itálica
  standfirst: { fontFamily: fonts.serifItalic, fontWeight: '400', fontStyle: 'italic', fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  // Cuerpo
  body: { fontFamily: fonts.sans, fontWeight: '400', fontSize: 13, lineHeight: 20, letterSpacing: 0 },
  bodyLg: { fontFamily: fonts.sans, fontWeight: '400', fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  // Versalitas / labels
  label: { fontFamily: fonts.mono, fontWeight: '400', fontSize: 10, lineHeight: 14, letterSpacing: 2, textTransform: 'uppercase' },
  labelSm: { fontFamily: fonts.monoBold, fontWeight: '600', fontSize: 8, lineHeight: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  // Precio / metadatos numéricos
  price: { fontFamily: fonts.mono, fontWeight: '400', fontSize: 11, lineHeight: 15, letterSpacing: 0 },
  // Botón (mono versalitas)
  button: { fontFamily: fonts.monoBold, fontWeight: '600', fontSize: 10, lineHeight: 14, letterSpacing: 1.2, textTransform: 'uppercase' },
  // Hora del status bar / texto de sistema
  systemStrong: { fontFamily: fonts.sansSemiBold, fontWeight: '600', fontSize: 16, lineHeight: 20, letterSpacing: 0 },
};

// Compat: old screens use default import
export default typography;
