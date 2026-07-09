// HomeScreen.js — Rediseño editorial premium con carrusel destacado
// Conectado a Redux (datos reales del backend).
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';

import {
  fetchEvents,
  selectEvents,
  selectEventsLoading,
  selectEventsError,
} from '../store/eventsSlice';
import { selectUser } from '../store/authSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import FeaturedCarousel from '../components/FeaturedCarousel';
import NotificationBell from '../components/NotificationBell';

// ─── Helpers ───

const getCuisineLabel = (event) => {
  try {
    const ct = typeof event.cuisine_type === 'string'
      ? JSON.parse(event.cuisine_type)
      : event.cuisine_type;
    return Array.isArray(ct) ? ct[0] : ct;
  } catch { return ''; }
};

const getSpots = (event) => Math.max(0, (event.max_guests || 0) - (event.confirmed_guests || 0));

const getSeasonLabel = () => {
  const m = new Date().getMonth();
  if (m < 3) return 'Invierno';
  if (m < 6) return 'Primavera';
  if (m < 9) return 'Verano';
  return 'Otoño';
};

const FEATURED_COUNT = 50;

// ─── Component ───

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const events = useSelector(selectEvents);
  const isLoading = useSelector(selectEventsLoading);
  const error = useSelector(selectEventsError);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(() => {
    dispatch(fetchEvents({ page: 1, perPage: 50 }));
  }, [dispatch]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEvents({ page: 1, perPage: 50 }));
    setRefreshing(false);
  }, [dispatch]);

  const featured = events.slice(0, FEATURED_COUNT);
  const cartelera = events;

  // Group events by city for "Por ciudad" section
  const citySections = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const city = ev.city || 'Sin ubicación';
      if (!map[city]) map[city] = [];
      map[city].push(ev);
    });
    return Object.entries(map)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);
  }, [events]);

  if (isLoading && events.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.loadingWrap}>
          <Text style={styles.wordmark}>APP CHEF</Text>
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {/* ── Top section ── */}
        <View>
          {/* Masthead */}
          <View style={styles.masthead}>
            <View style={styles.mastheadMeta}>
              <Text style={styles.metaLabel}>
                N.º {format(new Date(), 'MM')} · {getSeasonLabel()}
              </Text>
              <View style={styles.mastheadRight}>
                <Text style={styles.metaLabel}>
                  {user?.username ? user.username.toUpperCase() : ''}
                </Text>
                <NotificationBell onPress={() => navigation.navigate('Notifications')} />
              </View>
            </View>
            <View style={styles.rule} />
            <Text style={styles.wordmark}>APP CHEF</Text>
            <View style={styles.rule} />
            <Text style={[styles.metaLabel, styles.centered]}>
              Cenas privadas por invitación
            </Text>
          </View>

          {/* Carrusel destacadas */}
          <FeaturedCarousel
            data={featured}
            onPressItem={(item) => navigation.navigate('EventDetail', { eventId: item.id })}
          />
        </View>

        {/* ── Crear cena (empujado abajo) ── */}
        <View style={styles.createBlock}>
          <View style={styles.createCopy}>
            <Text style={styles.createTitle}>¿Anfitrión?</Text>
            <Text style={styles.createSub}>Abre tu mesa e invita comensales.</Text>
          </View>
          <Pressable
            style={styles.createBtn}
            onPress={() => navigation.navigate('CreateEvent')}
          >
            <Text style={styles.createBtnText}>Crear cena +</Text>
          </Pressable>
        </View>


        {/* ── Error ── */}
        {error && events.length === 0 && (
          <View style={styles.errorBlock}>
            <Text style={styles.standfirst}>No pudimos cargar las cenas.</Text>
            <Pressable onPress={loadEvents}>
              <Text style={styles.linkAccent}>REINTENTAR →</Text>
            </Pressable>
          </View>
        )}

        {/* ── Vacío ── */}
        {!isLoading && !error && events.length === 0 && (
          <View style={styles.errorBlock}>
            <Text style={styles.coverTitle}>Aún no hay cenas</Text>
            <Text style={styles.standfirst}>
              Sé el primero en abrir tu mesa.
            </Text>
            <Pressable
              style={[styles.createBtn, { marginTop: spacing.md }]}
              onPress={() => navigation.navigate('CreateEvent')}
            >
              <Text style={styles.createBtnText}>Crear cena +</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

// ─── Styles ───

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'space-between' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Masthead
  masthead: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  mastheadMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mastheadRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1.4 },
  centered: { textAlign: 'center', marginTop: spacing.xxs },
  rule: { height: borders.hairline, backgroundColor: colors.border, marginVertical: spacing.sm },
  wordmark: { ...typography.masthead, color: colors.textPrimary, textAlign: 'center', paddingVertical: spacing.xs },

  // Cover (kept for empty/error states)
  coverTitle: { ...typography.coverTitle, color: colors.textPrimary, marginBottom: spacing.sm },
  standfirst: { ...typography.standfirst, color: colors.textSecondary },
  linkAccent: {
    ...typography.price,
    color: colors.textPrimary,
    borderBottomWidth: borders.medium,
    borderBottomColor: colors.accent,
    paddingBottom: spacing.xxs / 2,
  },

  // Create block
  createBlock: {
    marginHorizontal: spacing.gutter,
    marginBottom: spacing.xl,
    borderWidth: borders.medium,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  createCopy: { flex: 1 },
  createTitle: { ...typography.dinnerTitle, fontSize: 22, color: colors.textPrimary, marginBottom: spacing.xxs },
  createSub: { ...typography.body, color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  createBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  createBtnText: { ...typography.button, color: colors.onAccent, fontSize: 11 },

  // Por ciudad
  cityTrack: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  cityCard: {
    borderWidth: borders.hairline,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minWidth: 100,
  },
  cityName: { ...typography.dinnerTitle, fontSize: 16, color: colors.textPrimary, marginBottom: spacing.xxs },
  cityCount: { ...typography.label, color: colors.textMuted, letterSpacing: 1.2, fontSize: 9 },

  // Cartelera
  ruleFull: { height: borders.hairline, backgroundColor: colors.border, marginHorizontal: spacing.gutter },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 2,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  list: { paddingHorizontal: spacing.gutter },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.borderHairline,
  },
  rowNum: { ...typography.dinnerTitle, fontSize: 15, color: colors.accent, width: spacing.xl },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.dinnerTitle, fontSize: 19, color: colors.textPrimary },
  rowMeta: { ...typography.body, fontSize: 12, color: colors.textMuted, marginTop: spacing.xxs / 2 },
  rowPrice: { ...typography.price, color: colors.textMuted },

  // Error/empty
  errorBlock: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
  },
});
