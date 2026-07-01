// src/components/Textarea.js
// Campo multilínea con marco de filete y contador opcional.
import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function Textarea({ label, hint, placeholder, minHeight, maxLength, containerStyle }) {
  const [text, setText] = useState('');
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>
        {label}
        {hint ? <Text style={styles.hint}>{`  · ${hint}`}</Text> : null}
      </Text>
      <View style={[styles.box, { minHeight }]}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.placeholder}
          multiline
          maxLength={maxLength}
          value={text}
          onChangeText={setText}
          textAlignVertical="top"
        />
      </View>
      {maxLength ? (
        <Text style={styles.counter}>{`${text.length} / ${maxLength}`}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xl },
  label: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 1.6, marginBottom: spacing.sm },
  hint: { color: colors.placeholder },
  box: { borderWidth: borders.medium, borderColor: colors.border, borderRadius: radius.xs, padding: spacing.sm + 2 },
  input: { flex: 1, ...typography.bodyLg, color: colors.textPrimary, padding: spacing.none },
  counter: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 0, textAlign: 'right', marginTop: spacing.xs },
});
