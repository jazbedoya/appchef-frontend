import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons as Icon } from '@expo/vector-icons';

import { reservationApi, userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing, borderRadius } from '../theme/spacing';
import typography from '../theme/typography';
import UserAvatar from '../components/UserAvatar';

const STATUS_META = {
  pending:               { label: 'Pendiente',  bg: '#FAF1DA', fg: '#C9963A' },
  confirmed:             { label: 'Confirmada', bg: '#E2EFE0', fg: '#2C3E2D' },
  cancelled_by_guest:    { label: 'Cancelada',  bg: '#EDE8DF', fg: '#7A7A6E' },
  cancelled_by_host:     { label: 'Cancelada',  bg: '#EDE8DF', fg: '#7A7A6E' },
  completed:             { label: 'Completada', bg: '#E2EFE0', fg: '#2C3E2D' },
  no_show:               { label: 'No-show',    bg: '#F5DCDC', fg: '#9A3C3C' },
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const HostBookingsScreen = ({ navigation }) => {
  const [items, setItems] = useState([]);
  const [guests, setGuests] = useState({});      // guest_id -> profile
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [actingOn, setActingOn] = useState(null); // reservation id currently being confirmed/cancelled

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await reservationApi.get('/reservations/host/my-bookings', {
        params: { per_page: 100 },
      });
      const list = res.data?.items || [];
      setItems(list);

      // Resolve unique guest profiles in parallel
      const uniqueIds = [...new Set(list.map(r => r.guest_id))].filter(Boolean);
      const missing = uniqueIds.filter(id => !guests[id]);
      if (missing.length > 0) {
        const fetched = await Promise.all(
          missing.map(id => userApi.get(`/users/${id}`).then(r => [id, r.data]).catch(() => [id, null]))
        );
        setGuests(prev => {
          const next = { ...prev };
          fetched.forEach(([id, profile]) => { next[id] = profile; });
          return next;
        });
      }
    } catch (e) {
      setError(e?.userMessage || 'No pudimos cargar las reservas.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [guests]);

  useEffect(() => { fetchData(); }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const handleConfirm = (reservationId) => {
    Alert.alert('Confirmar reserva', '¿Quieres confirmar esta reserva?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', style: 'default', onPress: async () => {
        setActingOn(reservationId);
        try {
          await reservationApi.put(`/reservations/${reservationId}/confirm`);
          await fetchData();
        } catch (e) {
          Alert.alert('Error', e?.userMessage || 'No se pudo confirmar.');
        } finally {
          setActingOn(null);
        }
      } },
    ]);
  };

  const handleCancel = (reservationId) => {
    Alert.alert('Rechazar reserva', '¿Seguro que quieres rechazar esta reserva? El comensal recibirá un aviso.', [
      { text: 'Volver', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: async () => {
        setActingOn(reservationId);
        try {
          await reservationApi.put(`/reservations/${reservationId}/cancel`);
          await fetchData();
        } catch (e) {
          Alert.alert('Error', e?.userMessage || 'No se pudo rechazar.');
        } finally {
          setActingOn(null);
        }
      } },
    ]);
  };

  // Group items by event_id (preserve order: most recent reservation first)
  const groups = (() => {
    const order = [];
    const map = {};
    items.forEach(it => {
      if (!map[it.event_id]) {
        order.push(it.event_id);
        map[it.event_id] = { event: it, reservations: [] };
      }
      map[it.event_id].reservations.push(it);
    });
    return order.map(id => map[id]);
  })();

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Icon name="alert-circle-outline" size={40} color={colors.textMuted} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.btn} onPress={fetchData}>
          <Text style={styles.btnText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.centered}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
      >
        <Icon name="calendar-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Sin reservas todavía</Text>
        <Text style={styles.emptyBody}>Cuando alguien reserve en tus cenas aparecerá aquí.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {groups.map(({ event, reservations }) => (
        <View key={event.event_id} style={styles.eventBlock}>
          <View style={styles.eventHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle} numberOfLines={2}>{event.event_title}</Text>
              <Text style={styles.eventDate}>{formatDate(event.event_date)}</Text>
            </View>
            <Text style={styles.eventCount}>{reservations.length}</Text>
          </View>

          {reservations.map(r => {
            const profile = guests[r.guest_id]?.profile;
            const fullName = profile
              ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Comensal'
              : 'Cargando…';
            const meta = STATUS_META[r.status] || STATUS_META.pending;
            const isPending = r.status === 'pending';
            const isActing = actingOn === r.id;

            return (
              <View key={r.id} style={styles.row}>
                <UserAvatar uri={profile?.avatar_url} name={fullName} size={44} />
                <View style={styles.rowBody}>
                  <View style={styles.rowTop}>
                    <Text style={styles.guestName} numberOfLines={1}>{fullName}</Text>
                    <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.badgeText, { color: meta.fg }]}>{meta.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.guestMeta}>
                    {r.party_size} {r.party_size === 1 ? 'comensal' : 'comensales'}
                    {r.dietary_notes ? ` · ${r.dietary_notes}` : ''}
                  </Text>

                  {isPending && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionConfirm, isActing && styles.actionDisabled]}
                        onPress={() => handleConfirm(r.id)}
                        disabled={isActing}
                      >
                        <Text style={styles.actionConfirmText}>Confirmar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.actionReject, isActing && styles.actionDisabled]}
                        onPress={() => handleCancel(r.id)}
                        disabled={isActing}
                      >
                        <Text style={styles.actionRejectText}>Rechazar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.beige },
  content: { padding: spacing.base, paddingBottom: spacing.xl },
  centered: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
    backgroundColor: colors.beige,
  },
  errorText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptyTitle: { ...typography.h3, color: colors.cafe, marginTop: spacing.sm },
  emptyBody: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

  eventBlock: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...Platform.select({
      web: { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
      default: {
        shadowColor: '#2C3E2D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  eventTitle: { ...typography.h3, color: colors.cafe },
  eventDate: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  eventCount: {
    ...typography.h3,
    color: colors.accent,
    backgroundColor: colors.beigeLight,
    minWidth: 32,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },

  row: { flexDirection: 'row', paddingVertical: spacing.sm, gap: spacing.sm },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  guestName: { ...typography.body, color: colors.text, fontWeight: '600', flex: 1 },
  guestMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },

  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
  },
  actionConfirm: { backgroundColor: colors.cafe },
  actionConfirmText: { color: colors.white, fontWeight: '600', fontSize: 13 },
  actionReject: { backgroundColor: '#FDFAF5', borderWidth: 1, borderColor: colors.border },
  actionRejectText: { color: colors.cafe, fontWeight: '600', fontSize: 13 },
  actionDisabled: { opacity: 0.5 },

  btn: {
    backgroundColor: colors.cafe,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  btnText: { color: colors.white, fontWeight: '600' },
});

export default HostBookingsScreen;
