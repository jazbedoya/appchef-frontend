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
import eventsService from '../services/eventsService';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import RatingStars from '../components/RatingStars';

// ─── Component ───

export default function ProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const isHost = useSelector(selectIsHost);
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ total: 0, average_rating: null });
  const [editAvatar, setEditAvatar] = useState(null);

  useEffect(() => {
    if (user?.id) {
      eventsService.getUserReviews(user.id).then(d => {
        setReviews(d.reviews || []);
        setReviewMeta({ total: d.total, average_rating: d.average_rating });
      }).catch(() => {});
    }
    }, [dispatch, user?.id]);

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

        {/* ── Followers / Following ── */}
        <View style={s.followRow}>
          <Pressable onPress={() => navigation.navigate('FollowList', { userId: user.id, mode: 'followers' })}>
            <Text style={s.followTap}>
              <Text style={s.followNum}>{user?.followers_count || 0}</Text>
              <Text style={s.followLabel}> seguidores</Text>
            </Text>
          </Pressable>
          <Text style={s.followSep}>  ·  </Text>
          <Pressable onPress={() => navigation.navigate('FollowList', { userId: user.id, mode: 'following' })}>
            <Text style={s.followTap}>
              <Text style={s.followNum}>{user?.following_count || 0}</Text>
              <Text style={s.followLabel}> siguiendo</Text>
            </Text>
          </Pressable>
        </View>

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

        {/* ── Mis cenas ── */}
        <Pressable style={s.misCenasBtn} onPress={() => navigation.navigate('MisCenas')}>
          <Ionicons name="calendar-outline" size={20} color={colors.textPrimary} />
          <Text style={s.misCenasText}>Mis cenas</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
        <View style={s.rule} />

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
  followRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.gutter, marginTop: spacing.sm },
  followTap: {},
  followNum: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 15 },
  followLabel: { ...typography.body, color: colors.textMuted, fontSize: 13 },
  followSep: { ...typography.body, color: colors.textMuted, fontSize: 13 },

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

  // Mis cenas button
  misCenasBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.md,
  },
  misCenasText: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 17, flex: 1 },

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
