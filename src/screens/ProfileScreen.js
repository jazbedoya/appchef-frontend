import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Dimensions, Alert, Switch, Platform,
  Modal, TextInput, Linking, ActivityIndicator, KeyboardAvoidingView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { selectUser, selectIsHost, logoutUser, loadStoredUser } from '../store/authSlice';
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

  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', bio: '', city: '' });
  const [hostForm, setHostForm] = useState({ specialties: '', kitchen_description: '' });
  const [pwForm,   setPwForm]   = useState({ current: '', next: '', confirm: '' });

  // ── Effects ──
  useEffect(() => {
    if (user?.id) {
      dispatch(fetchUserReservations({ userId: user.id }));
      dispatch(fetchEvents());
    }
  }, [dispatch, user?.id]);

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
      });
    }
  }, [user]);

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
      await userApi.put(`/users/${user.id}`, editForm);
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
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ══════════════════════════════════
            SECCIÓN 1 — HEADER
        ══════════════════════════════════ */}
        <View style={s.header}>
          {/* Left: Avatar + badge */}
          <View style={s.headerLeft}>
            <View style={s.avatarBox}>
              {profile.avatar_url ? (
                // eslint-disable-next-line react-native/no-inline-styles
                <img src={profile.avatar_url} style={{ width: 100, height: 100, borderRadius: 16, objectFit: 'cover' }} alt="avatar" />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={s.gourmetBadge}>
              <Text style={s.gourmetText}>GOURMET NIVEL {gourmetLevel}</Text>
            </View>
            {isHost && (
              <View style={s.hostPill}>
                <Icon name="restaurant" size={10} color={C.primary} />
                <Text style={s.hostPillText}>HOST</Text>
              </View>
            )}
          </View>

          {/* Right: name + bio + buttons */}
          <View style={s.headerRight}>
            <Text style={s.headerName}>{fullName}</Text>
            {user.username ? (
              <Text style={s.headerUsername}>@{user.username}</Text>
            ) : null}
            {profile.bio ? (
              <Text style={s.headerBio} numberOfLines={3}>{profile.bio}</Text>
            ) : (
              <Text style={s.headerBioEmpty}>Sin biografía aún</Text>
            )}
            {profile.city ? (
              <View style={s.cityRow}>
                <Icon name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                <Text style={s.cityText}>{profile.city}</Text>
              </View>
            ) : null}
            <View style={s.headerButtons}>
              <TouchableOpacity style={s.btnEdit} onPress={() => setEditVisible(true)}>
                <Text style={s.btnEditText}>Editar Perfil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.btnShare}>
                <Icon name="share-outline" size={14} color={C.white} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          <View style={s.statCell}>
            <Text style={s.statNum}>{attended}</Text>
            <Text style={s.statLbl}>Cenas</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.statCell}>
            <Text style={s.statNum}>{user.followers_count ?? 0}</Text>
            <Text style={s.statLbl}>Seguidores</Text>
          </View>
          <View style={s.statSep} />
          <View style={s.statCell}>
            <Text style={s.statNum}>{user.following_count ?? 0}</Text>
            <Text style={s.statLbl}>Siguiendo</Text>
          </View>
          {isHost && <>
            <View style={s.statSep} />
            <View style={s.statCell}>
              <Text style={s.statNum}>{profile.total_dinners_hosted ?? 0}</Text>
              <Text style={s.statLbl}>Organizadas</Text>
            </View>
          </>}
        </View>

        {/* ══════════════════════════════════
            SECCIÓN 2 — TRAYECTO GASTRONÓMICO
        ══════════════════════════════════ */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Text style={s.sectionTitle}>Trayecto Gastronómico</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Inicio')}>
              <Text style={s.sectionLink}>Ver todo →</Text>
            </TouchableOpacity>
          </View>

          {/* Main card + achievement badge row */}
          <View style={s.trayectoRow}>
            {/* Main card — próxima reserva */}
            <LinearGradient
              colors={['#2C3E2D', '#1a2e1b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.nextCard}
            >
              <Text style={s.nextLabel}>PRÓXIMA RESERVA</Text>
              {nextReservation ? (
                <>
                  <Text style={s.nextTitle} numberOfLines={2}>
                    {nextReservation.confirmation_code
                      ? `Reserva #${nextReservation.confirmation_code}`
                      : 'Cena confirmada'}
                  </Text>
                  <Text style={s.nextMeta}>
                    {nextReservation.party_size} {nextReservation.party_size === 1 ? 'invitado' : 'invitados'}
                    {' · '}{nextReservation.status === 'confirmed' ? 'Confirmada' : 'Pendiente'}
                  </Text>
                  <View style={s.participantRow}>
                    {[...Array(Math.min(nextReservation.party_size || 1, 4))].map((_, i) => (
                      <View key={i} style={[s.participantDot, { marginLeft: i > 0 ? -8 : 0 }]}>
                        <Text style={s.participantDotText}>{String.fromCharCode(65 + i)}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity style={s.prepareBtn}>
                    <Text style={s.prepareBtnText}>PREPARAR INVITACIÓN</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={s.nextTitle}>Sin próximas cenas</Text>
                  <Text style={s.nextMeta}>Explora eventos disponibles</Text>
                  <TouchableOpacity style={s.prepareBtn} onPress={() => navigation.navigate('Inicio')}>
                    <Text style={s.prepareBtnText}>EXPLORAR EVENTOS</Text>
                  </TouchableOpacity>
                </>
              )}
            </LinearGradient>

            {/* Achievement badge card */}
            <View style={s.achieveCard}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>
                {gourmetLevel >= 5 ? '🏆' : gourmetLevel >= 3 ? '⭐' : '🍽️'}
              </Text>
              <Text style={s.achieveTitle}>
                {gourmetLevel >= 5 ? 'Gourmet élite' : gourmetLevel >= 3 ? 'Comensal habitual' : 'Recién llegado'}
              </Text>
              <Text style={s.achieveSub}>
                {attended === 0 ? 'Reserva tu primera cena' : `${attended} cena${attended > 1 ? 's' : ''} asistida${attended > 1 ? 's' : ''}`}
              </Text>
            </View>
          </View>

          {/* Past dinners horizontal scroll */}
          {pastDinners.length > 0 && (
            <>
              <Text style={s.pastTitle}>Cenas pasadas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.pastScroll}>
                {pastDinners.map((r, i) => (
                  <LinearGradient
                    key={r.id}
                    colors={PAST_GRADIENTS[i % PAST_GRADIENTS.length]}
                    style={s.pastCard}
                  >
                    <Text style={s.pastDate}>{fmtDate(r.created_at)}</Text>
                    <Text style={s.pastName} numberOfLines={2}>
                      {r.confirmation_code ? `#${r.confirmation_code}` : 'Cena completada'}
                    </Text>
                  </LinearGradient>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* ══════════════════════════════════
            SECCIÓN 3 — DOS COLUMNAS
        ══════════════════════════════════ */}
        <View style={s.twoCol}>

          {/* Left — Experiencias Guardadas */}
          <View style={s.colLeft}>
            <Text style={s.colTitle}>Experiencias{'\n'}Guardadas</Text>
            {savedEvents.length === 0 ? (
              <View style={s.emptyCol}>
                <Icon name="bookmark-outline" size={28} color={C.muted} />
                <Text style={s.emptyColText}>Sin favoritos{'\n'}aún</Text>
              </View>
            ) : (
              savedEvents.map(ev => (
                <TouchableOpacity
                  key={ev.id}
                  style={s.savedCard}
                  onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}
                >
                  {Platform.OS === 'web' ? (
                    // eslint-disable-next-line react-native/no-inline-styles
                    <img
                      src={getEventImg(ev)}
                      alt={ev.title}
                      style={{ width: 80, height: 80, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <View style={s.savedImgFallback}>
                      <Text style={{ fontSize: 28 }}>🍽️</Text>
                    </View>
                  )}
                  <View style={s.savedInfo}>
                    <Text style={s.savedName} numberOfLines={2}>{ev.title}</Text>
                    <Text style={s.savedSub} numberOfLines={1}>
                      {ev.cuisine_type?.[0] || ''}{ev.city ? ` · ${ev.city}` : ''}
                    </Text>
                    <View style={s.savedBottom}>
                      <Stars rating={4} size={10} />
                      <Text style={s.savedSpots}>
                        {ev.max_guests ? `${ev.max_guests - (ev.confirmed_guests || 0)} plazas` : ''}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* Right — Mis Reseñas */}
          <View style={s.colRight}>
            <Text style={s.colTitle}>Mis{'\n'}Reseñas</Text>
            {reviews.length === 0 ? (
              <View style={s.emptyCol}>
                <Icon name="star-outline" size={28} color={C.muted} />
                <Text style={s.emptyColText}>Sin reseñas{'\n'}aún</Text>
              </View>
            ) : (
              reviews.map(r => (
                <View key={r.id} style={s.reviewCard}>
                  <View style={s.reviewTop}>
                    <Text style={s.reviewRestaurant}>{r.event_title?.toUpperCase() || 'CENA'}</Text>
                    <Text style={s.reviewAgo}>{weeksAgo(r.created_at)}</Text>
                  </View>
                  <Text style={s.reviewText}>"{r.comment}"</Text>
                  <Stars rating={r.rating} size={12} />
                </View>
              ))
            )}
          </View>
        </View>

        {/* ══════════════════════════════════
            SECCIÓN HOST — MIS CENAS
        ══════════════════════════════════ */}
        {isHost && (
          <View style={s.section}>
            <View style={s.sectionTitleRow}>
              <Text style={s.sectionTitle}>Mis cenas publicadas</Text>
              <TouchableOpacity onPress={() => navigation.navigate('CreateEvent')}>
                <Text style={s.sectionLink}>+ Crear →</Text>
              </TouchableOpacity>
            </View>
            {hostEvents.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20, gap: 10 }}>
                <Icon name="restaurant-outline" size={32} color={C.muted} />
                <Text style={{ fontFamily: SANS, fontSize: 14, color: C.muted, textAlign: 'center' }}>
                  Aún no has publicado ninguna cena.{'\n'}¡Crea tu primera experiencia!
                </Text>
                <TouchableOpacity
                  style={{ backgroundColor: C.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 }}
                  onPress={() => navigation.navigate('CreateEvent')}
                >
                  <Text style={{ fontFamily: SANS, color: C.accent, fontWeight: '700', fontSize: 13 }}>Crear cena</Text>
                </TouchableOpacity>
              </View>
            ) : (
              hostEvents.map(ev => (
                <TouchableOpacity
                  key={ev.id}
                  style={s.hostEventCard}
                  onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}
                >
                  {Platform.OS === 'web' ? (
                    <img
                      src={getEventImg(ev)}
                      alt={ev.title}
                      style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 24 }}>🍽️</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontFamily: SANS, fontSize: 14, fontWeight: '700', color: C.text }} numberOfLines={1}>{ev.title}</Text>
                    <Text style={{ fontFamily: SANS, fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {fmtDate(ev.event_date)}  ·  {ev.city}
                    </Text>
                    <Text style={{ fontFamily: SANS, fontSize: 12, color: C.muted }}>
                      {ev.confirmed_guests}/{ev.max_guests} plazas  ·  {ev.status}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={{ fontFamily: SANS, fontSize: 14, fontWeight: '700', color: C.accent }}>
                      €{parseFloat(ev.price_per_person || 0).toFixed(0)}
                    </Text>
                    <View style={{ backgroundColor: ev.status === 'published' ? '#E8F5E9' : '#F5F5F5', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontFamily: SANS, fontSize: 10, fontWeight: '700', color: ev.status === 'published' ? '#2E7D32' : C.muted }}>
                        {ev.status === 'published' ? 'ACTIVA' : ev.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ══════════════════════════════════
            OPCIONES ADICIONALES
        ══════════════════════════════════ */}
        <View style={s.optionsSection}>
          {[
            { icon: 'settings-outline',       label: 'Ajustes',          onPress: () => setSettingsVisible(true) },
            { icon: 'help-circle-outline',    label: 'Ayuda y soporte',  onPress: () => setHelpVisible(true) },
            ...(!isHost ? [{ icon: 'restaurant-outline', label: 'Convertirme en Host', onPress: () => navigation.navigate('CreateEvent'), accent: true }] : []),
            { icon: 'log-out-outline',        label: 'Cerrar sesión',    onPress: handleLogout, danger: true },
          ].map((item, i, arr) => (
            <TouchableOpacity
              key={item.label}
              style={[s.optionRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}
              onPress={item.onPress}
            >
              <Icon
                name={item.icon}
                size={20}
                color={item.danger ? '#C0392B' : item.accent ? C.primary : C.muted}
              />
              <Text style={[
                s.optionLabel,
                item.danger && { color: '#C0392B' },
                item.accent && { color: C.primary, fontWeight: '600' },
              ]}>
                {item.label}
              </Text>
              <Icon name="chevron-forward" size={16} color={C.border} />
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
          <ModalField label="Ciudad"   value={editForm.city}       onChangeText={v => setEditForm(f => ({ ...f, city:       v }))} placeholder="Ej: Madrid" />
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
  // ── Header ──
  header: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 0,
    paddingHorizontal: 20,
    gap: 16,
  },
  headerLeft: { alignItems: 'center', gap: 8 },
  avatarBox: {
    width: 100, height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.accent,
  },
  avatarFallback: {
    width: 100, height: 100,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: SERIF,
    fontSize: 36,
    fontWeight: '600',
    color: C.primary,
  },
  gourmetBadge: {
    backgroundColor: C.accent,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  gourmetText: {
    fontFamily: SANS,
    fontSize: 9,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 1,
  },
  hostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  hostPillText: {
    fontFamily: SANS,
    fontSize: 9,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1,
  },

  headerRight: { flex: 1, paddingTop: 4, paddingBottom: 20, gap: 6 },
  headerName: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: '600',
    color: C.white,
    lineHeight: 30,
  },
  headerUsername: {
    fontFamily: SANS,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  headerBio: {
    fontFamily: SANS,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 19,
  },
  headerBioEmpty: {
    fontFamily: SANS,
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    fontStyle: 'italic',
  },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cityText: { fontFamily: SANS, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  btnEdit: {
    backgroundColor: C.accent,
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  btnEditText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  btnShare: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats strip ──
  statsStrip: {
    backgroundColor: C.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  statCell: { flex: 1, alignItems: 'center' },
  statNum: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: '600',
    color: C.white,
  },
  statLbl: {
    fontFamily: SANS,
    fontSize: 11,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
  statSep: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center' },

  // ── Section common ──
  section: { padding: 20, paddingBottom: 0 },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
  },
  sectionLink: {
    fontFamily: SANS,
    fontSize: 13,
    color: C.accent,
    fontWeight: '600',
  },

  // ── Trayecto row ──
  trayectoRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  nextCard: {
    flex: 0.60,
    borderRadius: 16,
    padding: 18,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  nextLabel: {
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  nextTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '600',
    color: C.white,
    lineHeight: 24,
    flex: 1,
  },
  nextMeta: {
    fontFamily: SANS,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
    marginBottom: 10,
  },
  participantRow: { flexDirection: 'row', marginBottom: 12 },
  participantDot: {
    width: 28, height: 28,
    borderRadius: 14,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: C.primary,
  },
  participantDotText: {
    fontFamily: SANS,
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  prepareBtn: {
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  prepareBtnText: {
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: '700',
    color: C.accent,
    letterSpacing: 1,
  },

  // Achievement card
  achieveCard: {
    flex: 0.40,
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  achieveTitle: {
    fontFamily: SERIF,
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
    textAlign: 'center',
    marginBottom: 4,
  },
  achieveSub: {
    fontFamily: SANS,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
  },

  // Past dinners
  pastTitle: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  pastScroll: { marginBottom: 20 },
  pastCard: {
    width: 120,
    height: 80,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    justifyContent: 'space-between',
  },
  pastDate: {
    fontFamily: SANS,
    fontSize: 10,
    color: C.accent,
    fontWeight: '600',
  },
  pastName: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.white,
    fontWeight: '600',
  },

  // ── Two columns ──
  twoCol: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
    alignItems: 'flex-start',
  },
  colLeft:  { flex: 0.55 },
  colRight: { flex: 0.45 },
  colTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
    marginBottom: 12,
    lineHeight: 22,
  },
  emptyCol: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  emptyColText: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Saved cards
  savedCard: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 10,
    marginBottom: 10,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  savedImgFallback: {
    width: 80, height: 80,
    borderRadius: 12,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  savedInfo: { flex: 1, justifyContent: 'space-between' },
  savedName: {
    fontFamily: SANS,
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    lineHeight: 18,
  },
  savedSub: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.muted,
  },
  savedBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savedSpots: { fontFamily: SANS, fontSize: 11, color: C.muted },

  // Review cards
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingBottom: 14,
    marginBottom: 14,
    gap: 6,
  },
  reviewTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewRestaurant: {
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: '700',
    color: C.text,
    letterSpacing: 1,
    flex: 1,
  },
  reviewAgo: {
    fontFamily: SANS,
    fontSize: 10,
    color: C.muted,
  },
  reviewText: {
    fontFamily: SERIF,
    fontSize: 13,
    color: C.text,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // ── Host event card ──
  hostEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },

  // ── Options section ──
  optionsSection: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: C.white,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 14,
  },
  optionLabel: {
    fontFamily: SANS,
    fontSize: 15,
    color: C.text,
    flex: 1,
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
