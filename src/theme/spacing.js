/**
 * App Chef Spacing System
 * Based on a 4pt grid. All spacing values are multiples of 4.
 */

export const spacing = {
  // ─── Base scale ───
  xs: 4,    // 4px  - micro gaps
  sm: 8,    // 8px  - tight spacing
  md: 12,   // 12px - standard spacing
  base: 16, // 16px - default padding, margins
  lg: 20,   // 20px - comfortable spacing
  xl: 24,   // 24px - section spacing
  xxl: 32,  // 32px - large sections
  xxxl: 48, // 48px - hero/full sections

  // ─── Component specific ───
  cardPadding: 16,
  cardBorderRadius: 16,
  cardBorderRadiusLarge: 24,

  screenPadding: 16,        // Horizontal screen padding
  screenPaddingLarge: 24,

  headerHeight: 60,
  tabBarHeight: 80,
  bottomInset: 34,          // iOS bottom safe area approximation

  buttonHeight: 52,
  buttonHeightSmall: 40,
  buttonHeightLarge: 56,
  buttonBorderRadius: 12,
  buttonBorderRadiusPill: 100,

  inputHeight: 52,
  inputBorderRadius: 12,
  inputPaddingHorizontal: 16,

  avatarXs: 24,
  avatarSm: 36,
  avatarMd: 48,
  avatarLg: 64,
  avatarXl: 96,
  avatarXxl: 128,

  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  iconXl: 32,

  // ─── Map ───
  mapMarkerSize: 44,
  mapCalloutWidth: 200,
};

export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

import { Platform } from 'react-native';

export const shadows = {
  sm: Platform.select({
    web: { boxShadow: '0px 1px 4px rgba(44,62,45,0.12)' },
    default: { shadowColor: '#2C3E2D', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  }),
  md: Platform.select({
    web: { boxShadow: '0px 2px 8px rgba(44,62,45,0.15)' },
    default: { shadowColor: '#2C3E2D', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  }),
  lg: Platform.select({
    web: { boxShadow: '0px 4px 16px rgba(44,62,45,0.18)' },
    default: { shadowColor: '#2C3E2D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  }),
  xl: Platform.select({
    web: { boxShadow: '0px 8px 24px rgba(44,62,45,0.22)' },
    default: { shadowColor: '#2C3E2D', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.20, shadowRadius: 24, elevation: 12 },
  }),
};

export default spacing;
