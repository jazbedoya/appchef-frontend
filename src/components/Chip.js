// src/components/Chip.js
// Chip seleccionable (tipo de cocina, alérgenos). Sin seleccionar: filete + tinta.
// Seleccionado: relleno acento.
import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import { hapticSelection } from '../lib/haptics';

export default function Chip({ label, selected = false, onPress = () => {} }) {
  return (
    <Pressable
      onPress={() => { hapticSelection(); onPress(); }}
      style={[styles.base, selected ? styles.selected : styles.unselected]}
    >
      <Text style={[styles.text, { color: selected ? colors.onAccent : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.xs, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm + 1 },
  unselected: { borderWidth: borders.medium, borderColor: colors.border },
  selected: { backgroundColor: colors.accent, paddingVertical: spacing.xs + borders.medium, paddingHorizontal: spacing.sm + 1 + borders.medium },
  text: { ...typography.chip },
});
