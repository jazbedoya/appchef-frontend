import { Platform } from 'react-native';
import colors from './colors';

const fontFamily = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', web: '"Cormorant Garamond", Georgia, serif' }),
  displayBold: Platform.select({ ios: 'Georgia-Bold', android: 'serif', web: '"Cormorant Garamond", Georgia, serif' }),
  sansRegular: Platform.select({ ios: 'System', android: 'sans-serif', web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  sansBold: Platform.select({ ios: 'System', android: 'sans-serif-bold', web: '"DM Sans", "Helvetica Neue", sans-serif' }),
  mono: Platform.select({ ios: 'Courier New', android: 'monospace', web: 'monospace' }),
};

export const typography = {
  displayLarge: { fontFamily: fontFamily.displayBold, fontSize: 40, fontWeight: '700', lineHeight: 50, color: colors.primary, letterSpacing: -0.5 },
  displayMedium: { fontFamily: fontFamily.displayBold, fontSize: 32, fontWeight: '700', lineHeight: 40, color: colors.primary, letterSpacing: -0.3 },
  displaySmall: { fontFamily: fontFamily.displayBold, fontSize: 26, fontWeight: '700', lineHeight: 34, color: colors.primary },

  h1: { fontFamily: fontFamily.displayBold, fontSize: 22, fontWeight: '700', lineHeight: 30, color: colors.text },
  h2: { fontFamily: fontFamily.displayBold, fontSize: 18, fontWeight: '700', lineHeight: 26, color: colors.text },
  h3: { fontFamily: fontFamily.sansMedium, fontSize: 16, fontWeight: '600', lineHeight: 24, color: colors.text },

  bodyLarge: { fontFamily: fontFamily.sansRegular, fontSize: 16, fontWeight: '400', lineHeight: 26, color: colors.gray700 },
  body: { fontFamily: fontFamily.sansRegular, fontSize: 14, fontWeight: '400', lineHeight: 22, color: colors.gray700 },
  bodySmall: { fontFamily: fontFamily.sansRegular, fontSize: 12, fontWeight: '400', lineHeight: 18, color: colors.textMuted },

  labelLarge: { fontFamily: fontFamily.sansMedium, fontSize: 14, fontWeight: '600', lineHeight: 20, color: colors.gray700, letterSpacing: 0.1 },
  label: { fontFamily: fontFamily.sansMedium, fontSize: 13, fontWeight: '500', lineHeight: 18, color: colors.primary, letterSpacing: 0.3 },
  labelSmall: { fontFamily: fontFamily.sansMedium, fontSize: 10, fontWeight: '600', lineHeight: 16, color: colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },

  price: { fontFamily: fontFamily.displayBold, fontSize: 18, fontWeight: '700', color: colors.primary, lineHeight: 24 },
  priceLarge: { fontFamily: fontFamily.displayBold, fontSize: 26, fontWeight: '700', color: colors.primary, lineHeight: 32 },

  buttonLarge: { fontFamily: fontFamily.sansBold, fontSize: 16, fontWeight: '600', lineHeight: 24, letterSpacing: 1, textTransform: 'uppercase' },
  button: { fontFamily: fontFamily.sansBold, fontSize: 14, fontWeight: '600', lineHeight: 20, letterSpacing: 1, textTransform: 'uppercase' },
  buttonSmall: { fontFamily: fontFamily.sansBold, fontSize: 12, fontWeight: '600', lineHeight: 18, letterSpacing: 0.5 },

  caption: { fontFamily: fontFamily.sansRegular, fontSize: 11, fontWeight: '400', lineHeight: 16, color: colors.textMuted },
  overline: { fontFamily: fontFamily.sansMedium, fontSize: 10, fontWeight: '600', lineHeight: 16, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.accent },
  link: { fontFamily: fontFamily.sansMedium, fontSize: 14, fontWeight: '500', lineHeight: 22, color: colors.accent, textDecorationLine: 'underline' },
};

export default typography;
