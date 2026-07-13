// MisCenasScreen.js — Dos pestañas: Como anfitrión / Reservadas (tarjetas rediseñadas)
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { selectUser } from '../store/authSlice';
import { fetchUserReservations, selectMyReservations, fetchPendingApprovals, selectPendingApprovals } from '../store/eventsSlice';
import { reservationApi } from '../services/api';
import { SkeletonList } from '../components/Skeleton';
import { hapticSelection } from '../lib/haptics';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

const STATUSES = {
  confirmed:        { label: 'Confirmada',    color: colors.success, icon: 'checkmark-circle' },
  pending_approval: { label: 'Pendiente',     color: colors.accent,  icon: 'time-outline' },
  pending_payment:  { label: 'Esperando pago',color: colors.textMuted, icon: 'card-outline' },
  completed:        { label: 'Completada',    color: colors.textMuted, icon: 'checkmark-done' },
  rejected:         { label: 'Rechazada',     color: colors.error,   icon: 'close-circle' },
  expired:          { label: 'Expirada',      color: colors.textMuted, icon: 'alarm-outline' },
  cancelled_by_guest: { label: 'Cancelada',   color: colors.textMuted, icon: 'close-outline' },
  cancelled_by_host:  { label: 'Cancelada',   color: colors.textMuted, icon: 'close-outline' },
};

const FALLBACK_IMGS = [
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=60',
  'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=60',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=60',
  'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=400&q=60',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=60',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=60',
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=60',
];
function getEventImg(r) {
  if (r.event_cover_image_url) return r.event_cover_image_url;
  // Hash title for consistent varied fallback
  const hash = (r.event_title || r.event_id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return FALLBACK_IMGS[hash % FALLBACK_IMGS.length];
}

function fmtDate(d) {
  if (!d) return '';
  try { return format(new Date(d), "EEE d MMM · HH:mm", { locale: es }); }
  catch { return ''; }
}

export default function MisCenasScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const reservations = useSelector(selectMyReservations);
  const pendingApprovals = useSelector(selectPendingApprovals);
  const [tab, setTab] = useState('host');
  const [hostEvents, setHostEvents] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const promises = [
      dispatch(fetchUserReservations(user.id)),
      dispatch(fetchPendingApprovals()),
    ];
    try {
      const res = await reservationApi.get('/events/host/my-events', { params: { page: 1, per_page: 50 } });
      setHostEvents(res.data.events || res.data.items || []);
    } catch {}
    await Promise.all(promises);
    setLoading(false);
  }, [dispatch, user?.id]);

  useEffect(() => { load(); }, [load]);
  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const pendingByEvent = {};
  pendingApprovals.forEach(r => { pendingByEvent[r.event_id] = (pendingByEvent[r.event_id] || 0) + 1; });

  const now = new Date();
  const upcoming = reservations.filter(r => {
    const isActive = ['confirmed', 'pending_approval', 'pending_payment'].includes(r.status);
    const isFuture = r.event_date ? new Date(r.event_date) >= now : true;
    return isActive && isFuture;
  });
  const past = reservations.filter(r => {
    const isTerminal = ['completed', 'rejected', 'expired', 'cancelled_by_guest', 'cancelled_by_host'].includes(r.status);
    const isPastDate = r.event_date && new Date(r.event_date) < now && ['confirmed'].includes(r.status);
    return isTerminal || isPastDate;
  });

  const renderGuestCard = (r) => {
    const st = STATUSES[r.status] || STATUSES.expired;
    const img = getEventImg(r);
    const isPast = !['confirmed', 'pending_approval', 'pending_payment'].includes(r.status);
    return (
      <Pressable key={r.id} style={s.card}
        onPress={() => navigation.navigate('Inicio', { screen: 'EventDetail', params: { eventId: r.event_id } })}>
        <Image source={{ uri: img }} style={s.cardImg} />
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, isPast && { color: colors.textMuted }]} numberOfLines={1}>
            {r.event_title || 'Cena'}
          </Text>
          <Text style={s.cardDate}>{fmtDate(r.event_date)}</Text>
          <View style={s.statusRow}>
            <Ionicons name={st.icon} size={13} color={st.color} />
            <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
          <Text style={s.cardPrice}>€{Number(r.total_amount).toFixed(0)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ alignSelf: 'center' }} />
      </Pressable>
    );
  };

  const renderHostCard = (ev) => {
    const pending = pendingByEvent[ev.id] || 0;
    const isPast = new Date(ev.event_date) < new Date();
    const isFull = ev.confirmed_guests >= ev.max_guests;
    const img = getEventImg({ event_cover_image_url: ev.cover_image_url, event_title: ev.title, event_id: ev.id });
    return (
      <Pressable key={ev.id} style={s.card}
        onPress={() => navigation.navigate('HostGuestList', { eventId: ev.id, eventTitle: ev.title })}>
        <Image source={{ uri: img }} style={s.cardImg} />
        <View style={s.cardBody}>
          <Text style={[s.cardTitle, isPast && { color: colors.textMuted }]} numberOfLines={1}>{ev.title}</Text>
          <Text style={s.cardDate}>{fmtDate(ev.event_date)}</Text>
          <Text style={s.cardMeta}>
            {ev.confirmed_guests}/{ev.max_guests} reservadas{isFull ? ' · Completa' : ''}
          </Text>
          {pending > 0 && (
            <View style={s.pendingRow}>
              <View style={s.pendingDot} />
              <Text style={s.pendingText}>{pending} solicitud{pending > 1 ? 'es' : ''} por revisar</Text>
            </View>
          )}
        </View>
        <Text style={s.hostPrice}>€{Number(ev.price_per_person).toFixed(0)}</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} style={{ alignSelf: 'center' }} />
      </Pressable>
    );
  };

  if (loading) {
    return <SafeAreaView style={s.safe} edges={['top']}><SkeletonList count={4} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={s.headerTitle}>Mis cenas</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={s.tabs}>
        <Pressable style={[s.tab, tab === 'host' && s.tabActive]} onPress={() => { hapticSelection(); setTab('host'); }}>
          <Text style={[s.tabText, tab === 'host' && s.tabTextActive]}>Como anfitrión</Text>
        </Pressable>
        <Pressable style={[s.tab, tab === 'guest' && s.tabActive]} onPress={() => { hapticSelection(); setTab('guest'); }}>
          <Text style={[s.tabText, tab === 'guest' && s.tabTextActive]}>Reservadas</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

        {tab === 'host' && (
          hostEvents.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="restaurant-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyTitle}>Aún no has organizado ninguna cena</Text>
              <Text style={s.emptyText}>¿Te animas a abrir tu mesa?</Text>
              <Pressable style={s.emptyBtn} onPress={() => navigation.navigate('StripeOnboarding')}>
                <Text style={s.emptyBtnText}>CREAR TU PRIMERA CENA</Text>
              </Pressable>
            </View>
          ) : hostEvents.map(renderHostCard)
        )}

        {tab === 'guest' && (
          reservations.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="search-outline" size={36} color={colors.textMuted} />
              <Text style={s.emptyTitle}>Aún no te has unido a ninguna cena</Text>
              <Text style={s.emptyText}>Explora las cenas cerca de ti</Text>
              <Pressable style={s.emptyBtn} onPress={() => navigation.navigate('Inicio')}>
                <Text style={s.emptyBtnText}>EXPLORAR CENAS</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {upcoming.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>PRÓXIMAS</Text>
                  {upcoming.map(renderGuestCard)}
                </>
              )}
              {past.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>PASADAS</Text>
                  {past.map(renderGuestCard)}
                </>
              )}
            </>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.floatingTabTotalH },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  tabs: {
    flexDirection: 'row', marginHorizontal: spacing.gutter,
    borderWidth: borders.hairline, borderColor: colors.border, marginBottom: spacing.sm,
  },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  tabActive: { backgroundColor: colors.accent },
  tabText: { ...typography.button, color: colors.textMuted, fontSize: 10, letterSpacing: 1.2 },
  tabTextActive: { color: colors.onAccent },
  sectionLabel: {
    ...typography.label, color: colors.textMuted, letterSpacing: 2.5,
    paddingHorizontal: spacing.gutter, marginBottom: spacing.xs, marginTop: spacing.md,
  },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  cardImg: { width: 56, height: 56, borderRadius: radius.xs, backgroundColor: colors.imagePlaceholder },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 16, marginBottom: 2 },
  cardDate: { ...typography.price, color: colors.textMuted, fontSize: 11, marginBottom: spacing.xxs },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xxs },
  statusText: { ...typography.label, fontSize: 9, letterSpacing: 1 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardPrice: { ...typography.price, color: colors.textPrimary, fontSize: 12 },
  cardCode: { ...typography.price, color: colors.textMuted, fontSize: 9 },
  cardMeta: { ...typography.price, color: colors.textMuted, fontSize: 11, marginBottom: spacing.xxs },
  hostPrice: { ...typography.price, color: colors.accent, fontSize: 13, alignSelf: 'center' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  pendingDot: { width: 6, height: 6, borderRadius: radius.pill, backgroundColor: colors.accent },
  pendingText: { ...typography.label, color: colors.accent, letterSpacing: 1, fontSize: 8 },

  empty: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xxl, gap: spacing.sm,
  },
  emptyTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary, textAlign: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { backgroundColor: colors.accent, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.xs, marginTop: spacing.sm },
  emptyBtnText: { ...typography.button, color: colors.onAccent },
});
