// Field.js — Campo editorial: label versalitas + filete inferior + icono
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

export default function Field({
  label, hint, icon, atSign, placeholder,
  secure = false, showEyeToggle = false,
  value, onChangeText, containerStyle,
  autoCapitalize = 'none', keyboardType,
}) {
  const [hidden, setHidden] = useState(secure);
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {hint ? <Text style={styles.hint}>{`  · ${hint}`}</Text> : null}
      </Text>
      <View style={styles.row}>
        {atSign ? (
          <Text style={styles.at}>@</Text>
        ) : icon ? (
          <Ionicons name={icon} size={sizes.iconStatus + 6} color={colors.accent} />
        ) : null}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          value={value}
          onChangeText={onChangeText}
        />
        {showEyeToggle && (
          <Pressable hitSlop={spacing.sm} onPress={() => setHidden((v) => !v)}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={sizes.iconStatus + 8} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  label: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1.6, marginBottom: spacing.sm },
  hint: { color: colors.placeholder },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    borderBottomWidth: borders.medium, borderBottomColor: colors.border,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.xxs / 2,
  },
  at: { fontFamily: typography.dinnerTitle.fontFamily, fontSize: 18, color: colors.accent },
  input: { flex: 1, ...typography.input, color: colors.textPrimary, padding: spacing.none },
});
