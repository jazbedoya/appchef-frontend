import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, Alert, Switch, Platform, Image,
  Modal, TextInput, Linking, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/core';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { selectUser, selectIsHost, logoutUser, loadStoredUser, setUser } from '../store/authSlice';
import { fetchUserReservations, selectMyReservations, fetchEvents, selectEvents } from '../store/eventsSlice';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';

// ─── Font injection (web only) ───
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('gourmet-fonts')) {
  const link = document.createElement('link');
  link.id = 'gourmet-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap';
  document.head.appendChild(link);
}

const { width: W } = Dimensions.get('window');

// ─── Design tokens ───
const C = {
  primary:  '#2C3E2D',
  accent:   '#D4A853',
  surface:  '#FDFAF5',
  text:     '#1C1C1C',
  muted:    '#7A7A6E',
  border:   '#F0EBE0',
  white:    '#FFFFFF',
  card:     '#FFFFFF',
};
const SERIF = Platform.OS === 'web' ? "'Cormorant Garamond', serif" : 'serif';
const SANS  = Platform.OS === 'web' ? "'DM Sans', sans-serif"        : undefined;

const PAST_GRADIENTS = [
  ['#2C3E2D', '#1a2e1b'],
  ['#3D2B1F', '#2a1a10'],
  ['#1F2D3D', '#101a2a'],
];

const CUISINE_IMG = {
  Italiana:     'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&q=80',
  Japonesa:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=300&q=80',
  Vegana:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&q=80',
  Española:     'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=300&q=80',
  Mediterránea: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=300&q=80',
  Marroquí:     'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=300&q=80',
};
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=300&q=80';

// ─── Helpers ───
const getEventImg = (e) =>
  e?.cover_image_url || (e?.cuisine_type?.[0] && CUISINE_IMG[e.cuisine_type[0]]) || DEFAULT_IMG;

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' });
};
const fmtTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};
const weeksAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const w = Math.floor(diff / (7 * 24 * 3600 * 1000));
  return w === 0 ? 'Esta semana' : `Hace ${w} semana${w > 1 ? 's' : ''}`;
};

// ─── Shared modal shell (design unchanged) ───
const ModalShell = ({ visible, onClose, title, children }) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={ms.overlay}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={ms.card}>
        <View style={ms.header}>
          <Text style={ms.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={ms.close}>
            <Icon name="close" size={22} color={C.muted} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </KeyboardAvoidingView>
    </View>
  </Modal>
);

const ModalField = ({ label, value, onChangeText, placeholder, multiline, secureTextEntry }) => (
  <View style={ms.fieldGroup}>
    <Text style={ms.fieldLabel}>{label}</Text>
    <TextInput
      style={[ms.fieldInput, multiline && ms.fieldInputMulti]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || ''}
      placeholderTextColor={C.muted}
      multiline={multiline}
      secureTextEntry={secureTextEntry}
    />
  </View>
);

// ─── Star rating ───
const Stars = ({ rating = 0, size = 12 }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map(i => (
      <Icon key={i} name={i <= rating ? 'star' : 'star-outline'} size={size} color={C.accent} />
    ))}
  </View>
);

// ═══════════════════════════════════════════
//   MAIN COMPONENT
// ═══════════════════════════════════════════
const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user        = useSelector(selectUser);
  const isHost      = useSelector(selectIsHost);
  const reservations = useSelector(selectMyReservations);
  const allEvents   = useSelector(selectEvents);

  // ── State ──
  const [reviews,            setReviews]            = useState([]);
  const [isLoadingReviews,   setIsLoadingReviews]   = useState(false);
  const [hostEvents,         setHostEvents]         = useState([]);
  const [editVisible,        setEditVisible]        = useState(false);
  const [helpVisible,        setHelpVisible]        = useState(false);
  const [becomeHostVisible,  setBecomeHostVisible]  = useState(false);
  const [settingsVisible,    setSettingsVisible]    = useState(false);
  const [changePwVisible,    setChangePwVisible]    = useState(false);
  const [isSaving,           setIsSaving]           = useState(false);
  const [notifEnabled,       setNotifEnabled]       = useState(true);
  const [language,           setLanguage]           = useState('es');
  const [profilePublic,      setProfilePublic]      = useState(true);

  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', bio: '', city: '', latitude: null, longitude: null });
  const [geocoding, setGeocoding] = useState(false);
  const [hostForm, setHostForm] = useState({ specialties: '', kitchen_description: '' });
  const [pwForm,   setPwForm]   = useState({ current: '', next: '', confirm: '' });
  const [activeTab, setActiveTab] = useState('Próximas');

  // ── Effects ──
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserReservations({ userId: user.id }));
      dispatch(fetchEvents());
    }
  }, [dispatch, user?.id]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      userApi.get('/users/me')
        .then(res => { if (!cancelled) dispatch(setUser(res.data)); })
        .catch(() => {});
      return () => { cancelled = true; };
    }, [dispatch]),
  );

  useEffect(() => {
    if (!isHost) return;
    import('../services/api').then(({ reservationApi }) => {
      reservationApi.get('/events/host/my-events')
        .then(res => setHostEvents(res.data.events || []))
        .catch(() => {});
    });
  }, [isHost]);

  useEffect(() => {
    if (user?.profile) {
      setEditForm({
        first_name: user.profile.first_name || '',
        last_name:  user.profile.last_name  || '',
        bio:        user.profile.bio        || '',
        city:       user.profile.city       || '',
        latitude:   user.profile.latitude   || null,
        longitude:  user.profile.longitude  || null,
      });
    }
  }, [user]);

  const geocodeCity = async (cityVal) => {
    if (!cityVal?.trim()) return null;
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityVal)}&format=json&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'AppChef/1.0' } });
      const data = await res.json();
      if (data.length > 0) {
        const coords = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
        setEditForm(f => ({ ...f, ...coords }));
        return coords;
      }
    } catch (_) {}
    finally { setGeocoding(false); }
    return null;
  };

  if (!user) return null;

  // ── Derived data ──
  const profile  = user.profile || {};
  const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.username;
  const initials = ((profile.first_name?.[0] || '') + (profile.last_name?.[0] || '')).toUpperCase()
                   || user.username?.[0]?.toUpperCase() || '?';

  const attended     = profile.total_dinners_attended || 0;
  const gourmetLevel = Math.min(Math.floor(attended / 3) + 1, 10);

  const upcomingReservations = reservations.filter(r => ['confirmed', 'pending'].includes(r.status));
  const nextReservation      = upcomingReservations[0] || null;
  const pastDinners          = reservations.filter(r => r.status === 'completed').slice(0, 3);
  const savedEvents          = allEvents.slice(0, 3); // repurposed: nearby published events

  // ── Handlers ──
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      let lat = editForm.latitude;
      let lng = editForm.longitude;

      // Si hay ciudad pero sin coordenadas, geocodificar ahora y usar el resultado directo
      if (editForm.city && !lat) {
        const coords = await geocodeCity(editForm.city);
        if (coords) { lat = coords.latitude; lng = coords.longitude; }
      }

      const payload = {
        first_name: editForm.first_name,
        last_name:  editForm.last_name,
        bio:        editForm.bio,
        city:       editForm.city,
        ...(lat && lng ? { latitude: lat, longitude: lng } : {}),
      };

      await userApi.put(`/users/${user.id}`, payload);
      await dispatch(loadStoredUser());
      setEditVisible(false);
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'No se pudo guardar el perfil');
    } finally { setIsSaving(false); }
  };

  const handleBecomeHost = async () => {
    if (!hostForm.kitchen_description.trim()) {
      Alert.alert('Falta información', 'Por favor describe tu espacio.');
      return;
    }
    setIsSaving(true);
    try {
      await userApi.post(`/users/${user.id}/become-host`, {
        specialties: hostForm.specialties.split(',').map(s => s.trim()).filter(Boolean),
        kitchen_description: hostForm.kitchen_description,
        dietary_accommodations: [],
        languages_spoken: [],
      });
      await dispatch(loadStoredUser());
      setBecomeHostVisible(false);
      Alert.alert('¡Bienvenido!', 'Tu cuenta de host se ha activado.');
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'No se pudo completar el registro');
    } finally { setIsSaving(false); }
  };

  const handleChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { Alert.alert('Error', 'Las contraseñas no coinciden'); return; }
    if (pwForm.next.length < 8)         { Alert.alert('Error', 'Mínimo 8 caracteres');          return; }
    setIsSaving(true);
    try {
      await userApi.post('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.next });
      setChangePwVisible(false);
      setPwForm({ current: '', next: '', confirm: '' });
      Alert.alert('Listo', 'Contraseña actualizada');
    } catch (err) {
      Alert.alert('Error', err.userMessage || 'No se pudo cambiar la contraseña');
    } finally { setIsSaving(false); }
  };

  const handleDeleteAccount = () => {
    const doDelete = () => userApi.delete('/users/me')
      .then(() => dispatch(logoutUser()))
      .catch(err => Alert.alert('Error', err.userMessage || 'No se pudo eliminar la cuenta'));
    if (Platform.OS === 'web') {
      if (window.confirm('¿Eliminar tu cuenta permanentemente?')) doDelete();
      return;
    }
    Alert.alert('Eliminar cuenta', '¿Estás seguro? Es irreversible.',
      [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: doDelete }]);
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Cerrar sesión?')) dispatch(logoutUser());
      return;
    }
    Alert.alert('Sign Out', 'Are you sure?',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: () => dispatch(logoutUser()) }]);
  };

  // ─────────────────────────────────────────
  //   RENDER
  // ─────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F0E8' }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════
            HEADER — Eatwith style
        ══════════════════════════════════ */}
        <View style={s.headerCard}>
          <View style={{ alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 56 : 36 }}>

            {/* Avatar */}
            <View style={{ position: 'relative' }}>
              {profile.avatar_url && Platform.OS === 'web' ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  style={{ width: 100, height: 100, borderRadius: 50, border: '3px solid #D4A853', objectFit: 'cover' }}
                />
              ) : (
                <View style={s.avatarCircle}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
              <View style={s.onlineDot} />
            </View>

            {/* Name */}
            <Text style={s.heroName}>{fullName}</Text>
            <Text style={s.heroUsername}>@{user.username}</Text>

            {/* Gourmet level badge */}
            <View style={s.gourmetBadge}>
              <Text style={{ fontSize: 14, marginRight: 4 }}>⭐</Text>
              <Text style={s.gourmetText}>GOURMET NIVEL {gourmetLevel}</Text>
            </View>

            {/* Bio */}
            {profile.bio ? (
              <Text style={s.heroBio}>"{profile.bio}"</Text>
            ) : (
              <TouchableOpacity onPress={() => setEditVisible(true)}>
                <Text style={s.heroBioEmpty}>+ Añade una biografía</Text>
              </TouchableOpacity>
            )}

            {/* Action buttons */}
            <View style={s.heroButtons}>
              <TouchableOpacity style={s.btnPrimary} onPress={() => setEditVisible(true)} activeOpacity={0.85}>
                <Text style={s.btnPrimaryText}>Editar perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnSecondary} activeOpacity={0.85}>
                <Text style={s.btnSecondaryText}>Compartir</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats row — 3 columns Eatwith style */}
          <View style={s.statsRow}>
            {[
              { label: 'Cenas',      value: attended },
              { label: 'Seguidores', value: user.followers_count ?? 0 },
              { label: 'Siguiendo',  value: user.following_count ?? 0, onPress: () => navigation.navigate('Following') },
            ].map((stat, i) => {
              const Cell = stat.onPress ? TouchableOpacity : View;
              return (
                <Cell
                  key={stat.label}
                  style={[s.statCell, i < 2 && s.statCellBorder]}
                  onPress={stat.onPress}
                  activeOpacity={stat.onPress ? 0.7 : 1}
                >
                  <Text style={s.statNum}>{stat.value}</Text>
                  <Text style={s.statLbl}>{stat.label}</Text>
                </Cell>
              );
            })}
          </View>
        </View>

        {isHost && (
          <TouchableOpacity
            style={s.hostBookingsBtn}
            onPress={() => navigation.navigate('HostBookings')}
            activeOpacity={0.85}
          >
            <Icon name="calendar-outline" size={18} color={colors.white} style={{ marginRight: 8 }} />
            <Text style={s.hostBookingsBtnText}>Reservas recibidas</Text>
            <Icon name="chevron-forward" size={18} color={colors.white} style={{ marginLeft: 'auto' }} />
          </TouchableOpacity>
        )}

        {/* ══════════════════════════════════
            TABS
        ══════════════════════════════════ */}
        <View style={s.tabBar}>
          {['Próximas', 'Historial', 'Reseñas'].map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[s.tabItem, activeTab === tab && s.tabItemActive]}
            >
              <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ══════════════════════════════════
            TAB CONTENT
        ══════════════════════════════════ */}
        <View style={s.tabContent}>

          {/* ── Próximas ── */}
          {activeTab === 'Próximas' && (
            upcomingReservations.length > 0
              ? upcomingReservations.map(res => (
                <TouchableOpacity
                  key={res.id}
                  style={s.reservationCard}
                  onPress={() => navigation.navigate('EventDetail', { eventId: res.event_id })}
                  activeOpacity={0.88}
                >
                  {Platform.OS === 'web' ? (
                    <img src={getEventImg(res.event)} alt="" style={{ width: 72, height: 72, borderRadius: 12, marginRight: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <View style={s.resImgFallback}><Text style={{ fontSize: 22 }}>🍽️</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.resTitle} numberOfLines={2}>
                      {res.event?.title || `Reserva #${res.confirmation_code}`}
                    </Text>
                    <Text style={s.resMeta}>
                      📅 {fmtDate(res.event?.event_date || res.created_at)}{res.event?.city ? ` · ${res.event.city}` : ''}
                    </Text>
                    <View style={[s.resStatusBadge, { backgroundColor: res.status === 'confirmed' ? '#EAF3DE' : '#FFF8EC' }]}>
                      <Text style={[s.resStatusText, { color: res.status === 'confirmed' ? '#3B6D11' : '#C9963A' }]}>
                        {res.status === 'confirmed' ? '✓ CONFIRMADA' : '⏳ PENDIENTE'}
                      </Text>
                    </View>
                  </View>
                  {res.event?.price_per_person != null && (
                    <Text style={s.resPrice}>€{parseFloat(res.event.price_per_person).toFixed(0)}</Text>
                  )}
                </TouchableOpacity>
              ))
              : (
                <View style={s.emptyTab}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🍽️</Text>
                  <Text style={s.emptyTitle}>Sin cenas próximas</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Inicio')}>
                    <Text style={s.emptyLink}>Explorar experiencias →</Text>
                  </TouchableOpacity>
                </View>
              )
          )}

          {/* ── Historial ── */}
          {activeTab === 'Historial' && (
            pastDinners.length > 0
              ? pastDinners.map(res => (
                <TouchableOpacity
                  key={res.id}
                  style={s.reservationCard}
                  onPress={() => navigation.navigate('EventDetail', { eventId: res.event_id })}
                  activeOpacity={0.88}
                >
                  {Platform.OS === 'web' ? (
                    <img src={getEventImg(res.event)} alt="" style={{ width: 72, height: 72, borderRadius: 12, marginRight: 12, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <View style={s.resImgFallback}><Text style={{ fontSize: 22 }}>🍽️</Text></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.resTitle} numberOfLines={2}>
                      {res.event?.title || `Reserva #${res.confirmation_code}`}
                    </Text>
                    <Text style={s.resMeta}>📅 {fmtDate(res.event?.event_date || res.created_at)}</Text>
                    <View style={[s.resStatusBadge, { backgroundColor: '#F0F0F0' }]}>
                      <Text style={[s.resStatusText, { color: '#7A7A6E' }]}>✓ COMPLETADA</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
              : (
                <View style={s.emptyTab}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>📖</Text>
                  <Text style={s.emptyTitle}>Sin historial aún</Text>
                  <Text style={s.emptySubtitle}>Tus cenas completadas aparecerán aquí</Text>
                </View>
              )
          )}

          {/* ── Reseñas ── */}
          {activeTab === 'Reseñas' && (
            reviews.length > 0
              ? reviews.map(review => (
                <View key={review.id} style={s.reviewCard}>
                  <View style={s.reviewTop}>
                    <Text style={s.reviewEvent}>{review.event_name}</Text>
                    <Text style={s.reviewAgo}>{weeksAgo(review.created_at)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    {[1,2,3,4,5].map(star => (
                      <Text key={star} style={{ fontSize: 14, color: star <= review.rating ? C.accent : '#E2D9C8' }}>★</Text>
                    ))}
                  </View>
                  {review.comment && (
                    <Text style={s.reviewText}>"{review.comment}"</Text>
                  )}
                </View>
              ))
              : (
                <View style={s.emptyTab}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>⭐</Text>
                  <Text style={s.emptyTitle}>Sin reseñas aún</Text>
                  <Text style={s.emptySubtitle}>Las valoraciones de tus cenas aparecerán aquí</Text>
                </View>
              )
          )}
        </View>

        {/* ══════════════════════════════════
            MENÚ — Eatwith clean style
        ══════════════════════════════════ */}
        <View style={{ marginTop: 8, backgroundColor: C.white }}>
          {[
            ...(!isHost ? [{ icon: '🏠', label: 'Convertirme en Host', color: C.primary, onPress: () => setBecomeHostVisible(true) }] : []),
            ...(isHost ? [{ icon: '💳', label: 'Cobrar como anfitrión', onPress: () => navigation.navigate('HostPaymentsSetup') }] : []),
            { icon: '⚙️', label: 'Configuración', onPress: () => setSettingsVisible(true) },
            { icon: '❓', label: 'Ayuda y soporte', onPress: () => setHelpVisible(true) },
            { icon: '🚪', label: 'Cerrar sesión', color: '#E8593C', onPress: handleLogout },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.onPress}
              style={[s.menuRow, i < arr.length - 1 && s.menuRowBorder]}
              activeOpacity={0.7}
            >
              <Text style={s.menuIcon}>{item.icon}</Text>
              <Text style={[s.menuLabel, item.color && { color: item.color }]}>{item.label}</Text>
              <Text style={s.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ══════════════════════════════════
          MODAL: Editar Perfil
      ══════════════════════════════════ */}
      <ModalShell visible={editVisible} onClose={() => setEditVisible(false)} title="Editar perfil">
        <View style={ms.body}>
          <ModalField label="Nombre"   value={editForm.first_name} onChangeText={v => setEditForm(f => ({ ...f, first_name: v }))} placeholder="Tu nombre" />
          <ModalField label="Apellido" value={editForm.last_name}  onChangeText={v => setEditForm(f => ({ ...f, last_name:  v }))} placeholder="Tu apellido" />
          <ModalField label="Bio"      value={editForm.bio}        onChangeText={v => setEditForm(f => ({ ...f, bio:        v }))} placeholder="Cuéntanos algo sobre ti..." multiline />
          <View style={ms.fieldGroup}>
            <Text style={ms.fieldLabel}>Ciudad</Text>
            <TextInput
              style={ms.fieldInput}
              value={editForm.city}
              onChangeText={v => setEditForm(f => ({ ...f, city: v }))}
              onBlur={() => geocodeCity(editForm.city)}
              placeholder="Ej: Madrid"
              placeholderTextColor={C.muted}
            />
            {geocoding && <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>📍 Obteniendo coordenadas...</Text>}
            {!geocoding && editForm.latitude && (
              <Text style={{ fontSize: 12, color: C.accent, marginTop: 4 }}>
                📍 {editForm.latitude.toFixed(4)}, {editForm.longitude.toFixed(4)}
              </Text>
            )}
          </View>
          <TouchableOpacity style={[ms.btn, isSaving && ms.btnOff]} onPress={handleSaveProfile} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color={C.accent} /> : <Text style={ms.btnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </View>
      </ModalShell>

      {/* ══════════════════════════════════
          MODAL: Ajustes
      ══════════════════════════════════ */}
      <ModalShell visible={settingsVisible} onClose={() => setSettingsVisible(false)} title="Ajustes">
        <View style={ms.body}>
          {[
            { label: 'Notificaciones', value: notifEnabled, onChange: setNotifEnabled },
            { label: 'Perfil público',  value: profilePublic, onChange: setProfilePublic },
          ].map(item => (
            <View key={item.label} style={ms.settingRow}>
              <Text style={ms.settingLabel}>{item.label}</Text>
              <Switch value={item.value} onValueChange={item.onChange} trackColor={{ true: C.primary }} thumbColor={C.white} />
            </View>
          ))}
          <View style={ms.settingRow}>
            <Text style={ms.settingLabel}>Idioma</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {['es', 'en'].map(lang => (
                <TouchableOpacity key={lang}
                  style={[ms.langBtn, language === lang && ms.langBtnOn]}
                  onPress={() => setLanguage(lang)}
                >
                  <Text style={[ms.langText, language === lang && ms.langTextOn]}>
                    {lang === 'es' ? 'ES' : 'EN'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <TouchableOpacity style={ms.linkRow} onPress={() => { setSettingsVisible(false); setChangePwVisible(true); }}>
            <Icon name="lock-closed-outline" size={18} color={C.primary} />
            <Text style={ms.linkText}>Cambiar contraseña</Text>
            <Icon name="chevron-forward" size={16} color={C.muted} />
          </TouchableOpacity>
          <TouchableOpacity style={ms.linkRow} onPress={handleDeleteAccount}>
            <Icon name="trash-outline" size={18} color="#C0392B" />
            <Text style={[ms.linkText, { color: '#C0392B' }]}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </View>
      </ModalShell>

      {/* ══════════════════════════════════
          MODAL: Cambiar contraseña
      ══════════════════════════════════ */}
      <ModalShell visible={changePwVisible} onClose={() => setChangePwVisible(false)} title="Cambiar contraseña">
        <View style={ms.body}>
          <ModalField label="Contraseña actual"   value={pwForm.current}  onChangeText={v => setPwForm(f => ({ ...f, current:  v }))} placeholder="••••••••" secureTextEntry />
          <ModalField label="Nueva contraseña"    value={pwForm.next}     onChangeText={v => setPwForm(f => ({ ...f, next:     v }))} placeholder="Mínimo 8 caracteres" secureTextEntry />
          <ModalField label="Confirmar contraseña" value={pwForm.confirm} onChangeText={v => setPwForm(f => ({ ...f, confirm:  v }))} placeholder="Repite la nueva contraseña" secureTextEntry />
          <TouchableOpacity style={[ms.btn, isSaving && ms.btnOff]} onPress={handleChangePassword} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color={C.accent} /> : <Text style={ms.btnText}>Actualizar contraseña</Text>}
          </TouchableOpacity>
        </View>
      </ModalShell>

      {/* ══════════════════════════════════
          MODAL: Ayuda
      ══════════════════════════════════ */}
      <ModalShell visible={helpVisible} onClose={() => setHelpVisible(false)} title="Ayuda y soporte">
        <View style={ms.body}>
          <View style={ms.helpBlock}>
            <Icon name="mail-outline" size={32} color={C.primary} />
            <Text style={ms.helpTitle}>Contacta con nosotros</Text>
            <Text style={ms.helpSub}>Respondemos en menos de 24 horas.</Text>
          </View>
          <TouchableOpacity style={ms.btn} onPress={() => Linking.openURL('mailto:support@appchef.com')}>
            <Text style={ms.btnText}>Enviar mensaje</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:support@appchef.com')}>
            <Text style={[ms.helpSub, { color: C.accent, fontWeight: '600', textAlign: 'center', marginTop: 12 }]}>
              support@appchef.com
            </Text>
          </TouchableOpacity>
        </View>
      </ModalShell>

      {/* ══════════════════════════════════
          MODAL: Become a Host
      ══════════════════════════════════ */}
      <ModalShell visible={becomeHostVisible} onClose={() => setBecomeHostVisible(false)} title="Conviértete en Host">
        <View style={ms.body}>
          <Text style={ms.helpSub}>
            Comparte tu pasión por la cocina. Crea cenas íntimas y conecta con personas increíbles.
          </Text>
          <ModalField label="Especialidades (separadas por coma)" value={hostForm.specialties}          onChangeText={v => setHostForm(f => ({ ...f, specialties: v }))} placeholder="Italiana, Japonesa..." />
          <ModalField label="Describe tu espacio"                 value={hostForm.kitchen_description} onChangeText={v => setHostForm(f => ({ ...f, kitchen_description: v }))} placeholder="Una cocina acogedora..." multiline />
          <TouchableOpacity style={[ms.btn, isSaving && ms.btnOff]} onPress={handleBecomeHost} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color={C.accent} /> : <Text style={ms.btnText}>Activar cuenta de Host</Text>}
          </TouchableOpacity>
        </View>
      </ModalShell>
    </View>
  );
};

// ═══════════════════════════════════════════
//   STYLES — MAIN SCREEN
// ═══════════════════════════════════════════
const s = StyleSheet.create({
  // ── Header card ──
  headerCard: {
    backgroundColor: '#FFFFFF',
    paddingBottom: 0,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#D4A853',
    backgroundColor: 'rgba(212,168,83,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: SERIF,
    fontSize: 36,
    fontWeight: '600',
    color: '#D4A853',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  heroName: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: '600',
    color: '#1C1C1C',
    marginTop: 12,
    textAlign: 'center',
  },
  heroUsername: {
    fontFamily: SANS,
    fontSize: 14,
    color: '#7A7A6E',
    marginTop: 2,
  },
  gourmetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8EC',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F0C97A',
  },
  gourmetText: {
    fontFamily: SANS,
    fontSize: 12,
    fontWeight: '700',
    color: '#C9963A',
    letterSpacing: 0.5,
  },
  heroBio: {
    fontFamily: SANS,
    fontSize: 14,
    color: '#7A7A6E',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 32,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  heroBioEmpty: {
    fontFamily: SANS,
    fontSize: 13,
    color: '#B0A898',
    fontStyle: 'italic',
    marginTop: 10,
  },
  heroButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    marginBottom: 4,
  },
  btnPrimary: {
    backgroundColor: '#2C3E2D',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  btnPrimaryText: {
    fontFamily: SANS,
    color: '#D4A853',
    fontWeight: '700',
    fontSize: 13,
  },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: '#E2D9C8',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  btnSecondaryText: {
    fontFamily: SANS,
    color: '#2C3E2D',
    fontWeight: '600',
    fontSize: 13,
  },

  // ── Stats row ──
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0EBE0',
    marginTop: 24,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statCellBorder: {
    borderRightWidth: 1,
    borderRightColor: '#F0EBE0',
  },
  statNum: {
    fontFamily: SERIF,
    fontSize: 24,
    fontWeight: '600',
    color: '#1C1C1C',
  },
  statLbl: {
    fontFamily: SANS,
    fontSize: 12,
    color: '#7A7A6E',
    marginTop: 2,
  },

  hostBookingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2C3E2D',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  hostBookingsBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.3,
  },

  // ── Tabs ──
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0EBE0',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#2C3E2D',
  },
  tabText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '400',
    color: '#7A7A6E',
  },
  tabTextActive: {
    fontWeight: '700',
    color: '#2C3E2D',
  },

  // ── Tab content ──
  tabContent: {
    padding: 16,
    minHeight: 200,
  },

  // ── Reservation card ──
  reservationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resImgFallback: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  resTitle: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1C',
    lineHeight: 20,
  },
  resMeta: {
    fontFamily: SANS,
    fontSize: 12,
    color: '#7A7A6E',
    marginTop: 3,
  },
  resStatusBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  resStatusText: {
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: '700',
  },
  resPrice: {
    fontFamily: SERIF,
    fontSize: 16,
    color: '#D4A853',
    fontWeight: '700',
    marginLeft: 8,
  },

  // ── Empty tab state ──
  emptyTab: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1C',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: SANS,
    fontSize: 13,
    color: '#7A7A6E',
    textAlign: 'center',
  },
  emptyLink: {
    fontFamily: SANS,
    fontSize: 14,
    color: '#D4A853',
    fontWeight: '600',
    marginTop: 8,
  },

  // ── Review card ──
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  reviewTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  reviewEvent: {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: '700',
    color: '#2C3E2D',
    letterSpacing: 1,
    textTransform: 'uppercase',
    flex: 1,
  },
  reviewAgo: {
    fontFamily: SANS,
    fontSize: 11,
    color: '#B0A898',
  },
  reviewText: {
    fontFamily: SANS,
    fontSize: 14,
    color: '#1C1C1C',
    fontStyle: 'italic',
    lineHeight: 20,
  },

  // ── Menu ──
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E8',
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 14,
  },
  menuLabel: {
    fontFamily: SANS,
    flex: 1,
    fontSize: 15,
    color: '#1C1C1C',
    fontWeight: '500',
  },
  menuArrow: {
    color: '#B0A898',
    fontSize: 20,
    lineHeight: 22,
  },
});

// ═══════════════════════════════════════════
//   STYLES — MODALS (unchanged visual)
// ═══════════════════════════════════════════
const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontFamily: SERIF, fontSize: 20, fontWeight: '600', color: C.primary },
  close: { padding: 4 },
  body:  { padding: 20, gap: 14 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontFamily: SANS, fontSize: 13, color: C.muted },
  fieldInput: {
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontFamily: SANS,
    fontSize: 15,
    color: C.text,
  },
  fieldInputMulti: { minHeight: 90, textAlignVertical: 'top' },

  btn: {
    backgroundColor: C.primary,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnOff:  { opacity: 0.6 },
  btnText: { fontFamily: SANS, fontSize: 15, fontWeight: '600', color: C.accent },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  settingLabel: { fontFamily: SANS, fontSize: 15, color: C.text },
  langBtn: {
    paddingVertical: 6, paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  langBtnOn:   { backgroundColor: C.primary, borderColor: C.primary },
  langText:    { fontFamily: SANS, fontSize: 13, color: C.muted },
  langTextOn:  { color: C.white },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  linkText: { fontFamily: SANS, fontSize: 15, color: C.text, flex: 1 },

  helpBlock: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  helpTitle: { fontFamily: SERIF, fontSize: 18, fontWeight: '600', color: C.primary },
  helpSub:   { fontFamily: SANS, fontSize: 13, color: C.muted, textAlign: 'center' },
});

export default ProfileScreen;
