// MisCenasScreen.js — Reservas del usuario: próximas y pasadas
import React, { useEffect, useCallback, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { selectUser } from '../store/authSlice';
import { fetchUserReservations, selectMyReservations, selectEvents } from '../store/eventsSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

const STATUS_LABELS = {
  confirmed: 'Confirmada', pending_approval: 'Pendiente', pending_payment: 'Procesando',
  completed: 'Completada', rejected: 'Rechazada', expired: 'Expirada',
  cancelled_by_guest: 'Cancelada', cancelled_by_host: 'Cancelada',
};
const STATUS_COLORS = {
  confirmed: colors.success, pending_approval: colors.accent, pending_payment: colors.textMuted,
  completed: colors.textMuted, rejected: colors.error, expired: colors.textMuted,
  cancelled_by_guest: colors.textMuted, cancelled_by_host: colors.textMuted,
};

export default function MisCenasScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const reservations = useSelector(selectMyReservations);
  const allEvents = useSelector(selectEvents);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (user?.id) {
      return dispatch(fetchUserReservations(user.id));
    }
  }, [dispatch, user?.id]);

  useEffect(() => {
    load()?.finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const getEventTitle = (eventId) => allEvents.find(e => e.id === eventId)?.title || 'Cena';

  const upcoming = reservations.filter(r => ['confirmed', 'pending_approval', 'pending_payment'].includes(r.status));
  const past = reservations.filter(r => ['completed', 'rejected', 'expired', 'cancelled_by_guest', 'cancelled_by_host'].includes(r.status));

  const renderRes = (r, muted = false) => (
    <Pressable
      key={r.id}
      style={s.row}
      onPress={() => navigation.navigate('Inicio', { screen: 'EventDetail', params: { eventId: r.event_id } })}
    >
      <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[r.status] || colors.textMuted }]} />
      <View style={{ flex: 1 }}>
        <Text style={[s.rowTitle, muted && { color: colors.textMuted }]}>
          {r.event_title || getEventTitle(r.event_id)}
        </Text>
        <Text style={s.rowMeta}>
          {STATUS_LABELS[r.status] || r.status}
          {r.confirmation_code ? ` · ${r.confirmation_code}` : ''}
          {r.party_size > 1 ? ` · ${r.party_size} plazas` : ''}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
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
      <View style={s.rule} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        {reservations.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="restaurant-outline" size={36} color={colors.textMuted} />
            <Text style={s.emptyTitle}>Sin reservas todav\u00EDa</Text>
            <Text style={s.emptyText}>Cuando reserves una cena, aparecer\u00E1 aqu\u00ED.</Text>
          </View>
        ) : (
          <>
            {/* Pr\u00F3ximas */}
            {upcoming.length > 0 && (
              <>
                <Text style={s.sectionLabel}>PR\u00D3XIMAS</Text>
                {upcoming.map((r) => renderRes(r))}
                <View style={s.rule} />
              </>
            )}

            {/* Pasadas */}
            {past.length > 0 && (
              <>
                <Text style={s.sectionLabel}>PASADAS</Text>
                {past.map((r) => renderRes(r, true))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  headerTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  rule: { height: borders.hairline, backgroundColor: colors.borderHairline, marginHorizontal: spacing.gutter, marginVertical: spacing.sm },

  sectionLabel: {
    ...typography.label, color: colors.textMuted, letterSpacing: 2.5,
    paddingHorizontal: spacing.gutter, marginBottom: spacing.xs, marginTop: spacing.xs,
  },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  statusDot: { width: 8, height: 8, borderRadius: radius.pill },
  rowTitle: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 16 },
  rowMeta: { ...typography.price, color: colors.textMuted, marginTop: 2 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xxxl, paddingHorizontal: spacing.xxl, gap: spacing.sm,
  },
  emptyTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
