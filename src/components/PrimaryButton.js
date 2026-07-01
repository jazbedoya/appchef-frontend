// src/components/PrimaryButton.js
// Botón principal del flujo. variant 'accent' (bermellón) o 'dark' (tinta, p. ej. Publicar).
import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function PrimaryButton({ label, onPress = () => {}, variant = 'accent', style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'dark' ? styles.dark : styles.accent,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flex: 1, borderRadius: radius.xs, paddingVertical: spacing.md + 1, alignItems: 'center' },
  accent: { backgroundColor: colors.accent },
  dark: { backgroundColor: colors.textPrimary },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  text: { ...typography.button, fontSize: 12, color: colors.onAccent, letterSpacing: 1.8 },
});
