import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, ScrollView, StyleSheet,
  TouchableOpacity, TextInput, StatusBar, RefreshControl,
  Platform, Modal, ImageBackground, Pressable, Image, Animated,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';

import {
  fetchEvents, selectEvents, selectEventsLoading, selectEventsError,
} from '../store/eventsSlice';
import { selectUser } from '../store/authSlice';
import { getDistanceKm, formatDistance } from '../utils/geo';
import SkeletonCard from '../components/SkeletonCard';

// ─── Web font injection ───
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('gourmet-fonts')) {
  const link = document.createElement('link');
  link.id = 'gourmet-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
}

const SERIF = Platform.OS === 'web' ? "'Cormorant Garamond', serif" : 'serif';
const SANS  = Platform.OS === 'web' ? "'DM Sans', sans-serif" : undefined;

const C = {
  primary:  '#2C3E2D',
  accent:   '#D4A853',
  accentSoft: '#F5E6C0',
  surface:  '#FDFAF5',
  cream:    '#EDE8DF',
  text:     '#1C1C1C',
  muted:    '#7A7A6E',
  border:   '#F0EBE0',
  white:    '#FFFFFF',
  coral:    '#E8593C',
  coralSoft:'#FDECEA',
};

// ─── Cuisine filters ───
const CUISINE_FILTERS = [
  { id: 'all',         label: 'Todos',       emoji: '✨' },
  { id: 'Italiana',   label: 'Italiana',    emoji: '🍝' },
  { id: 'Japonesa',   label: 'Japonesa',    emoji: '🍱' },
  { id: 'Española',   label: 'Española',    emoji: '🥘' },
  { id: 'Vegana',     label: 'Vegana',      emoji: '🥗' },
  { id: 'Francesa',   label: 'Francesa',    emoji: '🥐' },
  { id: 'Mediterránea', label: 'Mediterránea', emoji: '🫒' },
];

const CUISINE_IMAGES = {
  Italiana:     'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  Japonesa:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  Vegana:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  Española:     'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
  Mediterránea: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
  Francesa:     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  default:      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
};

const getEventImage = (event) => {
  if (event.cover_image_url) return event.cover_image_url;
  const c = Array.isArray(event.cuisine_type) ? event.cuisine_type[0] : event.cuisine_type;
  return CUISINE_IMAGES[c] || CUISINE_IMAGES.default;
};

const getCategoryEmoji = (type) => {
  const c = Array.isArray(type) ? type[0] : type;
  const map = { 'Italiana': '🍝', 'Japonesa': '🍣', 'Vegana': '🥗', 'Española': '🥘', 'Mediterránea': '🫒', 'Francesa': '🥐' };
  return map[c] || '🍽️';
};

const getEventBadge = (event) => {
  const available = (event.max_guests || 10) - (event.confirmed_guests || 0);
  if (available <= 2) return { label: '🔥 MUY CODICIADO', bg: C.accent,    color: C.text  };
  if (available <= 5) return { label: '⚡ POCAS PLAZAS',  bg: C.coral,     color: C.white };
  const cuisine = Array.isArray(event.cuisine_type) ? event.cuisine_type[0] : event.cuisine_type;
  return { label: `🍽 ${cuisine || 'EXCLUSIVO'}`,         bg: C.primary,   color: C.white };
};

const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

// ─── Activities data ───
const FEATURED = {
  id: 'dinners',
  title: 'Cenas privadas',
  subtitle: 'Vive una cena íntima en casa de un desconocido',
  image: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
  tag: 'MÁS POPULAR',
  action: (nav, close) => { close(); nav.navigate('Inicio'); },
};

const GRID_CARDS = [
  {
    id: 'lunch',
    title: 'Almuerzos',
    subtitle: 'Comparte la mesa al mediodía',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80',
    isNew: false,
    action: (nav, close) => { close(); nav.navigate('Inicio'); },
  },
  {
    id: 'map',
    title: 'Explorar mapa',
    subtitle: 'Cenas cerca de ti',
    image: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80',
    isNew: false,
    action: (nav, close) => { close(); nav.navigate('Map'); },
  },
  {
    id: 'people',
    title: 'Personas cercanas',
    subtitle: 'Foodies cerca de ti',
    image: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=400&q=80',
    isNew: true,
    action: (nav, close) => { close(); nav.navigate('Map', { initialMode: 'people' }); },
  },
  {
    id: 'host',
    title: 'Ser anfitrión',
    subtitle: 'Organiza tu propia cena',
    image: 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&q=80',
    isNew: false,
    action: (nav, close) => { close(); nav.navigate('CreateEvent'); },
  },
  {
    id: 'chat',
    title: 'Mis chats',
    subtitle: 'Grupos de tus cenas',
    image: 'https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=400&q=80',
    isNew: false,
    bgColor: '#2C3E2D',
    action: (nav, close) => { close(); nav.navigate('Chat'); },
  },
  {
    id: 'profile',
    title: 'Mi perfil gourmet',
    subtitle: 'Reservas y valoraciones',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
    isNew: false,
    bgColor: '#1C2B1D',
    action: (nav, close) => { close(); nav.navigate('Profile'); },
  },
];

// ─── Grid card with press scale effect ───
const ActivityCard = ({ card, navigation, onClose }) => (
  <Pressable
    onPress={() => card.action(navigation, onClose)}
    style={({ pressed }) => [pm.gridCard, card.bgColor && { backgroundColor: card.bgColor }, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
  >
    <ImageBackground source={{ uri: card.image }} style={pm.gridImageBg} imageStyle={pm.gridImageStyle}>
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.68)']}
        style={pm.gridOverlay}
      >
        {card.isNew && (
          <View style={pm.newBadge}>
            <Text style={pm.newBadgeText}>NUEVO</Text>
          </View>
        )}
        <View style={pm.gridBottom}>
          <Text style={pm.gridTitle}>{card.title}</Text>
          <Text style={pm.gridSubtitle}>{card.subtitle}</Text>
        </View>
      </LinearGradient>
    </ImageBackground>
  </Pressable>
);

// ─── Activities Modal ───
const PlansModal = ({ visible, onClose, navigation }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0, tension: 65, friction: 11, useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  return (
  <Modal visible={visible} animationType="none" transparent onRequestClose={onClose}>
    <View style={pm.overlay}>
      <TouchableOpacity style={pm.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[pm.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={pm.handle} />

        <View style={pm.headerRow}>
          <View>
            <Text style={pm.title}>¿Qué quieres hacer?</Text>
            <Text style={pm.subtitle}>Elige tu aventura gastronómica</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={pm.closeBtn}>
            <Icon name="close" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 36, paddingTop: 4 }}>

          {/* ── Featured card (full width) ── */}
          <Pressable
            onPress={() => FEATURED.action(navigation, onClose)}
            style={({ pressed }) => [pm.featuredCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <ImageBackground source={{ uri: FEATURED.image }} style={pm.featuredImageBg} imageStyle={pm.featuredImageStyle}>
              <LinearGradient
                colors={['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.72)']}
                style={pm.featuredOverlay}
              >
                <View style={pm.featuredContent}>
                  {FEATURED.tag && (
                    <View style={pm.popularTag}>
                      <Icon name="star" size={9} color={C.primary} />
                      <Text style={pm.popularTagText}>{FEATURED.tag}</Text>
                    </View>
                  )}
                  <Text style={pm.featuredTitle}>{FEATURED.title}</Text>
                  <Text style={pm.featuredSubtitle}>{FEATURED.subtitle}</Text>
                  <View style={pm.featuredCta}>
                    <Text style={pm.featuredCtaText}>Explorar ahora</Text>
                    <Icon name="arrow-forward" size={13} color={C.accent} />
                  </View>
                </View>
              </LinearGradient>
            </ImageBackground>
          </Pressable>

          {/* ── 2-column grid ── */}
          <View style={pm.grid}>
            {GRID_CARDS.map(card => (
              <ActivityCard key={card.id} card={card} navigation={navigation} onClose={onClose} />
            ))}
          </View>

        </ScrollView>
      </Animated.View>
    </View>
  </Modal>
  );
};

// ─── Empty state ───
const EmptyState = ({ onClear }) => (
  <View style={s.emptyContainer}>
    <Text style={{ fontSize: 48, marginBottom: 12 }}>🍽</Text>
    <Text style={s.emptyTitle}>Sin cenas por aquí</Text>
    <Text style={s.emptySubtitle}>Prueba con otra ciudad o limpia los filtros</Text>
    <TouchableOpacity style={s.emptyButton} onPress={onClear} activeOpacity={0.85}>
      <Text style={s.emptyButtonText}>Limpiar filtros</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ───
const HomeScreen = ({ navigation }) => {
  const dispatch    = useDispatch();
  const user        = useSelector(selectUser);
  const events      = useSelector(selectEvents);
  const isLoading   = useSelector(selectEventsLoading);
  const error       = useSelector(selectEventsError);

  const [searchQuery,    setSearchQuery]    = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [refreshing,     setRefreshing]     = useState(false);
  const [userLocation,   setUserLocation]   = useState(null);
  const [plansVisible,   setPlansVisible]   = useState(false);

  const firstName = user?.profile?.first_name || user?.username || '';

  const loadEvents = useCallback(() => {
    dispatch(fetchEvents({
      page: 1, perPage: 30,
      ...(selectedCuisine !== 'all' && { cuisineType: selectedCuisine }),
      ...(searchQuery.trim() && { city: searchQuery.trim() }),
    }));
  }, [dispatch, selectedCuisine, searchQuery]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const stored = typeof localStorage !== 'undefined' && localStorage.getItem('userLocation');
    if (stored) { try { setUserLocation(JSON.parse(stored)); } catch (_) {} }
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        if (typeof localStorage !== 'undefined') localStorage.setItem('userLocation', JSON.stringify(loc));
      }, () => {});
    }
  }, []);

  const getDistanceText = useCallback((event) => {
    if (!userLocation || !event.latitude || !event.longitude) return null;
    const km = getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(event.latitude), parseFloat(event.longitude));
    return formatDistance(km);
  }, [userLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEvents({ page: 1, perPage: 30 }));
    setRefreshing(false);
  }, [dispatch]);

  // ── Loading ──
  if (isLoading && events.length === 0 && !refreshing) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
        <View style={{ paddingTop: Platform.OS === 'ios' ? 54 : 32, paddingHorizontal: 20 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  // ── Error ──
  if (error && events.length === 0) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>😕</Text>
        <Text style={s.emptyTitle}>Algo salió mal</Text>
        <Text style={s.emptySubtitle}>{error}</Text>
        <TouchableOpacity style={s.emptyButton} onPress={loadEvents}>
          <Text style={s.emptyButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ListHeader = (
    <View>
      {/* ── HERO ── */}
      <View style={s.hero}>
        {/* Top row: brand + plans button */}
        <View style={s.topRow}>
          <Text style={s.brand}>App Chef</Text>
          <TouchableOpacity style={s.plansBtn} onPress={() => setPlansVisible(true)} activeOpacity={0.85}>
            <Icon name="compass-outline" size={15} color={C.accent} />
            <Text style={s.plansBtnText}>Explorar</Text>
          </TouchableOpacity>
        </View>

        {/* Eatwith-style greeting + headline */}
        <Text style={s.greeting}>{getGreeting()}, {firstName || 'foodie'} 👋</Text>
        <Text style={s.headline}>{'Experiencias\ngastronómicas únicas'}</Text>

        {/* Search bar */}
        <TouchableOpacity style={s.searchWrapper} activeOpacity={0.85} onPress={() => {}}>
          <Text style={s.searchIcon}>🔍</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Ciudad, cocina o anfitrión..."
            placeholderTextColor="#B0A898"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={loadEvents}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={C.muted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {userLocation && (
          <View style={s.locationRow}>
            <Icon name="location" size={12} color={C.accent} />
            <Text style={s.locationText}>Ubicación detectada · cenas cercanas</Text>
          </View>
        )}
      </View>

      {/* ── FILTERS ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterContent}
      >
        {CUISINE_FILTERS.map(f => {
          const active = selectedCuisine === f.id;
          return (
            <TouchableOpacity
              key={f.id}
              style={[s.filterPill, active && s.filterPillActive]}
              onPress={() => setSelectedCuisine(f.id)}
              activeOpacity={0.75}
            >
              <Text style={s.filterEmoji}>{f.emoji}</Text>
              <Text style={[s.filterText, active && s.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── SECTION HEADER ── */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>
          {selectedCuisine === 'all' ? 'Próximas mesas' : `Cenas ${selectedCuisine}`}
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Map')} activeOpacity={0.8}>
          <Text style={s.sectionLink}>VER MAPA →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />

      <FlatList
        data={events}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => {
          const distance = getDistanceText(item);
          const spots    = item.available_spots ?? ((item.max_guests || 8) - (item.confirmed_guests || 0));
          const cuisine  = Array.isArray(item.cuisine_type) ? item.cuisine_type[0] : item.cuisine_type;
          const price    = parseFloat(item.price_per_person || 0).toFixed(0);

          return (
            <TouchableOpacity
              style={s.card}
              onPress={() => navigation.navigate('EventDetail', { eventId: item.id, eventTitle: item.title })}
              activeOpacity={0.95}
            >
              {/* ── IMAGE with badges ── */}
              <View style={s.cardImgWrapper}>
                {Platform.OS === 'web' ? (
                  <img
                    src={getEventImage(item)}
                    alt={item.title}
                    style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <Image
                    source={{ uri: getEventImage(item) }}
                    style={s.cardImg}
                    resizeMode="cover"
                  />
                )}

                {/* Subtle gradient at bottom of image */}
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.28)']}
                  style={s.cardImgGradient}
                />

                {/* Price badge — top right */}
                <View style={s.priceBadge}>
                  <Text style={s.priceBadgeAmount}>€{price}</Text>
                  <Text style={s.priceBadgePer}>/persona</Text>
                </View>

                {/* Urgency badge — top left */}
                {spots <= 3 && spots > 0 && (
                  <View style={s.urgencyBadge}>
                    <Text style={s.urgencyText}>ÚLTIMAS PLAZAS</Text>
                  </View>
                )}
              </View>

              {/* ── CONTENT ── */}
              <View style={s.cardBody}>

                {/* Title */}
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>

                {/* Chef + distance row */}
                <View style={s.cardChefRow}>
                  <View style={s.chefLeft}>
                    <View style={s.chefAvatar}>
                      <Text style={s.chefAvatarText}>
                        {(item.host_name || 'C')[0].toUpperCase()}
                      </Text>
                    </View>
                    <Text style={s.chefName}>{item.host_name || 'Chef'}</Text>
                    {distance ? (
                      <Text style={{ fontSize: 12, color: '#D4A853', fontWeight: '600' }}>
                        📍 {distance}
                      </Text>
                    ) : null}
                  </View>
                  {(!distance && item.city) && (
                    <Text style={s.distanceText}>📍 {item.city}</Text>
                  )}
                </View>

                {/* Divider */}
                <View style={s.cardDivider} />

                {/* Date + spots + CTA */}
                <View style={s.cardFooterRow}>
                  <View style={s.cardMeta}>
                    {item.event_date && (
                      <View style={s.metaItem}>
                        <Text style={s.metaIcon}>📅</Text>
                        <Text style={s.metaText}>{fmtDate(item.event_date)}</Text>
                      </View>
                    )}
                    <View style={s.metaItem}>
                      <Text style={s.metaIcon}>👥</Text>
                      <Text style={s.metaText}>{spots} plazas</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={s.ctaBtn}
                    onPress={() => navigation.navigate('EventDetail', { eventId: item.id, eventTitle: item.title })}
                    activeOpacity={0.85}
                  >
                    <Text style={s.ctaText}>Ver mesa →</Text>
                  </TouchableOpacity>
                </View>

                {/* Category badge */}
                {cuisine && (
                  <View style={s.cuisineBadge}>
                    <Text style={s.cuisineBadgeText}>
                      {getCategoryEmoji(cuisine)} {cuisine}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={!isLoading ? <EmptyState onClear={() => { setSearchQuery(''); setSelectedCuisine('all'); }} /> : null}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />
        }
      />

      {/* FAB crear evento */}
      <TouchableOpacity style={s.fab} onPress={() => navigation.navigate('CreateEvent')} activeOpacity={0.85}>
        <Icon name="add" size={28} color='#2C3E2D' />
      </TouchableOpacity>

      <PlansModal visible={plansVisible} onClose={() => setPlansVisible(false)} navigation={navigation} />
    </View>
  );
};

// ─── Styles ───

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: C.surface },
  listContent: { paddingBottom: 110 },

  // Hero
  hero: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: C.surface,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  brand: {
    fontFamily: SERIF,
    fontSize: 20,
    fontStyle: 'italic',
    color: C.primary,
    fontWeight: '600',
  },
  plansBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  plansBtnText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
  },
  greeting: {
    fontFamily: SANS,
    fontSize: 13,
    color: C.muted,
    marginBottom: 4,
  },
  headline: {
    fontFamily: SERIF,
    fontSize: 32,
    fontWeight: '600',
    color: C.text,
    lineHeight: 38,
    marginBottom: 18,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E8',
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchIcon: {
    fontSize: 15,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: SANS,
    fontSize: 14,
    color: C.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  locationText: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.muted,
  },

  // Filters
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: C.white,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  filterPillActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  filterEmoji: { fontSize: 14 },
  filterText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '500',
    color: C.muted,
  },
  filterTextActive: { color: C.white },

  // Section header
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    fontWeight: '600',
    color: C.text,
  },
  sectionLink: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.accent,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // ── Eatwith-style EventCard ──
  card: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    backgroundColor: C.white,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 }),
  },
  cardImgWrapper: {
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: 240,
  },
  cardImgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  priceBadge: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: C.white,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }),
  },
  priceBadgeAmount: {
    fontFamily: SANS,
    fontWeight: '700',
    fontSize: 14,
    color: C.text,
  },
  priceBadgePer: {
    fontFamily: SANS,
    fontSize: 10,
    color: C.muted,
    textAlign: 'center',
  },
  urgencyBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: C.coral,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  urgencyText: {
    fontFamily: SANS,
    color: C.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  cardBody: {
    padding: 16,
  },
  cardTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: '600',
    color: C.text,
    lineHeight: 28,
    marginBottom: 8,
  },
  cardChefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chefAvatar: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chefAvatarText: {
    fontFamily: SANS,
    color: C.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  chefName: {
    fontFamily: SANS,
    fontSize: 13,
    color: C.muted,
  },
  distanceText: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.accent,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: C.border,
    marginBottom: 12,
  },
  cardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: { fontSize: 12 },
  metaText: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.muted,
  },
  ctaBtn: {
    backgroundColor: C.primary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  ctaText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
  },
  cuisineBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#F5F0E8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cuisineBadgeText: {
    fontFamily: SANS,
    fontSize: 11,
    color: C.primary,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D4A853',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(212,168,83,0.4)' }
      : { shadowColor: '#D4A853', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }),
  },

  // Empty
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: SANS,
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: C.primary,
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  emptyButtonText: {
    fontFamily: SANS,
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

// ─── Activities Modal styles ───
const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#FDFAF5',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '92%',
  },
  handle: {
    width: 44,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 28,
    fontWeight: '600',
    color: C.text,
  },
  subtitle: {
    fontFamily: SANS,
    fontSize: 13,
    color: C.muted,
    marginTop: 3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Featured card ──
  featuredCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 12,
    height: 200,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 6px 24px rgba(0,0,0,0.22)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 8 }),
  },
  featuredImageBg: { flex: 1, height: 200 },
  featuredImageStyle: { borderRadius: 20 },
  featuredOverlay: {
    flex: 1,
    borderRadius: 20,
    justifyContent: 'flex-end',
  },
  featuredContent: {
    padding: 18,
  },
  popularTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: C.accent,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  popularTagText: {
    fontFamily: SANS,
    fontSize: 9,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 1,
  },
  featuredTitle: {
    fontFamily: SERIF,
    fontSize: 26,
    fontWeight: '600',
    color: C.white,
    marginBottom: 4,
  },
  featuredSubtitle: {
    fontFamily: SANS,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
    lineHeight: 18,
  },
  featuredCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  featuredCtaText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
  },

  // ── Grid ──
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: '48%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 5 }),
  },
  gridImageBg: { flex: 1 },
  gridImageStyle: { borderRadius: 16 },
  gridOverlay: {
    flex: 1,
    borderRadius: 16,
    justifyContent: 'space-between',
    padding: 14,
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8593C',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontFamily: SANS,
    fontSize: 9,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 0.8,
  },
  gridBottom: {
    gap: 2,
  },
  gridTitle: {
    fontFamily: SERIF,
    fontSize: 16,
    fontWeight: '600',
    color: C.white,
  },
  gridSubtitle: {
    fontFamily: SANS,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 15,
  },
});

export default HomeScreen;
