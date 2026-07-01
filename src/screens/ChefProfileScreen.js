// ChefProfileScreen.js — Perfil del chef/anfitrión con follow/unfollow
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

export default function ChefProfileScreen({ route, navigation }) {
  const { userId, userName } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await userApi.get(`/users/${userId}/profile`);
      setProfile(res.data);
      setFollowing(res.data.is_following === true);
    } catch (e) {
      Alert.alert('Error', 'No se pudo cargar el perfil');
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const toggleFollow = async () => {
    const wasFollowing = following;
    setFollowing(!wasFollowing); // optimistic
    setFollowLoading(true);
    try {
      if (wasFollowing) {
        await userApi.delete(`/users/${userId}/follow`);
      } else {
        await userApi.post(`/users/${userId}/follow`);
      }
    } catch (e) {
      setFollowing(wasFollowing); // revert
      if (e.response?.status !== 409) {
        Alert.alert('Error', e.userMessage || 'No se pudo completar');
      }
    }
    setFollowLoading(false);
  };

  const initials = (userName || profile?.username || '?')[0].toUpperCase();
  const displayName = profile?.profile?.first_name
    ? `${profile.profile.first_name} ${profile.profile.last_name || ''}`
    : profile?.username || userName || '';

  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <View style={st.loadWrap}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  const p = profile?.profile;

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {/* Back */}
        <Pressable style={st.backBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
        </Pressable>

        {/* Avatar + Name */}
        <View style={st.heroSection}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{initials}</Text>
          </View>
          <Text style={st.name}>{displayName}</Text>
          {p?.is_host && <Text style={st.hostBadge}>ANFITRIÓN</Text>}
          {p?.city && <Text style={st.city}>{p.city}{p.country ? `, ${p.country}` : ''}</Text>}
        </View>

        {/* Follow button */}
        <Pressable
          style={[st.followBtn, following && st.followBtnActive]}
          onPress={toggleFollow}
          disabled={followLoading}
        >
          {followLoading ? (
            <ActivityIndicator color={following ? colors.textPrimary : colors.onAccent} size="small" />
          ) : (
            <>
              <Ionicons
                name={following ? 'checkmark' : 'add'}
                size={16}
                color={following ? colors.textPrimary : colors.onAccent}
              />
              <Text style={[st.followBtnText, following && st.followBtnTextActive]}>
                {following ? 'Siguiendo' : 'Seguir'}
              </Text>
            </>
          )}
        </Pressable>

        <View style={st.rule} />

        {/* Stats */}
        <View style={st.statsRow}>
          <View style={st.stat}>
            <Text style={st.statNum}>{profile?.followers_count ?? 0}</Text>
            <Text style={st.statLabel}>Seguidores</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statNum}>{profile?.following_count ?? 0}</Text>
            <Text style={st.statLabel}>Siguiendo</Text>
          </View>
          {p?.total_dinners_hosted > 0 && (
            <View style={st.stat}>
              <Text style={st.statNum}>{p.total_dinners_hosted}</Text>
              <Text style={st.statLabel}>Cenas</Text>
            </View>
          )}
          {p?.average_host_rating > 0 && (
            <View style={st.stat}>
              <Text style={st.statNum}>{p.average_host_rating.toFixed(1)}</Text>
              <Text style={st.statLabel}>Rating</Text>
            </View>
          )}
        </View>

        <View style={st.rule} />

        {/* Bio */}
        {p?.bio ? (
          <>
            <Text style={st.sectionLabel}>Sobre mí</Text>
            <Text style={st.bio}>{p.bio}</Text>
            <View style={st.rule} />
          </>
        ) : null}

        {/* Specialties */}
        {p?.specialties && (
          <>
            <Text style={st.sectionLabel}>Especialidades</Text>
            <Text style={st.bodyText}>{p.specialties}</Text>
            <View style={st.rule} />
          </>
        )}

        {/* Kitchen */}
        {p?.kitchen_description && (
          <>
            <Text style={st.sectionLabel}>Mi cocina</Text>
            <Text style={st.bodyText}>{p.kitchen_description}</Text>
            <View style={st.rule} />
          </>
        )}

        {/* Languages */}
        {p?.languages_spoken && (
          <>
            <Text style={st.sectionLabel}>Idiomas</Text>
            <Text style={st.bodyText}>{p.languages_spoken}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl + spacing.xxl },
  loadWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  backBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    marginLeft: spacing.xl, marginTop: spacing.sm,
  },

  heroSection: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.md },
  avatar: {
    width: 72, height: 72, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.sectionTitleSm, color: colors.onAccent },
  name: { ...typography.sectionTitleSm, color: colors.textPrimary, textAlign: 'center' },
  hostBadge: { ...typography.labelSm, color: colors.accent, marginTop: spacing.xs, letterSpacing: 1.4 },
  city: { ...typography.body, color: colors.textMuted, marginTop: spacing.xxs },

  followBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs,
    alignSelf: 'center', marginTop: spacing.md,
    backgroundColor: colors.accent, borderRadius: radius.xs,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.xl,
    minWidth: 140,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: borders.medium, borderColor: colors.border,
  },
  followBtnText: { ...typography.button, fontSize: 11, color: colors.onAccent, letterSpacing: 1.4 },
  followBtnTextActive: { color: colors.textPrimary },

  rule: { height: borders.hairline, backgroundColor: colors.border, marginHorizontal: spacing.xl, marginVertical: spacing.lg },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.xl },
  stat: { alignItems: 'center' },
  statNum: { ...typography.dinnerTitle, fontSize: 24, color: colors.textPrimary },
  statLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },

  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2, paddingHorizontal: spacing.xl, marginBottom: spacing.xs },
  bio: { ...typography.standfirst, color: colors.textSecondary, paddingHorizontal: spacing.xl },
  bodyText: { ...typography.body, color: colors.textPrimary, paddingHorizontal: spacing.xl },
});
