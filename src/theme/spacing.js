// src/theme/spacing.js
// Escala de espaciado del diseño (base 4). Úsala para paddings, margins y gaps.
// Compat: old screens import { borderRadius, shadows } from spacing
export const borderRadius = {
  xs: 3, sm: 5, md: 8, lg: 12, xl: 16, full: 999,
};
export const shadows = {
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
};

export const spacing = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 30,
  xxxl: 44,
  gutter: 26, // margen horizontal estándar de pantalla (portada / listas)
  tabBarBottom: 28, // reserva inferior del tab bar (safe-area aprox.)
  floatingTabInset: 18,
  floatingTabBottom: 26,
  floatingTabTotalH: 102, // 56 bar + 26 bottom + 20 margin — use as paddingBottom on all screens
};
