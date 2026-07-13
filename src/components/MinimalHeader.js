// src/components/MinimalHeader.js
// Opción C — header editorial reducido al mínimo:
//   eyebrow "APP CHEF · N.º 07" (mono, acento) + saludo serif grande, y campana
//   de notificaciones con punto de aviso. Deja la máxima superficie al contenido.
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { sizes } from '../theme/sizes';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function MinimalHeader({
  edition = 'N.º 07',
  greeting = 'Buenas noches,',
  name = 'Jaz',
  hasNotifications = true,
  onBellPress = () => {},
}) {
  return (
    <View style={styles.header}>
      <View style={styles.left}>
        <Text style={styles.eyebrow}>{`App Chef · ${edition}`}</Text>
        <Text style={styles.greeting}>
          {greeting}
          {'\n'}
          {name}.
        </Text>
      </View>
      <Pressable hitSlop={spacing.sm} onPress={onBellPress} style={styles.bell}>
        <Ionicons name="notifications-outline" size={sizes.tabFloatingIcon - 2} color={colors.textPrimary} />
        {hasNotifications ? <View style={styles.bellDot} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  left: { flexShrink: 1 },
  eyebrow: { ...typography.label, color: colors.accent, marginBottom: spacing.xs },
  greeting: { ...typography.sectionTitleSm, fontSize: 30, lineHeight: 31, color: colors.textPrimary },
  bell: { paddingTop: spacing.xxs },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: spacing.xs,
    height: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
});
