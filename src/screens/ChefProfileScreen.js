// ChefProfileScreen.js — Perfil público con bloque de confianza, rating y reseñas
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { userApi } from '../services/api';
import eventsService from '../services/eventsService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import RatingStars from '../components/RatingStars';

export default function ChefProfileScreen({ route, navigation }) {
  const { userId, userName } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ total: 0, average_rating: null });

  const loadProfile = useCallback(async () => {
    try {
      const res = await userApi.get(`/users/${userId}`);
      setProfile(res.data);
      setFollowing(res.data.is_following === true);
    } catch {
      Alert.alert('Error', 'No se pudo cargar el perfil');
    }
    setLoading(false);
  }, [userId]);

  const loadReviews = useCallback(async () => {
    try {
      const data = await eventsService.getUserReviews(userId);
      setReviews(data.reviews || []);
      setReviewMeta({ total: data.total, average_rating: data.average_rating });
    } catch {}
  }, [userId]);

  useEffect(() => { loadProfile(); loadReviews(); }, [loadProfile, loadReviews]);

  const toggleFollow = async () => {
    const was = following;
    setFollowing(!was);
    setFollowLoading(true);
    try {
      if (was) await userApi.delete(`/users/${userId}/follow`);
      else await userApi.post(`/users/${userId}/follow`);
    } catch (e) {
      setFollowing(was);
      if (e.response?.status !== 409) Alert.alert('Error', e.userMessage || 'No se pudo completar');
    }
    setFollowLoading(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator color={colors.accent} /></View>
      </SafeAreaView>
    );
  }

  const p = profile?.profile;
  const initials = (userName || profile?.username || '?')[0].toUpperCase();
  const displayName = p?.first_name
    ? `${p.first_name} ${p.last_name || ''}`.trim()
    : profile?.username || userName || '';

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  const emailVerified = profile?.email_verified === true;
  const phoneVerified = profile?.phone_verified === true;
  const profileVerified = emailVerified && phoneVerified;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        {/* Back */}
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        {/* ── Avatar + Name ── */}
        <View style={s.heroSection}>
          {p?.avatar_url ? (
            <Image source={{ uri: p.avatar_url }} style={s.avatarImg} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
          )}
          <Text style={s.name}>{displayName}</Text>
          {p?.is_host && <Text style={s.hostBadge}>ANFITRIÓN</Text>}
          {p?.city && (
            <Text style={s.city}>{p.city}{p.country ? `, ${p.country}` : ''}</Text>
          )}
          {memberSince && (
            <Text style={s.memberSince}>Miembro desde {memberSince}</Text>
          )}
        </View>

        {/* ── Badges de confianza ── */}
        <View style={s.badgesRow}>
          {emailVerified && (
            <View style={s.badge}>
              <Ionicons name="mail" size={13} color={colors.success} />
              <Text style={s.badgeText}>Email verificado</Text>
            </View>
          )}
          {phoneVerified && (
            <View style={s.badge}>
              <Ionicons name="call" size={13} color={colors.success} />
              <Text style={s.badgeText}>Teléfono verificado</Text>
            </View>
          )}
          {profileVerified && (
            <View style={[s.badge, s.badgeAccent]}>
              <Ionicons name="shield-checkmark" size={13} color={colors.accent} />
              <Text style={[s.badgeText, { color: colors.accent }]}>Perfil verificado</Text>
            </View>
          )}
        </View>

        {/* ── Rating inline ── */}
        {reviewMeta.average_rating && (
          <View style={s.ratingRow}>
            <RatingStars rating={reviewMeta.average_rating} size={18} />
            <Text style={s.ratingText}>
              {reviewMeta.average_rating.toFixed(1)} · {reviewMeta.total} reseña{reviewMeta.total !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* ── Follow ── */}
        <Pressable
          style={[s.followBtn, following && s.followBtnActive]}
          onPress={toggleFollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator color={following ? colors.textPrimary : colors.onAccent} size="small" />
          ) : (
            <Text style={[s.followBtnText, following && s.followBtnTextActive]}>
              {following ? 'SIGUIENDO' : 'SEGUIR'}
            </Text>
          )}
        </Pressable>

        <View style={s.rule} />

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatItem num={profile?.followers_count ?? 0} label="SEGUIDORES" />
          <View style={s.statSep} />
          <StatItem num={profile?.following_count ?? 0} label="SIGUIENDO" />
          {(p?.total_dinners_hosted > 0 || p?.total_dinners_attended > 0) && (
            <>
              <View style={s.statSep} />
              <StatItem
                num={p?.total_dinners_hosted || p?.total_dinners_attended || 0}
                label={p?.is_host ? 'CENAS' : 'ASISTIDAS'}
              />
            </>
          )}
        </View>

        <View style={s.rule} />

        {/* ── Bio ── */}
        {p?.bio ? (
          <>
            <Text style={s.sectionLabel}>SOBRE MÍ</Text>
            <Text style={s.bio}>{p.bio}</Text>
            <View style={s.rule} />
          </>
        ) : null}

        {/* ── Reseñas ── */}
        <Text style={s.sectionLabel}>RESEÑAS</Text>
        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <View key={rev.id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <View style={s.reviewAvatar}>
                  <Text style={s.reviewAvatarText}>
                    {(rev.reviewer.first_name || rev.reviewer.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>
                    {rev.reviewer.first_name
                      ? `${rev.reviewer.first_name} ${rev.reviewer.last_name || ''}`.trim()
                      : rev.reviewer.username}
                  </Text>
                  <RatingStars rating={rev.rating} size={12} />
                </View>
                <Text style={s.reviewDate}>
                  {new Date(rev.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
              {rev.comment && <Text style={s.reviewComment}>{rev.comment}</Text>}
            </View>
          ))
        ) : (
          <Text style={s.emptyReviews}>
            Aún no tiene reseñas.{'\n'}¡Sé el primero en cenar con {displayName.split(' ')[0]}!
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const StatItem = ({ num, label }) => (
  <View style={s.stat}>
    <Text style={s.statNum}>{num}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl + spacing.xxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  backBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: borders.hairline, borderColor: colors.borderHairline, borderRadius: radius.pill,
    marginLeft: spacing.gutter, marginTop: spacing.sm,
  },

  // Hero
  heroSection: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.sm },
  avatar: {
    width: 72, height: 72, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarImg: {
    width: 72, height: 72, borderRadius: radius.pill, marginBottom: spacing.sm,
  },
  avatarText: { ...typography.sectionTitleSm, color: colors.onAccent },
  name: { ...typography.sectionTitleSm, color: colors.textPrimary, textAlign: 'center' },
  hostBadge: { ...typography.label, color: colors.accent, marginTop: spacing.xxs, letterSpacing: 2, fontSize: 9 },
  city: { ...typography.body, color: colors.textMuted, marginTop: spacing.xxs },
  memberSince: { ...typography.price, color: colors.textMuted, marginTop: spacing.xxs },

  // Badges
  badgesRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: spacing.xs, paddingHorizontal: spacing.gutter, marginTop: spacing.sm,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs,
    borderWidth: borders.hairline, borderColor: colors.borderHairline,
  },
  badgeAccent: {
    borderColor: colors.accent, backgroundColor: 'rgba(191,71,38,0.06)',
  },
  badgeText: {
    ...typography.price, color: colors.success, fontSize: 10,
  },

  // Rating
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, marginTop: spacing.md,
  },
  ratingText: {
    ...typography.price, color: colors.textMuted, fontSize: 12,
  },

  // Follow
  followBtn: {
    alignSelf: 'center', marginTop: spacing.md,
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.xxl,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: borders.medium, borderColor: colors.border,
  },
  followBtnText: { ...typography.button, color: colors.onAccent, letterSpacing: 1.5 },
  followBtnTextActive: { color: colors.textPrimary },

  rule: {
    height: borders.hairline, backgroundColor: colors.borderHairline,
    marginHorizontal: spacing.gutter, marginVertical: spacing.md,
  },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.gutter },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { ...typography.numeral, color: colors.textPrimary, fontSize: 24 },
  statLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2, fontSize: 8, marginTop: 2 },
  statSep: { width: borders.hairline, height: 28, backgroundColor: colors.borderHairline },

  // Sections
  sectionLabel: {
    ...typography.label, color: colors.textMuted, letterSpacing: 2.5,
    paddingHorizontal: spacing.gutter, marginBottom: spacing.xs,
  },
  bio: { ...typography.standfirst, color: colors.textSecondary, paddingHorizontal: spacing.gutter },

  // Reviews
  reviewCard: {
    marginHorizontal: spacing.gutter, marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: radius.pill,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 13 },
  reviewName: { ...typography.body, fontWeight: '600', color: colors.textPrimary, fontSize: 13, marginBottom: 2 },
  reviewDate: { ...typography.price, color: colors.textMuted, fontSize: 10 },
  reviewComment: {
    ...typography.body, color: colors.textSecondary, marginTop: spacing.xs,
    marginLeft: 32 + spacing.xs, lineHeight: 20,
  },
  emptyReviews: {
    ...typography.standfirst, color: colors.textMuted, textAlign: 'center',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.lg,
    fontSize: 14,
  },
});
