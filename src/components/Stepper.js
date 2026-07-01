// src/components/Stepper.js
// Selector numérico de plazas: [-] valor [+]. El "+" va en acento.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

export default function Stepper({ value = 6, min = 1, max = 6, onChange = () => {}, note }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={styles.row}>
      <Pressable style={styles.btnOutline} onPress={dec}>
        <Ionicons name="remove" size={sizes.iconStatus + 4} color={colors.textPrimary} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable style={styles.btnAccent} onPress={inc}>
        <Ionicons name="add" size={sizes.iconStatus + 4} color={colors.onAccent} />
      </Pressable>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  btnOutline: {
    width: sizes.stepperBtn, height: sizes.stepperBtn, borderRadius: radius.xs,
    borderWidth: borders.medium, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  btnAccent: {
    width: sizes.stepperBtn, height: sizes.stepperBtn, borderRadius: radius.xs,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  value: { ...typography.numeral, color: colors.textPrimary, minWidth: sizes.stepperBtn - spacing.md, textAlign: 'center' },
  note: { ...typography.body, color: colors.textMuted },
});
