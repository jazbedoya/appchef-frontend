// ProfileScreen.js — Perfil propio con bloque de confianza, rating, reseñas
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable, Image,
  Alert, Modal, TextInput, ActivityIndicator, Platform, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { selectUser, selectIsHost, logoutUser } from '../store/authSlice';
import {
  fetchUserReservations, selectMyReservations,
  fetchPendingApprovals, selectPendingApprovals,
  approveReservation, rejectReservation,
  selectEvents,
} from '../store/eventsSlice';
import eventsService from '../services/eventsService';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import RatingStars from '../components/RatingStars';

// ─── Status helpers ───

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
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ total: 0, average_rating: null });
  const [editAvatar, setEditAvatar] = useState(null);

  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserReservations(user.id));
      eventsService.getUserReviews(user.id).then(d => {
        setReviews(d.reviews || []);
        setReviewMeta({ total: d.total, average_rating: d.average_rating });
      }).catch(() => {});
    }
    if (isHost) dispatch(fetchPendingApprovals());
  }, [dispatch, user?.id, isHost]);

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
    setEditAvatar(user?.profile?.avatar_url || null);
    setEditModal(true);
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para elegir una foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setEditAvatar(uri);
    }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = { first_name: editName.trim(), bio: editBio.trim() };
      if (editAvatar && editAvatar !== user?.profile?.avatar_url) {
        payload.avatar_url = editAvatar;
      }
      await userApi.put(`/users/${user.id}`, payload);
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

  const memberSince = user?.created_at ? new Date(user.created_at).getFullYear() : null;
  const emailVerified = user?.email_verified === true;
  const phoneVerified = user?.phone_verified === true;
  const profileVerified = emailVerified && phoneVerified;

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
          {user?.profile?.avatar_url ? (
            <Image source={{ uri: user.profile.avatar_url }} style={s.avatarImg} />
          ) : (
            <View style={s.avatar}>
              <Text style={s.avatarLetter}>{initials}</Text>
            </View>
          )}
          <View style={s.identityInfo}>
            <Text style={s.name}>{displayName}</Text>
            <Text style={s.email}>{user?.email}</Text>
            {isHost && <Text style={s.hostBadge}>ANFITRIÓN</Text>}
          </View>
          <Pressable onPress={openEdit} hitSlop={12}>
            <Text style={s.editLink}>EDITAR</Text>
          </Pressable>
        </View>

        {user?.profile?.bio ? <Text style={s.bio}>{user.profile.bio}</Text> : null}

        {/* ── Badges de confianza ── */}
        <View style={s.badgesRow}>
          {emailVerified && (
            <View style={s.badge}>
              <Ionicons name="mail" size={13} color={colors.success} />
              <Text style={s.badgeText}>Email verificado</Text>
            </View>
          )}
          {phoneVerified && (
            <View style={s.badge}>
              <Ionicons name="call" size={13} color={colors.success} />
              <Text style={s.badgeText}>Teléfono verificado</Text>
            </View>
          )}
          {profileVerified && (
            <View style={[s.badge, s.badgeAccent]}>
              <Ionicons name="shield-checkmark" size={13} color={colors.accent} />
              <Text style={[s.badgeText, { color: colors.accent }]}>Perfil verificado</Text>
            </View>
          )}
          {memberSince && (
            <View style={s.badge}>
              <Ionicons name="calendar-outline" size={13} color={colors.textMuted} />
              <Text style={[s.badgeText, { color: colors.textMuted }]}>Desde {memberSince}</Text>
            </View>
          )}
        </View>

        {/* ── Rating ── */}
        {reviewMeta.average_rating && (
          <View style={s.ratingRow}>
            <RatingStars rating={reviewMeta.average_rating} size={16} />
            <Text style={s.ratingText}>
              {reviewMeta.average_rating.toFixed(1)} · {reviewMeta.total} reseña{reviewMeta.total !== 1 ? 's' : ''}
            </Text>
          </View>
        )}

        <View style={s.rule} />

        {/* ── Stats ── */}
        <View style={s.statsRow}>
          <StatItem num={upcoming.length} label="PRÓXIMAS" />
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
                    <Text style={s.approvalInitial}>{(guestNames[r.guest_id] || '?')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.approvalName}>{guestNames[r.guest_id] || 'Cargando...'}</Text>
                    <Text style={s.approvalMeta}>
                      {r.party_size} {r.party_size === 1 ? 'plaza' : 'plazas'} · €{Number(r.total_amount).toFixed(0)}
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

        {/* ── Upcoming ── */}
        {upcoming.length > 0 && (
          <>
            <Text style={s.sectionLabel}>PRÓXIMAS CENAS</Text>
            {upcoming.map((r) => (
              <Pressable key={r.id} style={s.resRow}
                onPress={() => navigation.navigate('Inicio', { screen: 'EventDetail', params: { eventId: r.event_id } })}>
                <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[r.status] || colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.resTitle}>{r.event_title || getEventTitle(r.event_id)}</Text>
                  <Text style={s.resMeta}>
                    {STATUS_LABELS[r.status] || r.status}
                    {r.confirmation_code ? ` · ${r.confirmation_code}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
              </Pressable>
            ))}
            <View style={s.rule} />
          </>
        )}

        {/* ── Past ── */}
        {past.length > 0 && (
          <>
            <Text style={s.sectionLabel}>HISTORIAL</Text>
            {past.map((r) => (
              <Pressable key={r.id} style={s.resRow}
                onPress={() => navigation.navigate('Inicio', { screen: 'EventDetail', params: { eventId: r.event_id } })}>
                <View style={[s.statusDot, { backgroundColor: STATUS_COLORS[r.status] || colors.textMuted }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.resTitle, { color: colors.textMuted }]}>{r.event_title || getEventTitle(r.event_id)}</Text>
                  <Text style={s.resMeta}>{STATUS_LABELS[r.status] || r.status}</Text>
                </View>
              </Pressable>
            ))}
            <View style={s.rule} />
          </>
        )}

        {/* ── Reseñas recibidas ── */}
        <Text style={s.sectionLabel}>RESEÑAS RECIBIDAS</Text>
        {reviews.length > 0 ? (
          reviews.map((rev) => (
            <View key={rev.id} style={s.reviewCard}>
              <View style={s.reviewHeader}>
                <View style={s.reviewAvatar}>
                  <Text style={s.reviewAvatarText}>
                    {(rev.reviewer.first_name || rev.reviewer.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.reviewName}>
                    {rev.reviewer.first_name
                      ? `${rev.reviewer.first_name} ${rev.reviewer.last_name || ''}`.trim()
                      : rev.reviewer.username}
                  </Text>
                  <RatingStars rating={rev.rating} size={12} />
                </View>
                <Text style={s.reviewDate}>
                  {new Date(rev.created_at).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                </Text>
              </View>
              {rev.comment && <Text style={s.reviewComment}>{rev.comment}</Text>}
            </View>
          ))
        ) : (
          <Text style={s.emptyReviews}>Aún no tienes reseñas.</Text>
        )}

        {/* ── Host CTA ── */}
        {!isHost && (
          <Pressable style={s.hostCta}
            onPress={() => Alert.alert('Próximamente', 'Podrás convertirte en anfitrión.')}>
            <View style={{ flex: 1 }}>
              <Text style={s.hostCtaTitle}>¿Quieres cocinar?</Text>
              <Text style={s.hostCtaSub}>Conviértete en anfitrión y abre tu mesa.</Text>
            </View>
            <View style={s.hostCtaBtn}><Text style={s.hostCtaBtnText}>SER CHEF</Text></View>
          </Pressable>
        )}

        {/* ── Logout ── */}
        <Pressable style={s.logoutRow} onPress={handleLogout}>
          <Text style={s.logoutText}>CERRAR SESIÓN</Text>
        </Pressable>

      </ScrollView>

      {/* ── Edit modal ── */}
      <Modal visible={editModal} animationType="slide" onRequestClose={() => setEditModal(false)}>
        <View style={s.modalContainer}>
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
            {/* Avatar picker */}
            <Pressable style={s.avatarPicker} onPress={pickAvatar}>
              {editAvatar ? (
                <Image source={{ uri: editAvatar }} style={s.avatarPickerImg} />
              ) : (
                <View style={s.avatarPickerPlaceholder}>
                  <Ionicons name="camera-outline" size={28} color={colors.textMuted} />
                </View>
              )}
              <View style={s.avatarPickerOverlay}>
                <Ionicons name="camera" size={14} color={colors.onAccent} />
              </View>
            </Pressable>
            <Text style={s.avatarPickerHint}>Toca para cambiar foto</Text>

            <Text style={s.fieldLabel}>NOMBRE</Text>
            <TextInput style={s.field} value={editName} onChangeText={setEditName}
              placeholder="Tu nombre" placeholderTextColor={colors.textMuted} />
            <Text style={s.fieldLabel}>BIO</Text>
            <TextInput style={[s.field, { minHeight: 100, textAlignVertical: 'top' }]}
              value={editBio} onChangeText={setEditBio}
              placeholder="Cuéntanos sobre ti..." placeholderTextColor={colors.textMuted} multiline />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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

  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },
  headerTitle: { ...typography.sectionTitle, color: colors.textPrimary, fontSize: 36 },
  rule: { height: borders.hairline, backgroundColor: colors.borderHairline, marginHorizontal: spacing.gutter, marginVertical: spacing.md },
  ruleNoMargin: { height: borders.hairline, backgroundColor: colors.borderHairline },

  // Identity
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.gutter },
  avatar: {
    width: 56, height: 56, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: {
    width: 56, height: 56, borderRadius: radius.pill,
  },
  avatarLetter: { ...typography.dinnerTitle, color: colors.onAccent, fontSize: 22 },
  identityInfo: { flex: 1 },
  name: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 22 },
  email: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  hostBadge: { ...typography.label, color: colors.accent, letterSpacing: 2, marginTop: spacing.xxs, fontSize: 9 },
  editLink: { ...typography.button, color: colors.accent, borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: 1 },
  bio: { ...typography.standfirst, color: colors.textSecondary, paddingHorizontal: spacing.gutter, marginTop: spacing.sm },

  // Badges
  badgesRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs,
    paddingHorizontal: spacing.gutter, marginTop: spacing.sm,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: spacing.xxs, paddingHorizontal: spacing.xs,
    borderWidth: borders.hairline, borderColor: colors.borderHairline,
  },
  badgeAccent: { borderColor: colors.accent, backgroundColor: 'rgba(191,71,38,0.06)' },
  badgeText: { ...typography.price, color: colors.success, fontSize: 10 },

  // Rating
  ratingRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.gutter, marginTop: spacing.sm,
  },
  ratingText: { ...typography.price, color: colors.textMuted, fontSize: 12 },

  // Stats
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.gutter },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { ...typography.numeral, color: colors.textPrimary, fontSize: 26 },
  statLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2, fontSize: 8, marginTop: 2 },
  statSep: { width: borders.hairline, height: 28, backgroundColor: colors.borderHairline },

  // Sections
  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2.5, paddingHorizontal: spacing.gutter, marginBottom: spacing.xxs },
  sectionHint: { ...typography.standfirst, color: colors.textSecondary, fontSize: 14, paddingHorizontal: spacing.gutter, marginBottom: spacing.md },

  // Approvals
  approvalCard: {
    marginHorizontal: spacing.gutter, marginBottom: spacing.sm,
    borderLeftWidth: 3, borderLeftColor: colors.accent, backgroundColor: 'rgba(191,71,38,0.05)',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
  },
  approvalTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  approvalAvatar: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  approvalInitial: { ...typography.dinnerTitle, color: colors.onAccent, fontSize: 14 },
  approvalName: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 16 },
  approvalMeta: { ...typography.price, color: colors.textMuted, marginTop: 1 },
  approvalEvent: { ...typography.standfirst, color: colors.textSecondary, fontSize: 13, marginTop: spacing.xs, marginLeft: 36 + spacing.sm },
  approvalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },
  btnOutline: { borderWidth: borders.medium, borderColor: colors.border, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  btnOutlineText: { ...typography.button, color: colors.textPrimary },
  btnFill: { backgroundColor: colors.accent, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  btnFillText: { ...typography.button, color: colors.onAccent },

  // Reservations
  resRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  statusDot: { width: 8, height: 8, borderRadius: radius.pill },
  resTitle: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 16 },
  resMeta: { ...typography.price, color: colors.textMuted, marginTop: 2 },

  // Reviews
  reviewCard: {
    marginHorizontal: spacing.gutter, marginBottom: spacing.sm,
    paddingBottom: spacing.sm, borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  reviewAvatar: {
    width: 32, height: 32, borderRadius: radius.pill,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarText: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 13 },
  reviewName: { ...typography.body, fontWeight: '600', color: colors.textPrimary, fontSize: 13, marginBottom: 2 },
  reviewDate: { ...typography.price, color: colors.textMuted, fontSize: 10 },
  reviewComment: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginLeft: 32 + spacing.xs, lineHeight: 20 },
  emptyReviews: { ...typography.standfirst, color: colors.textMuted, textAlign: 'center', paddingHorizontal: spacing.gutter, paddingVertical: spacing.lg, fontSize: 14 },

  // Host CTA
  hostCta: {
    marginHorizontal: spacing.gutter, marginVertical: spacing.md,
    borderWidth: borders.medium, borderColor: colors.border,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  hostCtaTitle: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 18, marginBottom: spacing.xxs },
  hostCtaSub: { ...typography.body, color: colors.textMuted },
  hostCtaBtn: { backgroundColor: colors.accent, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  hostCtaBtnText: { ...typography.button, color: colors.onAccent },

  // Logout
  logoutRow: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, marginTop: spacing.sm },
  logoutText: { ...typography.label, color: colors.accent, letterSpacing: 2 },

  // Avatar picker
  avatarPicker: {
    alignSelf: 'center', marginTop: spacing.md, position: 'relative',
  },
  avatarPickerImg: {
    width: 80, height: 80, borderRadius: radius.pill,
  },
  avatarPickerPlaceholder: {
    width: 80, height: 80, borderRadius: radius.pill,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: borders.medium, borderColor: colors.borderHairline, borderStyle: 'dashed',
  },
  avatarPickerOverlay: {
    position: 'absolute', bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: radius.pill,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  avatarPickerHint: {
    ...typography.price, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, fontSize: 11,
  },

  // Modal
  modalContainer: {
    flex: 1, backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + spacing.xs : spacing.xxxl,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingBottom: spacing.sm,
  },
  modalTitle: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 18 },
  modalSave: { ...typography.button, color: colors.accent },
  modalBody: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2, marginBottom: spacing.xs, marginTop: spacing.lg },
  field: { ...typography.input, color: colors.textPrimary, borderBottomWidth: borders.medium, borderBottomColor: colors.border, paddingVertical: spacing.xs, paddingHorizontal: 0 },
});
