// NotificationsScreen.js — Lista de notificaciones in-app
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, Alert,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import { Modal, TextInput, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import { approveReservation, rejectReservation } from '../store/eventsSlice';
import notificationsService from '../services/notificationsService';
import { hapticSuccess, hapticError, hapticMedium } from '../lib/haptics';
import { SkeletonList } from '../components/Skeleton';

const ICON_MAP = {
  RESERVATION_REQUEST: 'calendar-outline',
  RESERVATION_ACCEPTED: 'checkmark-circle-outline',
  RESERVATION_REJECTED: 'close-circle-outline',
  NEW_REVIEW: 'star-outline',
  NEW_FOLLOWER: 'person-add-outline',
};

function formatMessage(notif) {
  const p = notif.payload || {};
  const name = p.actor_name || 'Alguien';
  const title = p.event_title || 'una cena';
  switch (notif.type) {
    case 'RESERVATION_REQUEST':
      if (p.is_guest_confirmation) return `Tu solicitud para "${title}" est\u00E1 en revisi\u00F3n. El pago se completar\u00E1 cuando el chef acepte.`;
      return `${name} solicit\u00F3 unirse a tu cena "${title}"${p.party_size > 1 ? ` (${p.party_size} plazas)` : ''}`;
    case 'RESERVATION_ACCEPTED':
      return `${name} acept\u00F3 tu plaza en "${title}". Se ha completado el cobro. Ya puedes unirte al chat.`;
    case 'RESERVATION_REJECTED': {
      const reason = p.reason ? ` Motivo: ${p.reason}.` : '';
      const note = p.note ? ` "${p.note}"` : '';
      return `Tu solicitud para "${title}" no fue aceptada.${reason}${note} No se te ha cobrado nada.`;
    }
    case 'NEW_REVIEW':
      return `${name} te dej\u00F3 una rese\u00F1a${p.rating ? ` (${p.rating}\u2605)` : ''}`;
    case 'NEW_FOLLOWER':
      return `${name} te empez\u00F3 a seguir`;
    default:
      return 'Nueva notificaci\u00F3n';
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

const REJECT_REASONS = ['Cena completa', 'No encaja con el grupo', 'Fecha cambiada', 'Otro'];

const NotificationsScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actioningId, setActioningId] = useState(null);
  const [resolved, setResolved] = useState({});
  const [approveModal, setApproveModal] = useState(null); // { reservationId, notifId, guestName }
  const [welcomeMsg, setWelcomeMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await notificationsService.getNotifications({ perPage: 50 });
      setNotifications(data.notifications || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const markAllRead = async () => {
    await notificationsService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const onPress = async (notif) => {
    if (!notif.read) {
      notificationsService.markRead(notif.id).catch(() => {});
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
    const p = notif.payload || {};
    switch (notif.type) {
      case 'RESERVATION_REQUEST':
        if (p.is_guest_confirmation && p.event_id) navigation.navigate('EventDetail', { eventId: p.event_id });
        // Chef requests are handled inline (approve/reject buttons), no navigation needed
        break;
      case 'RESERVATION_ACCEPTED':
        // Open chat for this event
        if (p.event_id) {
          try {
            const { chatApi } = await import('../services/api');
            const roomRes = await chatApi.get(`/rooms/event/${p.event_id}`);
            navigation.navigate('Chat', { screen: 'ChatMain', params: { openRoomId: roomRes.data.id, roomName: p.event_title } });
          } catch {
            navigation.navigate('Chat');
          }
        } else {
          navigation.navigate('Chat');
        }
        break;
      case 'RESERVATION_REJECTED':
        navigation.navigate('Profile', { screen: 'MisCenas' });
        break;
      case 'NEW_REVIEW':
        navigation.navigate('Profile');
        break;
      case 'NEW_FOLLOWER':
        if (p.actor_id) navigation.navigate('ChefProfile', { userId: p.actor_id, userName: p.actor_name });
        break;
    }
  };

  const handleApprove = (reservationId, notifId, guestName) => {
    setWelcomeMsg('');
    setApproveModal({ reservationId, notifId, guestName });
  };

  const doApprove = async (reservationId, notifId, msg) => {
    setApproveModal(null);
    setActioningId(reservationId);
    const result = await dispatch(approveReservation(reservationId));
    setActioningId(null);
    if (approveReservation.fulfilled.match(result)) {
      setResolved((p) => ({ ...p, [notifId]: 'approved' }));
      notificationsService.markRead(notifId).catch(() => {});
      const code = result.payload?.confirmation_code || '';
      hapticSuccess();
      Alert.alert('Aprobada', `Reserva confirmada.\nC\u00F3digo: ${code}${msg ? `\n\nTu mensaje: "${msg}"` : ''}`);
    } else {
      hapticError();
      Alert.alert('Error', result.payload || 'No se pudo aprobar');
    }
  };

  const handleReject = (reservationId, notifId) => {
    Alert.alert('Rechazar solicitud', 'Elige un motivo:',
      REJECT_REASONS.map((reason) => ({
        text: reason,
        onPress: async () => {
          setActioningId(reservationId);
          try {
            const { reservationApi } = await import('../services/api');
            await reservationApi.put(`/reservations/${reservationId}/reject`, { reason });
            setResolved((p) => ({ ...p, [notifId]: 'rejected' }));
            notificationsService.markRead(notifId).catch(() => {});
          } catch (e) {
            Alert.alert('Error', e.userMessage || 'No se pudo rechazar');
          }
          setActioningId(null);
        },
      })).concat([{ text: 'Cancelar', style: 'cancel' }]),
    );
  };

  const renderItem = ({ item }) => {
    const p = item.payload || {};
    const isChefRequest = item.type === 'RESERVATION_REQUEST' && !p.is_guest_confirmation && p.reservation_id;
    const status = resolved[item.id];

    // Actionable card for chef
    if (isChefRequest && !status) {
      const initial = (p.actor_name || '?')[0].toUpperCase();
      return (
        <View style={[st.row, st.rowUnread, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Pressable onPress={() => p.actor_id && navigation.navigate('ChefProfile', { userId: p.actor_id, userName: p.actor_name })}>
              <View style={st.approvalAvatar}><Text style={st.approvalInitial}>{initial}</Text></View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => p.actor_id && navigation.navigate('ChefProfile', { userId: p.actor_id, userName: p.actor_name })}>
                <Text style={st.messageUnread}>{p.actor_name || 'Alguien'}</Text>
              </Pressable>
              <Text style={st.time}>{p.party_size || 1} {(p.party_size || 1) === 1 ? 'plaza' : 'plazas'} · {p.event_title || 'Cena'}</Text>
            </View>
            <Text style={st.time}>{timeAgo(item.created_at)}</Text>
          </View>
          <View style={st.approvalActions}>
            {actioningId === p.reservation_id ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <>
                <Pressable style={st.btnOutline} onPress={() => handleReject(p.reservation_id, item.id)}>
                  <Text style={st.btnOutlineText}>RECHAZAR</Text>
                </Pressable>
                <Pressable style={st.btnFill} onPress={() => handleApprove(p.reservation_id, item.id, p.actor_name)}>
                  <Text style={st.btnFillText}>APROBAR</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      );
    }

    // Resolved request
    if (isChefRequest && status) {
      return (
        <View style={st.row}>
          <View style={st.iconWrap}>
            <Ionicons name={status === 'approved' ? 'checkmark-circle' : 'close-circle'} size={20} color={status === 'approved' ? colors.success : colors.textMuted} />
          </View>
          <View style={st.body}>
            <Text style={st.message}>{p.actor_name || 'Solicitud'} — {status === 'approved' ? 'Aprobada' : 'Rechazada'}</Text>
            <Text style={st.time}>{p.event_title}</Text>
          </View>
        </View>
      );
    }

    // Regular notification
    return (
      <Pressable style={[st.row, !item.read && st.rowUnread]} onPress={() => onPress(item)}>
        <View style={[st.iconWrap, !item.read && st.iconWrapUnread]}>
          <Ionicons name={ICON_MAP[item.type] || 'notifications-outline'} size={20} color={!item.read ? colors.accent : colors.textMuted} />
        </View>
        <View style={st.body}>
          <Text style={[st.message, !item.read && st.messageUnread]}>
            {formatMessage(item)}
          </Text>
          <Text style={st.time}>{timeAgo(item.created_at)}</Text>
        </View>
        {!item.read && <View style={st.dot} />}
      </Pressable>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <SkeletonList count={5} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={st.title}>Notificaciones</Text>
        {notifications.some((n) => !n.read) ? (
          <Pressable onPress={markAllRead}>
            <Text style={st.markAll}>Leer todo</Text>
          </Pressable>
        ) : <View style={{ width: 60 }} />}
      </View>

      {notifications.length === 0 ? (
        <View style={st.empty}>
          <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
          <Text style={st.emptyTitle}>Sin notificaciones</Text>
          <Text style={st.emptyText}>Cuando alguien reserve, te siga o te deje una rese\u00F1a, lo ver\u00E1s aqu\u00ED.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      )}
      {/* Approve modal with welcome message */}
      <Modal visible={!!approveModal} transparent animationType="fade" onRequestClose={() => setApproveModal(null)}>
        <Pressable style={st.modalOverlay} onPress={() => setApproveModal(null)}>
          <Pressable style={st.modalCard} onPress={() => {}}>
            <Text style={st.modalTitle}>Aprobar solicitud</Text>
            <Text style={st.modalSub}>Mensaje de bienvenida para {approveModal?.guestName || 'el comensal'} (opcional):</Text>
            <TextInput
              style={st.modalInput}
              placeholder="Ej: Trae ganas de pasta"
              placeholderTextColor={colors.placeholder}
              value={welcomeMsg}
              onChangeText={setWelcomeMsg}
              multiline
              maxLength={200}
            />
            <View style={st.modalActions}>
              <Pressable style={st.btnOutline} onPress={() => doApprove(approveModal.reservationId, approveModal.notifId, '')}>
                <Text style={st.btnOutlineText}>SIN MENSAJE</Text>
              </Pressable>
              <Pressable style={st.btnFill} onPress={() => doApprove(approveModal.reservationId, approveModal.notifId, welcomeMsg.trim())}>
                <Text style={st.btnFillText}>APROBAR</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default NotificationsScreen;

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  title: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  markAll: { ...typography.label, fontSize: 9, color: colors.accent, letterSpacing: 1.2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.gutter,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  rowUnread: { backgroundColor: 'rgba(191,71,38,0.04)' },

  iconWrap: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: 'rgba(191,71,38,0.1)' },

  body: { flex: 1 },
  message: { ...typography.body, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  messageUnread: { color: colors.textPrimary },
  time: { ...typography.price, color: colors.textMuted, fontSize: 10, marginTop: 2 },

  dot: {
    width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.accent,
  },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.sm,
  },
  emptyTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  // Approval card
  approvalAvatar: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  approvalInitial: { ...typography.dinnerTitle, color: colors.onAccent, fontSize: 14 },
  approvalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  btnOutline: { borderWidth: borders.medium, borderColor: colors.border, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  btnOutlineText: { ...typography.button, color: colors.textPrimary },
  btnFill: { backgroundColor: colors.accent, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  btnFillText: { ...typography.button, color: colors.onAccent },

  // Approve modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,22,19,0.4)', justifyContent: 'center', paddingHorizontal: spacing.xl },
  modalCard: { backgroundColor: colors.background, padding: spacing.lg, borderWidth: borders.medium, borderColor: colors.border },
  modalTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xs },
  modalSub: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  modalInput: {
    ...typography.body, color: colors.textPrimary,
    borderWidth: borders.hairline, borderColor: colors.borderHairline,
    padding: spacing.sm, minHeight: 60, marginBottom: spacing.md, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
