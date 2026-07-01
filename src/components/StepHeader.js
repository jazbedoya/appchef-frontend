// src/components/StepHeader.js
// Cabecera del flujo Crear cena: back + título serif + "Paso X de 3" + barra de 3 tramos.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

export default function StepHeader({ title = 'Crear cena', step = 1, total = 3, stepLabel, onBack = () => {} }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Pressable hitSlop={spacing.sm} onPress={onBack}>
          <Ionicons name="chevron-back" size={sizes.icon + 1} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaMuted}>{`Paso ${step} de ${total}`}</Text>
        <Text style={styles.metaAccent}>{stepLabel}</Text>
      </View>
      <View style={styles.bar}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[styles.seg, { backgroundColor: i < step ? colors.accent : colors.borderHairline }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.border,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  title: { ...typography.sectionTitleSm, fontSize: 24, color: colors.textPrimary },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs + 1 },
  metaMuted: { ...typography.label, color: colors.textMuted, letterSpacing: 1.8 },
  metaAccent: { ...typography.label, color: colors.accent, letterSpacing: 1.8 },
  bar: { flexDirection: 'row', gap: spacing.xxs + 2 },
  seg: { flex: 1, height: borders.hairline * 3 },
});
