// src/components/ImagePlaceholder.js
// Marcador de posición para las fotos reales. Sustituye por <Image source={...} />
// cuando tengas las imágenes; conserva el borderRadius desde tokens.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { radius } from '../theme/radius';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function ImagePlaceholder({ label, height, style }) {
  return (
    <View style={[styles.box, { height }, style]}>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    backgroundColor: colors.imagePlaceholder,
    borderRadius: radius.xs,
    justifyContent: 'flex-end',
    padding: spacing.sm,
  },
  caption: {
    ...typography.labelSm,
    color: colors.onImageMuted,
    letterSpacing: 1.6,
  },
});
