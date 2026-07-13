// Skeleton.js — Animated placeholder for loading states
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';

function SkeletonBox({ width, height, borderRadius: br = radius.xs, style }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View style={[{ width, height, borderRadius: br, backgroundColor: colors.surface, opacity }, style]} />
  );
}

export function SkeletonCard() {
  return (
    <View style={st.card}>
      <SkeletonBox width={56} height={56} />
      <View style={st.cardBody}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="50%" height={10} style={{ marginTop: 6 }} />
        <SkeletonBox width="30%" height={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

export function SkeletonCarousel() {
  return (
    <View style={st.carousel}>
      <SkeletonBox width="85%" height={420} borderRadius={radius.xs} />
    </View>
  );
}

export function SkeletonList({ count = 4 }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i} />)}
    </View>
  );
}

export function SkeletonProfile() {
  return (
    <View style={st.profile}>
      <SkeletonBox width={56} height={56} borderRadius={28} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="60%" height={16} />
        <SkeletonBox width="40%" height={12} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  cardBody: { flex: 1, gap: 0 },
  carousel: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, alignItems: 'center' },
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.md,
  },
});

export default SkeletonBox;
