// HostGuestListScreen.js — Chef ve comensales confirmados + pendientes de su cena
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';

import { selectUser } from '../store/authSlice';
import { approveReservation, rejectReservation } from '../store/eventsSlice';
import { reservationApi, userApi, chatApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import { hapticSuccess, hapticError } from '../lib/haptics';

export default function HostGuestListScreen({ route, navigation }) {
  const { eventId, eventTitle } = route.params;
  const dispatch = useDispatch();
  const [data, setData] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await reservationApi.get(`/reservations/event/${eventId}/guests`);
      setData(res.data);
      // Fetch profiles for all guests
      const allIds = [...new Set([
        ...(res.data.confirmed || []).map(g => g.guest_id),
        ...(res.data.pending || []).map(g => g.guest_id),
      ])];
      for (const gid of allIds) {
        if (!profiles[gid]) {
          try {
            const p = await userApi.get(`/users/${gid}`);
            setProfiles(prev => ({ ...prev, [gid]: p.data }));
          } catch {}
        }
      }
    } catch {}
    setLoading(false);
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  const handleApprove = async (reservationId) => {
    setActioningId(reservationId);
    const result = await dispatch(approveReservation(reservationId));
    setActioningId(null);
    if (approveReservation.fulfilled.match(result)) {
      hapticSuccess();
      Alert.alert('Aprobada', `Código: ${result.payload?.confirmation_code || ''}`);
      load();
    } else {
      hapticError();
      Alert.alert('Error', result.payload || 'No se pudo aprobar');
    }
  };

  const handleReject = (reservationId) => {
    Alert.alert('Rechazar', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Rechazar', style: 'destructive', onPress: async () => {
        setActioningId(reservationId);
        try {
          await reservationApi.put(`/reservations/${reservationId}/reject`, { reason: 'Rechazada por el chef' });
          hapticSuccess();
          load();
        } catch (e) { hapticError(); Alert.alert('Error', e.userMessage || 'No se pudo rechazar'); }
        setActioningId(null);
      }},
    ]);
  };

  const openChat = async () => {
    try {
      const res = await chatApi.get(`/rooms/event/${eventId}`);
      navigation.navigate('Chat', { screen: 'ChatMain', params: { openRoomId: res.data.id, roomName: eventTitle } });
    } catch { navigation.navigate('Chat'); }
  };

  const getProfile = (gid) => profiles[gid];
  const getName = (gid) => {
    const p = getProfile(gid);
    if (p?.profile?.first_name) return `${p.profile.first_name} ${p.profile.last_name || ''}`.trim();
    return p?.username || 'Comensal';
  };
  const getAvatar = (gid) => getProfile(gid)?.profile?.avatar_url;
  const getInitial = (gid) => (getName(gid) || '?')[0].toUpperCase();

  if (loading) {
    return <SafeAreaView style={st.safe} edges={['top']}><ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} /></SafeAreaView>;
  }

  const free = (data?.max_guests || 0) - (data?.confirmed_count || 0);

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={st.headerTitle} numberOfLines={1}>{eventTitle || 'Tu mesa'}</Text>
        <Pressable onPress={openChat} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.accent} />
        </Pressable>
      </View>

      {/* Summary */}
      <View style={st.summary}>
        <View style={st.summaryItem}>
          <Text style={st.summaryNum}>{data?.confirmed_count || 0}/{data?.max_guests || 0}</Text>
          <Text style={st.summaryLabel}>CONFIRMADOS</Text>
        </View>
        <View style={st.summaryItem}>
          <Text style={st.summaryNum}>{free}</Text>
          <Text style={st.summaryLabel}>LIBRES</Text>
        </View>
        <View style={st.summaryItem}>
          <Text style={[st.summaryNum, { color: colors.accent }]}>{data?.pending_count || 0}</Text>
          <Text style={st.summaryLabel}>PENDIENTES</Text>
        </View>
        <Pressable style={st.summaryItem} onPress={() => Alert.alert(
          'Tus ingresos',
          `Confirmado: €${data?.chef_revenue || '0'}\nPotencial si se llena: €${data?.chef_potential || '0'}\n\nEl comensal paga un total mayor (€${data?.total_with_fees || '0'} confirmado); la diferencia son los gastos de servicio de App Chef. Tú recibes tu precio íntegro.`
        )}>
          <Text style={[st.summaryNum, { color: colors.success }]}>€{data?.chef_revenue || '0'}</Text>
          <Text style={st.summaryLabel}>TUS INGRESOS</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

        {/* Confirmed */}
        {(data?.confirmed || []).length > 0 && (
          <>
            <Text style={st.sectionLabel}>COMENSALES CONFIRMADOS</Text>
            {data.confirmed.map((g) => (
              <Pressable key={g.guest_id} style={({ pressed }) => [st.guestRow, pressed && { opacity: 0.7 }]}
                onPress={() => navigation.navigate('ChefProfile', { userId: g.guest_id, userName: getName(g.guest_id) })}>
                {getAvatar(g.guest_id) ? (
                  <Image source={{ uri: getAvatar(g.guest_id) }} style={st.avatar} />
                ) : (
                  <View style={st.avatarPlaceholder}><Text style={st.avatarText}>{getInitial(g.guest_id)}</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={st.guestName}>{getName(g.guest_id)}</Text>
                  <Text style={st.guestMeta}>{g.party_size} {g.party_size === 1 ? 'plaza' : 'plazas'} · {g.confirmation_code}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
          </>
        )}

        {/* Pending */}
        {(data?.pending || []).length > 0 && (
          <>
            <Text style={[st.sectionLabel, { marginTop: spacing.md }]}>SOLICITUDES PENDIENTES</Text>
            {data.pending.map((g) => (
              <View key={g.reservation_id} style={st.pendingRow}>
                <Pressable style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}
                  onPress={() => navigation.navigate('ChefProfile', { userId: g.guest_id, userName: getName(g.guest_id) })}>
                  {getAvatar(g.guest_id) ? (
                    <Image source={{ uri: getAvatar(g.guest_id) }} style={st.avatar} />
                  ) : (
                    <View style={st.avatarPlaceholder}><Text style={st.avatarText}>{getInitial(g.guest_id)}</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={st.guestName}>{getName(g.guest_id)}</Text>
                    <Text style={st.guestMeta}>{g.party_size} {g.party_size === 1 ? 'plaza' : 'plazas'} · €{g.total_amount}</Text>
                  </View>
                </Pressable>
                {actioningId === g.reservation_id ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                    <Pressable style={st.btnOutline} onPress={() => handleReject(g.reservation_id)}>
                      <Ionicons name="close" size={16} color={colors.textPrimary} />
                    </Pressable>
                    <Pressable style={st.btnFill} onPress={() => handleApprove(g.reservation_id)}>
                      <Ionicons name="checkmark" size={16} color={colors.onAccent} />
                    </Pressable>
                  </View>
                )}
              </View>
            ))}
          </>
        )}

        {/* Empty */}
        {(data?.confirmed || []).length === 0 && (data?.pending || []).length === 0 && (
          <View style={st.empty}>
            <Ionicons name="people-outline" size={36} color={colors.textMuted} />
            <Text style={st.emptyText}>Aún no hay comensales. Comparte tu cena para llenar la mesa.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.floatingTabTotalH },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  headerTitle: { ...typography.dinnerTitle, fontSize: 18, color: colors.textPrimary, flex: 1, textAlign: 'center', marginHorizontal: spacing.sm },

  summary: {
    flexDirection: 'row', paddingHorizontal: spacing.gutter, paddingVertical: spacing.md,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { ...typography.numeral, fontSize: 20, color: colors.textPrimary },
  summaryLabel: { ...typography.label, color: colors.textMuted, fontSize: 7, letterSpacing: 1.5, marginTop: 2 },

  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2.5, paddingHorizontal: spacing.gutter, marginBottom: spacing.xs, marginTop: spacing.sm },

  guestRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
    backgroundColor: 'rgba(191,71,38,0.04)',
  },
  avatar: { width: 40, height: 40, borderRadius: radius.pill },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.dinnerTitle, color: colors.onAccent, fontSize: 16 },
  guestName: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 15 },
  guestMeta: { ...typography.price, color: colors.textMuted, fontSize: 11, marginTop: 1 },

  btnOutline: { width: 32, height: 32, borderWidth: borders.medium, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xs },
  btnFill: { width: 32, height: 32, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xs },

  empty: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm, paddingHorizontal: spacing.xxl },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
