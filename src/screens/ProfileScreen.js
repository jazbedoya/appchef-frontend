// ProfileScreen.js — Rediseño editorial: perfil del usuario
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Alert, Modal, TextInput, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { selectUser, selectIsHost, logoutUser } from '../store/authSlice';
import { fetchUserReservations, selectMyReservations } from '../store/eventsSlice';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isHost = useSelector(selectIsHost);
  const reservations = useSelector(selectMyReservations);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user?.id) dispatch(fetchUserReservations(user.id));
  }, [dispatch, user?.id]);

  const initials = (user?.username || user?.email || '?')[0].toUpperCase();
  const displayName = user?.profile?.first_name
    ? `${user.profile.first_name} ${user.profile.last_name || ''}`
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

  const upcoming = reservations.filter((r) => r.status === 'confirmed' || r.status === 'pending');
  const past = reservations.filter((r) => r.status === 'completed');

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}>
        {/* Header */}
        <View style={st.header}>
          <Text style={st.metaLabel}>Perfil</Text>
          <View style={st.rule} />
        </View>

        {/* Avatar + name */}
        <View style={st.profileBlock}>
          <View style={st.avatar}>
            <Text style={st.avatarText}>{initials}</Text>
          </View>
          <View style={st.profileInfo}>
            <Text style={st.profileName}>{displayName}</Text>
            <Text style={st.profileEmail}>{user?.email}</Text>
            {isHost && <Text style={st.hostBadge}>ANFITRIÓN</Text>}
          </View>
          <Pressable onPress={openEdit}>
            <Text style={st.editLink}>Editar</Text>
          </Pressable>
        </View>

        {user?.profile?.bio ? (
          <Text style={st.bio}>{user.profile.bio}</Text>
        ) : null}

        <View style={st.rule} />

        {/* Stats */}
        <View style={st.statsRow}>
          <View style={st.stat}>
            <Text style={st.statNum}>{upcoming.length}</Text>
            <Text style={st.statLabel}>Próximas</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statNum}>{past.length}</Text>
            <Text style={st.statLabel}>Pasadas</Text>
          </View>
          <View style={st.stat}>
            <Text style={st.statNum}>{reservations.length}</Text>
            <Text style={st.statLabel}>Total</Text>
          </View>
        </View>

        <View style={st.rule} />

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <Text style={st.sectionLabel}>Próximas cenas</Text>
            {upcoming.map((r) => (
              <Pressable key={r.id} style={st.row}>
                <Text style={st.rowTitle}>{r.event_title || 'Cena reservada'}</Text>
                <Text style={st.rowMeta}>{r.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}</Text>
              </Pressable>
            ))}
            <View style={st.rule} />
          </>
        )}

        {/* Become host */}
        {!isHost && (
          <Pressable style={st.createBlock} onPress={() => Alert.alert('Próximamente', 'Podrás convertirte en anfitrión.')}>
            <View style={st.createCopy}>
              <Text style={st.createTitle}>¿Quieres cocinar?</Text>
              <Text style={st.createSub}>Conviértete en anfitrión y abre tu mesa.</Text>
            </View>
            <View style={st.createBtn}>
              <Text style={st.createBtnText}>Ser chef →</Text>
            </View>
          </Pressable>
        )}

        {/* Logout */}
        <Pressable style={st.logoutRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.accent} />
          <Text style={st.logoutText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>

      {/* Edit modal */}
      <Modal visible={editModal} animationType="slide" onRequestClose={() => setEditModal(false)}>
        <SafeAreaView style={st.safe} edges={['top']}>
          <View style={st.modalHeader}>
            <Pressable onPress={() => setEditModal(false)}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={st.modalTitle}>Editar perfil</Text>
            <Pressable onPress={saveEdit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={colors.accent} /> : (
                <Text style={st.saveBtn}>Guardar</Text>
              )}
            </Pressable>
          </View>
          <View style={st.rule} />
          <View style={st.modalBody}>
            <Text style={st.fieldLabel}>Nombre</Text>
            <TextInput style={st.field} value={editName} onChangeText={setEditName} placeholder="Tu nombre" placeholderTextColor={colors.textMuted} />
            <Text style={st.fieldLabel}>Bio</Text>
            <TextInput style={[st.field, { minHeight: 80 }]} value={editBio} onChangeText={setEditBio} placeholder="Cuéntanos sobre ti..." placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xxxl + spacing.xxl },

  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md },
  metaLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2 },
  rule: { height: borders.hairline, backgroundColor: colors.border, marginHorizontal: spacing.gutter, marginVertical: spacing.md },

  // Profile
  profileBlock: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.gutter,
  },
  avatar: {
    width: sizes.avatar, height: sizes.avatar, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...typography.dinnerTitle, fontSize: 20, color: colors.onAccent },
  profileInfo: { flex: 1 },
  profileName: { ...typography.dinnerTitle, fontSize: 22, color: colors.textPrimary },
  profileEmail: { ...typography.body, color: colors.textMuted, marginTop: spacing.xxs / 2 },
  hostBadge: { ...typography.labelSm, color: colors.accent, marginTop: spacing.xxs, letterSpacing: 1.2 },
  editLink: { ...typography.label, color: colors.accent, letterSpacing: 1, borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: 1 },

  bio: { ...typography.standfirst, color: colors.textSecondary, paddingHorizontal: spacing.gutter, marginTop: spacing.sm },

  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: spacing.gutter },
  stat: { alignItems: 'center' },
  statNum: { ...typography.dinnerTitle, fontSize: 28, color: colors.textPrimary },
  statLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1 },

  // Section
  sectionLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 2, paddingHorizontal: spacing.gutter, marginBottom: spacing.xs },
  row: {
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  rowTitle: { ...typography.dinnerTitle, color: colors.textPrimary },
  rowMeta: { ...typography.body, color: colors.textMuted, marginTop: spacing.xxs / 2 },

  // Become host
  createBlock: {
    marginHorizontal: spacing.gutter, marginVertical: spacing.md,
    borderWidth: borders.medium, borderColor: colors.border,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md,
  },
  createCopy: { flex: 1 },
  createTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary, marginBottom: spacing.xxs },
  createSub: { ...typography.body, color: colors.textMuted },
  createBtn: { backgroundColor: colors.accent, borderRadius: radius.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  createBtnText: { ...typography.button, color: colors.onAccent },

  // Logout
  logoutRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.md, marginTop: spacing.md,
  },
  logoutText: { ...typography.label, color: colors.accent, letterSpacing: 1 },

  // Edit modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  modalTitle: { ...typography.dinnerTitle, color: colors.textPrimary },
  saveBtn: { ...typography.label, color: colors.accent, letterSpacing: 1 },
  modalBody: { paddingHorizontal: spacing.gutter, paddingTop: spacing.md },
  fieldLabel: { ...typography.label, color: colors.textMuted, letterSpacing: 1.4, marginBottom: spacing.xs, marginTop: spacing.md },
  field: {
    ...typography.body, color: colors.textPrimary,
    backgroundColor: colors.surface, borderRadius: radius.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.sm,
    borderWidth: borders.hairline, borderColor: colors.border,
  },
});
