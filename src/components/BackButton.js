// src/components/BackButton.js
// Botón secundario "←" con filete, para volver de paso en el flujo Crear cena.
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';

export default function BackButton({ onPress = () => {} }) {
  return (
    <Pressable style={styles.btn} onPress={onPress}>
      <Ionicons name="arrow-back" size={sizes.iconStatus + 6} color={colors.textPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: borders.medium,
    borderColor: colors.border,
    borderRadius: radius.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
