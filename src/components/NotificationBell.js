// NotificationBell.js — Campanita con badge de no leídas
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { radius } from '../theme/radius';
import notificationsService from '../services/notificationsService';

const POLL_MS = 30000; // 30s

export default function NotificationBell({ onPress }) {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(() => {
    notificationsService.getUnreadCount()
      .then((data) => setCount(data.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCount();
    const id = setInterval(fetchCount, POLL_MS);
    return () => clearInterval(id);
  }, [fetchCount]);

  return (
    <Pressable style={styles.wrap} onPress={onPress} hitSlop={8}>
      <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', padding: spacing.xxs },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.badge,
    borderRadius: radius.pill,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    ...typography.labelSm,
    fontSize: 9,
    color: colors.onBadge,
    letterSpacing: 0,
  },
});
