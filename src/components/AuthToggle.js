// src/components/AuthToggle.js
// Segmentado Sign In / Join. Marco de filete medio, mitad activa en acento.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function AuthToggle({ active = 'signin', onChange = () => {} }) {
  const seg = (key, text) => {
    const isActive = active === key;
    return (
      <Pressable style={[styles.seg, isActive && styles.segActive]} onPress={() => onChange(key)}>
        <Text style={[styles.text, { color: isActive ? colors.onAccent : colors.textPrimary }]}>{text}</Text>
      </Pressable>
    );
  };
  return (
    <View style={styles.wrap}>
      {seg('signin', 'Sign In')}
      {seg('join', 'Join')}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderWidth: borders.medium,
    borderColor: colors.border,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  seg: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  segActive: { backgroundColor: colors.accent },
  text: { ...typography.button, fontSize: 11, letterSpacing: 1.4 },
});
