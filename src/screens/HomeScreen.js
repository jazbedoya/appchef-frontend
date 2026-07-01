// HomeScreen.js — Rediseño editorial "portada de revista gastronómica"
// Conectado a Redux (datos reales del backend).
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
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

// ─── Component ───

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const events = useSelector(selectEvents);
  const isLoading = useSelector(selectEventsLoading);
  const error = useSelector(selectEventsError);
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = useCallback(() => {
    dispatch(fetchEvents({ page: 1, perPage: 30 }));
  }, [dispatch]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEvents({ page: 1, perPage: 30 }));
    setRefreshing(false);
  }, [dispatch]);

  const featured = events[0] || null;
  const cartelera = events.slice(1, 5);

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
        {/* ── Masthead ── */}
        <View style={styles.masthead}>
          <View style={styles.mastheadMeta}>
            <Text style={styles.metaLabel}>
              N.º {format(new Date(), 'MM')} · {getSeasonLabel()}
            </Text>
            <Text style={styles.metaLabel}>
              {user?.username ? user.username.toUpperCase() : ''}
            </Text>
          </View>
          <View style={styles.rule} />
          <Text style={styles.wordmark}>APP CHEF</Text>
          <View style={styles.rule} />
          <Text style={[styles.metaLabel, styles.centered]}>
            La comida es la excusa, lo interesante viene después
          </Text>
        </View>

        {/* ── Portada: evento destacado ── */}
        {featured && (
          <>
            <Pressable
              style={styles.cover}
              onPress={() => navigation.navigate('EventDetail', { eventId: featured.id })}
            >
              <Text style={styles.overline}>
                {getCuisineLabel(featured)} · {featured.city}
              </Text>
              <Text style={styles.coverTitle}>{featured.title}</Text>
              <Text style={styles.standfirst} numberOfLines={3}>
                {featured.description}
              </Text>
            </Pressable>

            {featured.cover_image_url ? (
              <Image
                source={{ uri: featured.cover_image_url }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.coverImage, { backgroundColor: colors.imagePlaceholder }]} />
            )}

            <View style={styles.coverFooter}>
              <Text style={styles.priceLabel}>
                €{Number(featured.price_per_person).toFixed(0)} · {getSpots(featured)} PLAZAS
              </Text>
              <Pressable onPress={() => navigation.navigate('EventDetail', { eventId: featured.id })}>
                <Text style={styles.linkAccent}>SOLICITAR SITIO →</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ── Crear cena ── */}
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

        {/* ── En cartelera ── */}
        {cartelera.length > 0 && (
          <>
            <View style={styles.ruleFull} />
            <Text style={styles.sectionLabel}>En cartelera</Text>
            <View style={styles.list}>
              {cartelera.map((event, i) => (
                <Pressable
                  key={event.id}
                  style={styles.row}
                  onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
                >
                  <Text style={styles.rowNum}>
                    {String(i + 2).padStart(2, '0')}
                  </Text>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{event.title}</Text>
                    <Text style={styles.rowMeta}>
                      {getCuisineLabel(event)} · {event.city} · {getSpots(event)} plazas
                    </Text>
                  </View>
                  <Text style={styles.rowPrice}>
                    €{Number(event.price_per_person).toFixed(0)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

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
  scroll: { paddingBottom: spacing.xxxl + spacing.xxl },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Masthead
  masthead: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.sm },
  mastheadMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  metaLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1.4 },
  centered: { textAlign: 'center' },
  rule: { height: borders.hairline, backgroundColor: colors.border, marginVertical: spacing.xs },
  wordmark: { ...typography.masthead, color: colors.textPrimary, textAlign: 'center' },

  // Cover
  cover: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },
  overline: { ...typography.label, color: colors.accent, letterSpacing: 1.8, marginBottom: spacing.sm },
  coverTitle: { ...typography.coverTitle, color: colors.textPrimary, marginBottom: spacing.sm },
  standfirst: { ...typography.standfirst, color: colors.textSecondary },
  coverImage: {
    marginHorizontal: spacing.gutter,
    marginTop: spacing.md,
    height: 220,
    borderRadius: radius.xs,
    backgroundColor: colors.imagePlaceholder,
  },
  coverFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  priceLabel: { ...typography.price, color: colors.textMuted, letterSpacing: 1 },
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
    marginBottom: spacing.lg,
    borderWidth: borders.medium,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  createCopy: { flex: 1 },
  createTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xxs },
  createSub: { ...typography.body, color: colors.textMuted },
  createBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  createBtnText: { ...typography.button, color: colors.onAccent },

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
