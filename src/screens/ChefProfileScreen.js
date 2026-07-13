// ChefProfileScreen.js — Perfil público con confianza, cenas del chef, reseñas
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { userApi, reservationApi } from '../services/api';
import eventsService from '../services/eventsService';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import RatingStars from '../components/RatingStars';
import { SkeletonProfile, SkeletonList } from '../components/Skeleton';
import { hapticSuccess } from '../lib/haptics';

export default function ChefProfileScreen({ route, navigation }) {
  const { userId, userName } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ total: 0, average_rating: null });
  const [chefEvents, setChefEvents] = useState([]);

  const loadProfile = useCallback(async () => {
    try {
      const res = await userApi.get(`/users/${userId}`);
      setProfile(res.data);
      setFollowing(res.data.is_following === true);
    } catch { Alert.alert('Error', 'No se pudo cargar el perfil'); }
    setLoading(false);
  }, [userId]);

  const loadReviews = useCallback(async () => {
    try {
      const data = await eventsService.getUserReviews(userId);
      setReviews(data.reviews || []);
      setReviewMeta({ total: data.total, average_rating: data.average_rating });
    } catch {}
  }, [userId]);

  const loadChefEvents = useCallback(async () => {
    try {
      const res = await reservationApi.get('/events', { params: { per_page: 20 } });
      const events = (res.data.events || []).filter(e => e.host_id === userId);
      setChefEvents(events);
    } catch {}
  }, [userId]);

  useEffect(() => { loadProfile(); loadReviews(); loadChefEvents(); }, [loadProfile, loadReviews, loadChefEvents]);

  const toggleFollow = async () => {
    hapticSuccess();
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
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <SkeletonProfile />
        <SkeletonList count={3} />
      </SafeAreaView>
    );
  }

  const p = profile?.profile;
  const displayName = p?.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : profile?.username || userName || '';
  const initials = (displayName || '?')[0].toUpperCase();
  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : null;
  const stripeVerified = p?.stripe_verified === true;
  const emailVerified = profile?.email_verified === true;
  const futureEvents = chefEvents.filter(e => new Date(e.event_date) > new Date());
  const pastEventCount = chefEvents.filter(e => new Date(e.event_date) <= new Date()).length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        {/* ── Avatar + Name ── */}
        <View style={s.heroSection}>
          {p?.avatar_url ? (
            <Image source={{ uri: p.avatar_url }} style={s.avatarImg} />
          ) : (
            <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          )}
          <Text style={s.name}>{displayName}</Text>
          {p?.city && <Text style={s.city}>{p.city}{p.country ? `, ${p.country}` : ''}</Text>}
        </View>

        {/* ── Badges de confianza ── */}
        <View style={s.badgesRow}>
          {stripeVerified && (
            <View style={[s.badge, s.badgeVerified]}>
              <Ionicons name="shield-checkmark" size={14} color={colors.onAccent} />
              <Text style={s.badgeVerifiedText}>Anfitrión verificado</Text>
            </View>
          )}
          {emailVerified && (
            <View style={s.badge}>
              <Ionicons name="mail" size={12} color={colors.success} />
              <Text style={s.badgeText}>Email verificado</Text>
            </View>
          )}
          {memberSince && (
            <View style={s.badge}>
              <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
              <Text style={[s.badgeText, { color: colors.textMuted }]}>Desde {memberSince}</Text>
            </View>
          )}
        </View>

        {/* ── Rating ── */}
        {reviewMeta.average_rating && (
          <View style={s.ratingRow}>
            <RatingStars rating={reviewMeta.average_rating} size={18} />
            <Text style={s.ratingText}>
              {reviewMeta.average_rating.toFixed(1)} · {reviewMeta.total} reseña{reviewMeta.total !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        {/* ── Follow ── */}
        <Pressable style={[s.followBtn, following && s.followBtnActive]} onPress={toggleFollow} disabled={followLoading}>
          {followLoading ? (
            <ActivityIndicator color={following ? colors.textPrimary : colors.onAccent} size="small" />
          ) : (
            <Text style={[s.followBtnText, following && s.followBtnTextActive]}>{following ? 'SIGUIENDO' : 'SEGUIR'}</Text>
          )}
        </Pressable>

        <View style={s.rule} />

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <Pressable style={s.stat} onPress={() => navigation.navigate('FollowList', { userId, mode: 'followers' })}>
            <Text style={s.statNum}>{profile?.followers_count ?? 0}</Text>
            <Text style={s.statLabel}>SEGUIDORES</Text>
          </Pressable>
          <View style={s.statSep} />
          <Pressable style={s.stat} onPress={() => navigation.navigate('FollowList', { userId, mode: 'following' })}>
            <Text style={s.statNum}>{profile?.following_count ?? 0}</Text>
            <Text style={s.statLabel}>SIGUIENDO</Text>
          </Pressable>
          {(chefEvents.length > 0 || p?.total_dinners_hosted > 0) && (
            <>
              <View style={s.statSep} />
              <View style={s.stat}>
                <Text style={s.statNum}>{chefEvents.length || p?.total_dinners_hosted || 0}</Text>
                <Text style={s.statLabel}>CENAS</Text>
              </View>
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

        {/* ── Próximas cenas del chef ── */}
        {futureEvents.length > 0 && (
          <>
            <Text style={s.sectionLabel}>PRÓXIMAS CENAS</Text>
            {futureEvents.map((ev) => (
              <Pressable key={ev.id} style={({ pressed }) => [s.eventCard, pressed && { opacity: 0.7 }]}
                onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}>
                {ev.cover_image_url ? (
                  <Image source={{ uri: ev.cover_image_url }} style={s.eventImg} />
                ) : (
                  <View style={[s.eventImg, { backgroundColor: colors.imagePlaceholder }]} />
                )}
                <View style={s.eventBody}>
                  <Text style={s.eventTitle} numberOfLines={1}>{ev.title}</Text>
                  <Text style={s.eventMeta}>
                    {ev.city} · {ev.confirmed_guests}/{ev.max_guests} plazas · €{Number(ev.price_per_person).toFixed(0)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
            {pastEventCount > 0 && (
              <Text style={s.pastCount}>{pastEventCount} cena{pastEventCount !== 1 ? 's' : ''} anteriore{pastEventCount !== 1 ? 's' : ''}</Text>
            )}
            <View style={s.rule} />
          </>
        )}

        {p?.is_host && futureEvents.length === 0 && (
          <>
            <Text style={s.sectionLabel}>CENAS</Text>
            <Text style={s.emptyText}>No tiene cenas publicadas en este momento.</Text>
            <View style={s.rule} />
          </>
        )}

        {/* ── Reseñas ── */}
        <Text style={s.sectionLabel}>RESEÑAS</Text>
        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <View key={rev.id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                {rev.reviewer.avatar_url ? (
                  <Image source={{ uri: rev.reviewer.avatar_url }} style={s.reviewAvatarImg} />
                ) : (
                  <View style={s.reviewAvatar}>
                    <Text style={s.reviewAvatarText}>{(rev.reviewer.first_name || rev.reviewer.username || '?')[0].toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>
                    {rev.reviewer.first_name ? `${rev.reviewer.first_name} ${rev.reviewer.last_name || ''}`.trim() : rev.reviewer.username}
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
          <Text style={s.emptyText}>
            Aún no tiene reseñas.{'\n'}¡Sé el primero en cenar con {displayName.split(' ')[0]}!
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 120 },

  backBtn: {
    width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
    borderWidth: borders.hairline, borderColor: colors.borderHairline, borderRadius: radius.pill,
    marginLeft: spacing.gutter, marginTop: spacing.sm,
  },

  heroSection: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.sm },
  avatar: {
    width: 72, height: 72, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: 72, height: 72, borderRadius: radius.pill },
  avatarText: { ...typography.coverTitle, color: colors.onAccent, fontSize: 28 },
  name: { ...typography.coverTitle, color: colors.textPrimary, fontSize: 26, marginTop: spacing.sm, textAlign: 'center' },
  city: { ...typography.body, color: colors.textMuted, marginTop: spacing.xxs },

  // Badges
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, justifyContent: 'center', paddingHorizontal: spacing.gutter, marginTop: spacing.sm },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs,
    borderWidth: borders.hairline, borderColor: colors.borderHairline,
  },
  badgeText: { ...typography.price, color: colors.success, fontSize: 10 },
  badgeVerified: { backgroundColor: colors.accent, borderColor: colors.accent },
  badgeVerifiedText: { ...typography.button, color: colors.onAccent, fontSize: 9, letterSpacing: 1 },

  // Rating
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.sm },
  ratingText: { ...typography.price, color: colors.textMuted, fontSize: 13 },

  // Follow
  followBtn: {
    alignSelf: 'center', marginTop: spacing.md,
    backgroundColor: colors.accent, paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.xxl,
    borderRadius: radius.xs,
  },
  followBtnActive: { backgroundColor: 'transparent', borderWidth: borders.medium, borderColor: colors.border },
  followBtnText: { ...typography.button, color: colors.onAccent, letterSpacing: 1.5 },
  followBtnTextActive: { color: colors.textPrimary },

  rule: { height: borders.hairline, backgroundColor: colors.borderHairline, marginHorizontal: spacing.gutter, marginVertical: spacing.md },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.gutter },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { ...typography.numeral, color: colors.textPrimary, fontSize: 22 },
  statLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2, fontSize: 8, marginTop: 2 },
  statSep: { width: borders.hairline, height: 24, backgroundColor: colors.borderHairline },

  // Sections
  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2.5, paddingHorizontal: spacing.gutter, marginBottom: spacing.xs },
  bio: { ...typography.standfirst, color: colors.textSecondary, paddingHorizontal: spacing.gutter, lineHeight: 22 },
  emptyText: { ...typography.body, color: colors.textMuted, paddingHorizontal: spacing.gutter, lineHeight: 20 },

  // Chef events
  eventCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  eventImg: { width: 50, height: 50, borderRadius: radius.xs },
  eventBody: { flex: 1 },
  eventTitle: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 15 },
  eventMeta: { ...typography.price, color: colors.textMuted, fontSize: 11, marginTop: 2 },
  pastCount: { ...typography.price, color: colors.textMuted, fontSize: 11, paddingHorizontal: spacing.gutter, marginTop: spacing.xs },

  // Reviews
  reviewCard: { marginHorizontal: spacing.gutter, marginBottom: spacing.sm, paddingBottom: spacing.sm, borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reviewAvatar: { width: 32, height: 32, borderRadius: radius.pill, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  reviewAvatarImg: { width: 32, height: 32, borderRadius: radius.pill },
  reviewAvatarText: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 13 },
  reviewName: { ...typography.body, fontWeight: '600', color: colors.textPrimary, fontSize: 13, marginBottom: 2 },
  reviewDate: { ...typography.price, color: colors.textMuted, fontSize: 10 },
  reviewComment: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginLeft: 32 + spacing.xs, lineHeight: 20 },
});
