import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import { userApi, reservationApi } from '../services/api';
import { selectUser } from '../store/authSlice';
import UserAvatar from '../components/UserAvatar';
import EventCard from '../components/EventCard';
import { colors } from '../theme/colors';
import typography from '../theme/typography';
import { spacing, borderRadius, shadows } from '../theme/spacing';

const StatBox = ({ value, label }) => (
  <View style={styles.statBox}>
    <Text style={styles.statValue}>{value ?? 0}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const UserProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  const currentUser = useSelector(selectUser);

  const [profile, setProfile] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const res = await userApi.get(`/users/${userId}`);
      setProfile(res.data);
      setIsFollowing(res.data.is_following ?? false);

      // Load their published events if they're a host
      if (res.data.profile?.is_host) {
        try {
          const evRes = await reservationApi.get(`/events?host_id=${userId}&status=published&per_page=10`);
          setEvents(evRes.data.events || []);
        } catch {
          setEvents([]);
        }
      }
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el perfil');
      navigation.goBack();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, navigation]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleFollow = async () => {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await userApi.delete(`/users/${userId}/follow`);
        setIsFollowing(false);
        setProfile(p => p ? { ...p, followers_count: (p.followers_count || 1) - 1 } : p);
      } else {
        await userApi.post(`/users/${userId}/follow`);
        setIsFollowing(true);
        setProfile(p => p ? { ...p, followers_count: (p.followers_count || 0) + 1 } : p);
      }
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'No se pudo completar la acción');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.cafe} />
      </View>
    );
  }

  if (!profile) return null;

  const p = profile.profile || {};
  const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim() || profile.username;
  const isOwnProfile = currentUser?.id === userId;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProfile(); }} tintColor={colors.cafe} />}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={colors.gradientWarm} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>

        <View style={styles.avatarWrapper}>
          <UserAvatar name={fullName} size={88} />
          {p.is_host && (
            <View style={styles.hostBadge}>
              <Icon name="restaurant" size={12} color={colors.white} />
              <Text style={styles.hostBadgeText}>Host</Text>
            </View>
          )}
        </View>

        <Text style={styles.name}>{fullName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>
        {p.city ? (
          <View style={styles.locationRow}>
            <Icon name="location-outline" size={14} color={colors.goldLight} />
            <Text style={styles.locationText}>{p.city}{p.country ? `, ${p.country}` : ''}</Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox value={profile.followers_count} label="Seguidores" />
        <View style={styles.statDivider} />
        <StatBox value={profile.following_count} label="Siguiendo" />
        <View style={styles.statDivider} />
        <StatBox value={p.total_dinners_hosted} label="Cenas" />
        <View style={styles.statDivider} />
        <StatBox value={p.average_host_rating ? p.average_host_rating.toFixed(1) : '—'} label="Rating" />
      </View>

      {/* Follow button */}
      {!isOwnProfile && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.followBtn, isFollowing && styles.followingBtn]}
            onPress={handleFollow}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={isFollowing ? colors.cafe : colors.white} />
            ) : (
              <>
                <Icon
                  name={isFollowing ? 'checkmark' : 'person-add-outline'}
                  size={16}
                  color={isFollowing ? colors.cafe : colors.white}
                />
                <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                  {isFollowing ? 'Siguiendo' : 'Seguir'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Bio */}
      {p.bio ? (
        <View style={styles.section}>
          <Text style={styles.bio}>{p.bio}</Text>
        </View>
      ) : null}

      {/* Specialties */}
      {p.specialties?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Especialidades</Text>
          <View style={styles.chips}>
            {p.specialties.map((s, i) => (
              <View key={i} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Languages */}
      {p.languages_spoken?.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Idiomas</Text>
          <View style={styles.chips}>
            {p.languages_spoken.map((l, i) => (
              <View key={i} style={[styles.chip, styles.chipAlt]}>
                <Text style={styles.chipText}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Kitchen description */}
      {p.kitchen_description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Su cocina</Text>
          <Text style={styles.bodyText}>{p.kitchen_description}</Text>
        </View>
      ) : null}

      {/* Their events */}
      {events.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sus cenas</Text>
          {events.map(ev => (
            <EventCard
              key={ev.id}
              event={ev}
              onPress={() => navigation.navigate('EventDetailFromMap', { eventId: ev.id, eventTitle: ev.title })}
            />
          ))}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.beigeLight,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.beigeLight,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.base,
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 44,
    left: spacing.base,
    padding: 8,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  hostBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  hostBadgeText: {
    ...typography.labelSmall,
    color: colors.white,
    fontSize: 10,
  },
  name: {
    ...typography.h2,
    color: colors.white,
    marginTop: spacing.xs,
  },
  username: {
    ...typography.body,
    color: colors.goldLight,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
  },
  locationText: {
    ...typography.bodySmall,
    color: colors.goldLight,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    paddingVertical: spacing.base,
    ...shadows.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.cafe,
  },
  statLabel: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  actionRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cafe,
    borderRadius: borderRadius.full,
    paddingVertical: 12,
    paddingHorizontal: spacing.xl,
    ...shadows.sm,
    minWidth: 140,
    justifyContent: 'center',
  },
  followingBtn: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.cafe,
  },
  followBtnText: {
    ...typography.labelLarge,
    color: colors.white,
  },
  followingBtnText: {
    color: colors.cafe,
  },
  section: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.cafe,
    marginBottom: spacing.sm,
  },
  bio: {
    ...typography.body,
    color: colors.gray700,
    lineHeight: 22,
  },
  bodyText: {
    ...typography.body,
    color: colors.gray700,
    lineHeight: 22,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    backgroundColor: colors.beige,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipAlt: {
    backgroundColor: colors.gray100,
  },
  chipText: {
    ...typography.label,
    color: colors.cafe,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: 12,
  },
});

export default UserProfileScreen;
