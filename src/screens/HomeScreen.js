import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  RefreshControl,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { LinearGradient } from 'expo-linear-gradient';

import {
  fetchEvents,
  selectEvents,
  selectEventsLoading,
  selectEventsError,
} from '../store/eventsSlice';
import { selectUser } from '../store/authSlice';
import { getDistanceKm, formatDistance } from '../utils/geo';
import SkeletonCard from '../components/SkeletonCard';

// ─── Web font injection ───
if (Platform.OS === 'web' && typeof document !== 'undefined' && !document.getElementById('gourmet-fonts')) {
  const link = document.createElement('link');
  link.id = 'gourmet-fonts';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@400;500;600&display=swap';
  document.head.appendChild(link);
}

// ─── Design tokens ───
const SERIF = Platform.OS === 'web' ? "'Cormorant Garamond', serif" : 'serif';
const SANS  = Platform.OS === 'web' ? "'DM Sans', sans-serif" : undefined;
const C = {
  primary: '#2C3E2D',
  accent:  '#D4A853',
  surface: '#FDFAF5',
  text:    '#1C1C1C',
  muted:   '#7A7A6E',
  border:  '#F0EBE0',
  white:   '#FFFFFF',
  coral:   '#E8593C',
};

// ─── Cuisine filter options ───
const CUISINE_FILTERS = [
  { id: 'all',       label: 'Todos' },
  { id: 'Italiana',  label: 'Italiana' },
  { id: 'Japonesa',  label: 'Japonesa' },
  { id: 'Vegana',    label: 'Vegana' },
  { id: 'Española',  label: 'Española' },
];

// ─── Cuisine images map ───
const CUISINE_IMAGES = {
  Italiana:     'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  Japonesa:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  Vegana:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  Española:     'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
  Mediterránea: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
  default:      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
};

const getEventImage = (event) => {
  if (event.cover_image_url) return event.cover_image_url;
  const c = Array.isArray(event.cuisine_type) ? event.cuisine_type[0] : event.cuisine_type;
  return CUISINE_IMAGES[c] || CUISINE_IMAGES.default;
};

// ─── Badge logic ───
const getEventBadge = (event) => {
  const available = (event.max_guests || 10) - (event.confirmed_guests || 0);
  if (available <= 2) return { label: 'MUY CODICIADO', bg: C.accent,   color: C.text  };
  if (available <= 5) return { label: 'POCAS PLAZAS',  bg: C.coral,    color: C.white };
  const cuisine = Array.isArray(event.cuisine_type) ? event.cuisine_type[0] : event.cuisine_type;
  return { label: cuisine || 'EXCLUSIVO', bg: C.primary, color: C.white };
};

// ─── Error banner ───
const ErrorBanner = ({ message, onRetry }) => (
  <View style={s.errorContainer}>
    <Text style={s.errorTitle}>Algo salió mal</Text>
    <Text style={s.errorMessage}>{message}</Text>
    <TouchableOpacity style={s.retryButton} onPress={onRetry} activeOpacity={0.85}>
      <Text style={s.retryButtonText}>Reintentar</Text>
    </TouchableOpacity>
  </View>
);

// ─── Empty state ───
const EmptyState = ({ onClear }) => (
  <View style={s.emptyContainer}>
    <Text style={s.emptyTitle}>Sin resultados</Text>
    <Text style={s.emptySubtitle}>Prueba con otra ciudad o cambia los filtros</Text>
    <TouchableOpacity style={s.emptyButton} onPress={onClear} activeOpacity={0.85}>
      <Text style={s.emptyButtonText}>Limpiar filtros</Text>
    </TouchableOpacity>
  </View>
);

// ─── Main Screen ───

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const events = useSelector(selectEvents);
  const isLoading = useSelector(selectEventsLoading);
  const error = useSelector(selectEventsError);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);

  const loadEvents = useCallback(() => {
    const filters = {
      page: 1,
      perPage: 30,
      ...(selectedCuisine !== 'all' && { cuisineType: selectedCuisine }),
      ...(searchQuery.trim() && { city: searchQuery.trim() }),
    };
    dispatch(fetchEvents(filters));
  }, [dispatch, selectedCuisine, searchQuery]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('userLocation');
      if (stored) {
        try { setUserLocation(JSON.parse(stored)); } catch (_) {}
      }
    }
    if (Platform.OS === 'web' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('userLocation', JSON.stringify(loc));
          }
        },
        () => {}
      );
    }
  }, []);

  const getDistanceText = useCallback((event) => {
    if (!userLocation || !event.latitude || !event.longitude) return null;
    const km = getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(event.latitude), parseFloat(event.longitude));
    return formatDistance(km);
  }, [userLocation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchEvents({
      page: 1,
      perPage: 30,
      ...(selectedCuisine !== 'all' && { cuisineType: selectedCuisine }),
      ...(searchQuery.trim() && { city: searchQuery.trim() }),
    }));
    setRefreshing(false);
  }, [dispatch, selectedCuisine, searchQuery]);

  const handleEventPress = useCallback((event) => {
    navigation.navigate('EventDetail', {
      eventId: event.id,
      eventTitle: event.title,
    });
  }, [navigation]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCuisine('all');
  }, []);

  const ListHeader = (
    <View>
      {/* ── SECTION 1: Hero header ── */}
      <View style={s.hero}>
        <Text style={s.heroBrand}>App Chef</Text>
        <Text style={s.heroHeadline}>{'Encuentra tu lugar\nen la mesa invisible.'}</Text>

        {/* Search input */}
        <TextInput
          style={s.searchInput}
          placeholder="🔍  Busca por ciudad o anfitrión..."
          placeholderTextColor={C.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={loadEvents}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* User location */}
        {userLocation && (
          <Text style={s.locationText}>Ubicación detectada</Text>
        )}
      </View>

      {/* ── SECTION 2: Category filters ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterContent}
      >
        {CUISINE_FILTERS.map(filter => {
          const active = selectedCuisine === filter.id;
          return (
            <TouchableOpacity
              key={filter.id}
              style={[s.filterPill, active && s.filterPillActive]}
              onPress={() => setSelectedCuisine(filter.id)}
              activeOpacity={0.75}
            >
              <Text style={[s.filterPillText, active && s.filterPillTextActive]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── SECTION 3 header: Experiencias Destacadas ── */}
      <View style={s.sectionHeaderRow}>
        <Text style={s.sectionTitle}>Experiencias Destacadas</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Map')} activeOpacity={0.8}>
          <Text style={s.sectionLink}>VER TODAS →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Loading state (first load, not refresh) ──
  if (isLoading && events.length === 0 && !refreshing) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
        <View style={{ paddingTop: Platform.OS === 'ios' ? 54 : 32 }}>
          {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </View>
      </View>
    );
  }

  // ── Error state (no events loaded yet) ──
  if (error && events.length === 0) {
    return (
      <View style={s.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
        <ErrorBanner message={error} onRetry={loadEvents} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.surface} />
      <FlatList
        data={events}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => {
          const badge = getEventBadge(item);
          return (
            <View style={s.cardWrapper}>
              <View style={[s.heroCard, index === 0 && s.heroCardLarge]}>
                {/* Background image */}
                <View style={[StyleSheet.absoluteFill, { borderRadius: 16, overflow: 'hidden' }]}>
                  {Platform.OS === 'web' ? (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      backgroundImage: `url(${getEventImage(item)})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }} />
                  ) : (
                    <View style={{ flex: 1, backgroundColor: C.primary }} />
                  )}
                </View>

                {/* Gradient overlay */}
                <LinearGradient
                  colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
                  style={StyleSheet.absoluteFill}
                />

                {/* Card content */}
                <View style={s.heroContent}>
                  {/* Badge top-left */}
                  <View style={[s.heroBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[s.heroBadgeText, { color: badge.color }]}>{badge.label}</Text>
                  </View>

                  {/* Bottom content */}
                  <View style={s.heroBottom}>
                    <Text style={s.heroTitle} numberOfLines={2}>{item.title}</Text>
                    {index === 0 && item.description && (
                      <Text style={s.heroDesc} numberOfLines={2}>{item.description}</Text>
                    )}
                    <View style={s.heroActions}>
                      <TouchableOpacity
                        style={s.heroBtn}
                        onPress={() => navigation.navigate('EventDetail', { eventId: item.id })}
                      >
                        <Text style={s.heroBtnText}>Solicitar Invitación</Text>
                      </TouchableOpacity>
                      <Text style={s.heroPrice}>€{parseFloat(item.price_per_person || 0).toFixed(0)} /persona</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          !isLoading ? <EmptyState onClear={handleClearFilters} /> : null
        }
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.primary}
            colors={[C.primary]}
          />
        }
      />

      {/* FAB — create event */}
      <TouchableOpacity
        style={s.fab}
        onPress={() => navigation.navigate('CreateEvent')}
        activeOpacity={0.85}
      >
        <Text style={s.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.surface,
  },

  // ── Hero header ──
  hero: {
    backgroundColor: C.surface,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
  },
  heroBrand: {
    fontFamily: SERIF,
    fontSize: 18,
    fontStyle: 'italic',
    color: C.primary,
    marginBottom: 8,
  },
  heroHeadline: {
    fontFamily: SERIF,
    fontSize: 36,
    fontWeight: '600',
    color: C.text,
    lineHeight: 42,
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: C.border,
    borderRadius: 30,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: SANS,
    fontSize: 14,
    color: C.text,
  },
  locationText: {
    fontFamily: SANS,
    fontSize: 12,
    color: C.muted,
    marginTop: 8,
  },

  // ── Filters ──
  filterScroll: {
    marginTop: 4,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterPill: {
    backgroundColor: 'transparent',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterPillActive: {
    backgroundColor: C.primary,
  },
  filterPillText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '500',
    color: C.muted,
  },
  filterPillTextActive: {
    color: C.white,
  },

  // ── Section header ──
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: SERIF,
    fontSize: 20,
    color: C.text,
  },
  sectionLink: {
    fontFamily: SANS,
    fontSize: 11,
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Hero event cards ──
  cardWrapper: {
    paddingHorizontal: 20,
  },
  heroCard: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
    justifyContent: 'space-between',
  },
  heroCardLarge: {
    height: 320,
  },
  heroContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  heroBadgeText: {
    fontFamily: SANS,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroBottom: {
    gap: 8,
  },
  heroTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: '600',
    color: C.white,
    lineHeight: 26,
  },
  heroDesc: {
    fontFamily: SANS,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  heroActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroBtn: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  heroBtnText: {
    fontFamily: SANS,
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  heroPrice: {
    fontFamily: SANS,
    fontSize: 15,
    fontWeight: '600',
    color: C.accent,
  },

  // ── FAB ──
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2C3E2D',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 4px 16px rgba(44,62,45,0.4)' }
      : { shadowColor: '#2C3E2D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }),
  },
  fabText: {
    color: '#D4A853',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },

  // ── List ──
  listContent: {
    paddingBottom: 100,
  },

  // ── Error state ──
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontFamily: SERIF,
    fontSize: 22,
    fontWeight: '600',
    color: C.primary,
    marginBottom: 8,
  },
  errorMessage: {
    fontFamily: SANS,
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: C.primary,
    borderRadius: 9999,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  retryButtonText: {
    fontFamily: SANS,
    color: C.white,
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Empty state ──
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

export default HomeScreen;
