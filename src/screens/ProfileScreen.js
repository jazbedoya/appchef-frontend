// ProfileScreen.js — Rediseño editorial: perfil del usuario
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Alert, Modal, TextInput, ActivityIndicator, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { selectUser, selectIsHost, logoutUser } from '../store/authSlice';
import {
  fetchUserReservations, selectMyReservations,
  fetchPendingApprovals, selectPendingApprovals,
  approveReservation, rejectReservation,
  selectEvents,
} from '../store/eventsSlice';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

// ─── Status helpers ───

const STATUS_LABELS = {
  confirmed: 'Confirmada',
  pending_approval: 'Pendiente',
  pending_payment: 'Procesando',
  completed: 'Completada',
  rejected: 'Rechazada',
  expired: 'Expirada',
  cancelled_by_guest: 'Cancelada',
  cancelled_by_host: 'Cancelada',
};

const STATUS_COLORS = {
  confirmed: colors.success,
  pending_approval: colors.accent,
  pending_payment: colors.textMuted,
  completed: colors.textMuted,
  rejected: colors.error,
  expired: colors.textMuted,
  cancelled_by_guest: colors.textMuted,
  cancelled_by_host: colors.textMuted,
};

// ─── Component ───

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isHost = useSelector(selectIsHost);
  const reservations = useSelector(selectMyReservations);
  const pendingApprovals = useSelector(selectPendingApprovals);
  const allEvents = useSelector(selectEvents);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [guestNames, setGuestNames] = useState({});
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    if (user?.id) dispatch(fetchUserReservations(user.id));
    if (isHost) dispatch(fetchPendingApprovals());
  }, [dispatch, user?.id, isHost]);

  // Fetch guest names for pending approvals
  useEffect(() => {
    if (pendingApprovals.length === 0) return;
    const unknownIds = [...new Set(pendingApprovals.map(r => r.guest_id))].filter(id => !guestNames[id]);
    unknownIds.forEach(async (guestId) => {
      try {
        const res = await userApi.get(`/users/${guestId}`);
        const u = res.data;
        const name = u.profile?.first_name
          ? `${u.profile.first_name} ${u.profile.last_name || ''}`.trim()
          : u.username || u.email;
        setGuestNames(prev => ({ ...prev, [guestId]: name }));
      } catch {
        setGuestNames(prev => ({ ...prev, [guestId]: 'Invitado' }));
      }
    });
  }, [pendingApprovals]);

  const getEventTitle = (eventId) => allEvents.find(e => e.id === eventId)?.title || 'Cena';

  const handleApprove = async (reservationId) => {
    setActioningId(reservationId);
    const result = await dispatch(approveReservation(reservationId));
    setActioningId(null);
    if (approveReservation.fulfilled.match(result)) {
      Alert.alert('Aprobada', `Reserva confirmada.\nCódigo: ${result.payload.confirmation_code || ''}`);
    } else {
      Alert.alert('Error', result.payload || 'No se pudo aprobar');
    }
  };

  const handleReject = (reservationId) => {
    Alert.alert('Rechazar solicitud', '¿Seguro que quieres rechazar esta solicitud?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Rechazar', style: 'destructive', onPress: async () => {
          setActioningId(reservationId);
          const result = await dispatch(rejectReservation(reservationId));
          setActioningId(null);
          if (!rejectReservation.fulfilled.match(result)) {
            Alert.alert('Error', result.payload || 'No se pudo rechazar');
          }
        },
      },
    ]);
  };

  const initials = (user?.username || user?.email || '?')[0].toUpperCase();
  const displayName = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
    : user?.username || user?.email || '';

  const openEdit = () => {
    setEditName(user?.profile?.first_name || user?.username || '');
    setEditBio(user?.profile?.bio || '');
    setEditModal(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await userApi.put(`/users/${user.id}`, { first_name: editName.trim(), bio: editBio.trim() });
      setEditModal(false);
    } catch { Alert.alert('Error', 'No se pudo guardar'); }
    setSaving(false);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  const upcoming = reservations.filter(r => ['confirmed', 'pending_approval', 'pending_payment'].includes(r.status));
  const past = reservations.filter(r => ['completed', 'rejected', 'expired', 'cancelled_by_guest', 'cancelled_by_host'].includes(r.status));

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Header ── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Perfil</Text>
        </View>

        <View style={s.rule} />

        {/* ── Identity ── */}
        <View style={s.identity}>
          <View style={s.avatar}>
            <Text style={s.avatarLetter}>{initials}</Text>
          </View>
          <View style={s.identityInfo}>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.email}>{user?.email}</Text>
            {isHost && <Text style={s.badge}>ANFITRI\u00D3N</Text>}
          </View>
          <Pressable onPress={openEdit} hitSlop={12}>
            <Text style={s.editLink}>EDITAR</Text>
          </Pressable>
        </View>

        {user?.profile?.bio ? (
          <Text style={s.bio}>{user.profile.bio}</Text>
        ) : null}

        <View style={s.rule} />

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatItem num={upcoming.length} label="PR\u00D3XIMAS" />
          <View style={s.statSep} />
          <StatItem num={past.length} label="PASADAS" />
          <View style={s.statSep} />
          <StatItem num={reservations.length} label="TOTAL" />
        </View>

        <View style={s.rule} />

        {/* ── Pending approvals (host) ── */}
        {isHost && pendingApprovals.length > 0 && (
          <>
            <Text style={s.sectionLabel}>SOLICITUDES PENDIENTES</Text>
            <Text style={s.sectionHint}>
              {pendingApprovals.length} solicitud{pendingApprovals.length > 1 ? 'es' : ''} esperando tu respuesta
            </Text>

            {pendingApprovals.map((r) => (
              <View key={r.id} style={s.approvalCard}>
                <View style={s.approvalTop}>
                  <View style={s.approvalAvatar}>
                    <Text style={s.approvalInitial}>
                      {(guestNames[r.guest_id] || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.approvalName}>
                      {guestNames[r.guest_id] || 'Cargando...'}
                    </Text>
                    <Text style={s.approvalMeta}>
                      {r.party_size} {r.party_size === 1 ? 'plaza' : 'plazas'} {'\u00B7'} {'\u20AC'}{Number(r.total_amount).toFixed(0)}
                    </Text>
                  </View>
                </View>
                <Text style={s.approvalEvent}>{getEventTitle(r.event_id)}</Text>
                <View style={s.approvalActions}>
                  {actioningId === r.id ? (
                    <ActivityIndicator size="small" color={colors.accent} />
                  ) : (
                    <>
                      <Pressable style={s.btnOutline} onPress={() => handleReject(r.id)}>
                        <Text style={s.btnOutlineText}>RECHAZAR</Text>
                      </Pressable>
                      <Pressable style={s.btnFill} onPress={() => handleApprove(r.id)}>
                        <Text style={s.btnFillText}>APROBAR</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            ))}

            <View style={s.rule} />
          </>
        )}

        {/* ── Upcoming reservations ── */}
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionLabel}>PR\u00D3XIMAS CENAS</Text>
            {upcoming.map((r) => (
              <Pressable
                key={r.id}
                style={s.resRow}
                onPress={() => navigation.navigate('Inicio', {
                  screen: 'EventDetail',
                  params: { eventId: r.event_id },
                })}
              >
                <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[r.status] || colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.resTitle}>{r.event_title || getEventTitle(r.event_id)}</Text>
                  <Text style={s.resMeta}>
                    {STATUS_LABELS[r.status] || r.status}
                    {r.confirmation_code ? ` \u00B7 ${r.confirmation_code}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
            <View style={s.rule} />
          </>
        )}

        {/* ── Past reservations ── */}
        {past.length > 0 && (
          <>
            <Text style={s.sectionLabel}>HISTORIAL</Text>
            {past.map((r) => (
              <Pressable
                key={r.id}
                style={s.resRow}
                onPress={() => navigation.navigate('Inicio', {
                  screen: 'EventDetail',
                  params: { eventId: r.event_id },
                })}
              >
                <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[r.status] || colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.resTitle, { color: colors.textMuted }]}>
                    {r.event_title || getEventTitle(r.event_id)}
                  </Text>
                  <Text style={s.resMeta}>{STATUS_LABELS[r.status] || r.status}</Text>
                </View>
              </Pressable>
            ))}
            <View style={s.rule} />
          </>
        )}

        {/* ── Become host CTA ── */}
        {!isHost && (
          <Pressable
            style={s.hostCta}
            onPress={() => Alert.alert('Próximamente', 'Podrás convertirte en anfitrión.')}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.hostCtaTitle}>{'\u00BF'}Quieres cocinar?</Text>
              <Text style={s.hostCtaSub}>Conviértete en anfitrión y abre tu mesa.</Text>
            </View>
            <View style={s.hostCtaBtn}>
              <Text style={s.hostCtaBtnText}>SER CHEF</Text>
            </View>
          </Pressable>
        )}

        {/* ── Logout ── */}
        <Pressable style={s.logoutRow} onPress={handleLogout}>
          <Text style={s.logoutText}>CERRAR SESI\u00D3N</Text>
        </Pressable>

      </ScrollView>

      {/* ── Edit modal ── */}
      <Modal visible={editModal} animationType="slide" onRequestClose={() => setEditModal(false)}>
        <SafeAreaView style={s.safe} edges={['top']}>
          <View style={s.modalHeader}>
            <Pressable onPress={() => setEditModal(false)} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={s.modalTitle}>Editar perfil</Text>
            <Pressable onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.accent} /> : (
                <Text style={s.modalSave}>GUARDAR</Text>
              )}
            </Pressable>
          </View>
          <View style={s.ruleNoMargin} />
          <View style={s.modalBody}>
            <Text style={s.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={s.field}
              value={editName}
              onChangeText={setEditName}
              placeholder="Tu nombre"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={s.fieldLabel}>BIO</Text>
            <TextInput
              style={[s.field, { minHeight: 100, textAlignVertical: 'top' }]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Cuéntanos sobre ti..."
              placeholderTextColor={colors.textMuted}
              multiline
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Stat item ───

const StatItem = ({ num, label }) => (
  <View style={s.stat}>
    <Text style={s.statNum}>{num}</Text>
    <Text style={s.statLabel}>{label}</Text>
  </View>
);

// ─── Styles ───

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl + spacing.xxl },

  // Header
  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },
  headerTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    fontSize: 36,
  },

  rule: {
    height: borders.hairline,
    backgroundColor: colors.borderHairline,
    marginHorizontal: spacing.gutter,
    marginVertical: spacing.md,
  },
  ruleNoMargin: {
    height: borders.hairline,
    backgroundColor: colors.borderHairline,
  },

  // Identity
  identity: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.gutter,
  },
  avatar: {
    width: 56, height: 56, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: {
    ...typography.dinnerTitle,
    color: colors.onAccent,
    fontSize: 22,
  },
  identityInfo: { flex: 1 },
  name: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 22,
  },
  email: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 2,
    marginTop: spacing.xxs,
    fontSize: 9,
  },
  editLink: {
    ...typography.button,
    color: colors.accent,
    borderBottomWidth: borders.medium,
    borderBottomColor: colors.accent,
    paddingBottom: 1,
  },

  bio: {
    ...typography.standfirst,
    color: colors.textSecondary,
    paddingHorizontal: spacing.gutter,
    marginTop: spacing.sm,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.gutter,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNum: {
    ...typography.numeral,
    color: colors.textPrimary,
    fontSize: 26,
  },
  statLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 2,
    fontSize: 8,
    marginTop: 2,
  },
  statSep: {
    width: borders.hairline,
    height: 28,
    backgroundColor: colors.borderHairline,
  },

  // Section
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 2.5,
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.xxs,
  },
  sectionHint: {
    ...typography.standfirst,
    color: colors.textSecondary,
    fontSize: 14,
    paddingHorizontal: spacing.gutter,
    marginBottom: spacing.md,
  },

  // Approval cards
  approvalCard: {
    marginHorizontal: spacing.gutter,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    backgroundColor: 'rgba(191,71,38,0.05)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  approvalTop: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
  },
  approvalAvatar: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  approvalInitial: {
    ...typography.dinnerTitle,
    color: colors.onAccent,
    fontSize: 14,
  },
  approvalName: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 16,
  },
  approvalMeta: {
    ...typography.price,
    color: colors.textMuted,
    marginTop: 1,
  },
  approvalEvent: {
    ...typography.standfirst,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
    marginLeft: 36 + spacing.sm,
  },
  approvalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  btnOutline: {
    borderWidth: borders.medium,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  btnOutlineText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  btnFill: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  btnFillText: {
    ...typography.button,
    color: colors.onAccent,
  },

  // Reservation rows
  resRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: radius.pill,
  },
  resTitle: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 16,
  },
  resMeta: {
    ...typography.price,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Host CTA
  hostCta: {
    marginHorizontal: spacing.gutter,
    marginVertical: spacing.md,
    borderWidth: borders.medium,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  hostCtaTitle: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 18,
    marginBottom: spacing.xxs,
  },
  hostCtaSub: {
    ...typography.body,
    color: colors.textMuted,
  },
  hostCtaBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  hostCtaBtnText: {
    ...typography.button,
    color: colors.onAccent,
  },

  // Logout
  logoutRow: {
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  logoutText: {
    ...typography.label,
    color: colors.accent,
    letterSpacing: 2,
  },

  // Edit modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  modalTitle: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 18,
  },
  modalSave: {
    ...typography.button,
    color: colors.accent,
  },
  modalBody: {
    paddingHorizontal: spacing.gutter, paddingTop: spacing.md,
  },
  fieldLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
  },
  field: {
    ...typography.input,
    color: colors.textPrimary,
    borderBottomWidth: borders.medium,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: 0,
  },
});
