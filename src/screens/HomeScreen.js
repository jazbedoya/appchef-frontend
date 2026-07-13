// HomeScreen.js — Feed inteligente: proximidad + buscador + secciones
import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  RefreshControl, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Location from 'expo-location';

import {
  fetchEvents, fetchNearbyEvents,
  selectEvents, selectNearbyEvents,
  selectEventsLoading, selectEventsError,
} from '../store/eventsSlice';
import { selectUser } from '../store/authSlice';
import { reservationApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import FeaturedCarousel from '../components/FeaturedCarousel';
import MinimalHeader from '../components/MinimalHeader';
import { SkeletonCarousel, SkeletonList } from '../components/Skeleton';
import { hapticSelection } from '../lib/haptics';

const getCuisineLabel = (event) => {
  try {
    const ct = typeof event.cuisine_type === 'string' ? JSON.parse(event.cuisine_type) : event.cuisine_type;
    return Array.isArray(ct) ? ct[0] : ct;
  } catch { return ''; }
};
const getSpots = (event) => Math.max(0, (event.max_guests || 0) - (event.confirmed_guests || 0));
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};
const formatDist = (km) => {
  if (km == null) return '';
  return km < 1 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
};

const FEATURED_COUNT = 5;
const NEARBY_THRESHOLD = 3;

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const allEvents = useSelector(selectEvents);
  const nearbyEvents = useSelector(selectNearbyEvents);
  const isLoading = useSelector(selectEventsLoading);
  const error = useSelector(selectEventsError);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const displayName = user?.profile?.first_name || user?.username || '';

  // Load with location cascade
  const loadFeed = useCallback(async () => {
    // Always load all events as fallback
    dispatch(fetchEvents({ page: 1, perPage: 50 }));

    // Try to get location for nearby
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        dispatch(fetchNearbyEvents({ lat: loc.coords.latitude, lng: loc.coords.longitude, radius_km: 50 }));
        setHasLocation(true);
        return;
      }
    } catch {}

    // Fallback: user's city
    if (user?.profile?.city) {
      dispatch(fetchEvents({ page: 1, perPage: 50, city: user.profile.city }));
    }
    setHasLocation(false);
  }, [dispatch, user?.profile?.city]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  }, [loadFeed]);

  // Search with debounce
  const onSearch = (text) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) { setSearchResults(null); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await reservationApi.get('/events', { params: { q: text.trim(), per_page: 20 } });
        setSearchResults(res.data.events || []);
      } catch { setSearchResults([]); }
      setSearching(false);
    }, 400);
  };

  // Feed data
  const feedEvents = hasLocation ? nearbyEvents : allEvents;
  const featured = feedEvents.slice(0, FEATURED_COUNT);
  const nearby = hasLocation ? feedEvents : [];
  const otherEvents = hasLocation && nearby.length < NEARBY_THRESHOLD
    ? allEvents.filter(e => !nearby.find(n => n.id === e.id))
    : [];
  const cartelera = hasLocation ? feedEvents.slice(FEATURED_COUNT) : allEvents;

  if (isLoading && allEvents.length === 0) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <MinimalHeader edition={`N.º ${format(new Date(), 'MM')}`} greeting={`${getGreeting()},`} name={displayName}
          onBellPress={() => navigation.navigate('Notifications')} />
        <SkeletonCarousel />
        <SkeletonList count={3} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={st.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}>

        <MinimalHeader edition={`N.º ${format(new Date(), 'MM')}`} greeting={`${getGreeting()},`} name={displayName}
          onBellPress={() => navigation.navigate('Notifications')} />

        {/* ── Buscador ── */}
        <View style={st.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.textMuted} />
          <TextInput
            style={st.searchInput}
            placeholder="Busca ciudad, chef o tipo de cocina..."
            placeholderTextColor={colors.placeholder}
            value={searchQuery}
            onChangeText={onSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => { setSearchQuery(''); setSearchResults(null); }}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* ── Search results ── */}
        {searchResults !== null ? (
          <View style={st.searchResultsWrap}>
            {searching ? <SkeletonList count={3} /> : searchResults.length === 0 ? (
              <Text style={st.emptySearch}>Sin resultados para "{searchQuery}"</Text>
            ) : (
              searchResults.map((ev) => (
                <Pressable key={ev.id} style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}
                  onPress={() => { setSearchQuery(''); setSearchResults(null); navigation.navigate('EventDetail', { eventId: ev.id }); }}>
                  <Text style={st.rowNum}>{getCuisineLabel(ev)}</Text>
                  <View style={st.rowBody}>
                    <Text style={st.rowTitle}>{ev.title}</Text>
                    <Text style={st.rowMeta}>{ev.city} · {ev.host_name || 'Chef'} · {getSpots(ev)} plazas</Text>
                  </View>
                  <Text style={st.rowPrice}>€{Number(ev.price_per_person).toFixed(0)}</Text>
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <>
            {/* ── Location hint ── */}
            {!hasLocation && (
              <Pressable style={st.locationHint} onPress={async () => {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') loadFeed();
              }}>
                <Ionicons name="location-outline" size={14} color={colors.accent} />
                <Text style={st.locationHintText}>Activa la ubicación para ver cenas cerca de ti</Text>
              </Pressable>
            )}

            {/* ── Carrusel ── */}
            <FeaturedCarousel
              data={featured}
              onPressItem={(item) => navigation.navigate('EventDetail', { eventId: item.id })}
            />

            {/* ── Cerca de ti / En cartelera ── */}
            {hasLocation && nearby.length > 0 && (
              <>
                <View style={st.ruleFull} />
                <Text style={st.sectionLabel}>CERCA DE TI</Text>
                <View style={st.list}>
                  {nearby.slice(FEATURED_COUNT).map((ev, i) => {
                    const full = getSpots(ev) <= 0;
                    const own = user?.id && ev.host_id === user.id;
                    return (
                      <Pressable key={ev.id} style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}
                        onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}>
                        <Text style={st.rowNum}>{String(i + FEATURED_COUNT + 1).padStart(2, '0')}</Text>
                        <View style={st.rowBody}>
                          <Text style={st.rowTitle}>{ev.title}{own ? ' · Tu cena' : ''}{full ? ' · Completa' : ''}</Text>
                          <Text style={st.rowMeta}>
                            {getCuisineLabel(ev)} · {ev.city} · {getSpots(ev)} plazas
                            {ev.distance_km != null ? ` · ${formatDist(ev.distance_km)}` : ''}
                          </Text>
                        </View>
                        <Text style={st.rowPrice}>€{Number(ev.price_per_person).toFixed(0)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Other cities if few nearby */}
            {hasLocation && nearby.length < NEARBY_THRESHOLD + FEATURED_COUNT && otherEvents.length > 0 && (
              <>
                <View style={st.ruleFull} />
                <Text style={st.sectionLabel}>TAMBIÉN EN ESPAÑA</Text>
                <View style={st.list}>
                  {otherEvents.slice(0, 10).map((ev, i) => (
                    <Pressable key={ev.id} style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}
                      onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}>
                      <Text style={st.rowNum}>{String(i + 1).padStart(2, '0')}</Text>
                      <View style={st.rowBody}>
                        <Text style={st.rowTitle}>{ev.title}</Text>
                        <Text style={st.rowMeta}>{getCuisineLabel(ev)} · {ev.city} · {getSpots(ev)} plazas</Text>
                      </View>
                      <Text style={st.rowPrice}>€{Number(ev.price_per_person).toFixed(0)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* No location: show all as En cartelera */}
            {!hasLocation && cartelera.length > 0 && (
              <>
                <View style={st.ruleFull} />
                <Text style={st.sectionLabel}>En cartelera</Text>
                <View style={st.list}>
                  {cartelera.map((ev, i) => (
                    <Pressable key={ev.id} style={({ pressed }) => [st.row, pressed && { opacity: 0.7 }]}
                      onPress={() => navigation.navigate('EventDetail', { eventId: ev.id })}>
                      <Text style={st.rowNum}>{String(i + 1).padStart(2, '0')}</Text>
                      <View style={st.rowBody}>
                        <Text style={st.rowTitle}>{ev.title}</Text>
                        <Text style={st.rowMeta}>{getCuisineLabel(ev)} · {ev.city} · {getSpots(ev)} plazas</Text>
                      </View>
                      <Text style={st.rowPrice}>€{Number(ev.price_per_person).toFixed(0)}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {/* Error */}
            {error && allEvents.length === 0 && (
              <View style={st.errorBlock}>
                <Text style={st.standfirst}>No pudimos cargar las cenas.</Text>
                <Pressable onPress={loadFeed}><Text style={st.linkAccent}>REINTENTAR →</Text></Pressable>
              </View>
            )}

            {/* Empty */}
            {!isLoading && !error && allEvents.length === 0 && (
              <View style={st.errorBlock}>
                <Text style={st.coverTitle}>Aún no hay cenas</Text>
                <Text style={st.standfirst}>Sé el primero en abrir tu mesa.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeScreen;

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: 120 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.gutter, marginBottom: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.pill,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
  },
  searchInput: { ...typography.body, flex: 1, color: colors.textPrimary, fontSize: 14 },
  searchResultsWrap: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.xxl },
  emptySearch: { ...typography.standfirst, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xxl },

  // Location hint
  locationHint: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.gutter, marginBottom: spacing.sm,
    paddingVertical: spacing.xs, paddingHorizontal: spacing.sm,
    backgroundColor: 'rgba(191,71,38,0.06)', borderRadius: radius.xs,
  },
  locationHintText: { ...typography.body, color: colors.accent, fontSize: 12 },

  // Sections
  ruleFull: { height: borders.hairline, backgroundColor: colors.border, marginHorizontal: spacing.gutter, marginTop: spacing.md },
  sectionLabel: {
    ...typography.label, color: colors.textMuted, letterSpacing: 2,
    paddingHorizontal: spacing.gutter, paddingTop: spacing.md, paddingBottom: spacing.xs,
  },
  list: { paddingHorizontal: spacing.gutter },
  row: {
    flexDirection: 'row', alignItems: 'baseline', gap: spacing.md,
    paddingVertical: spacing.sm, borderTopWidth: borders.hairline, borderTopColor: colors.borderHairline,
  },
  rowNum: { ...typography.dinnerTitle, fontSize: 13, color: colors.accent, width: spacing.xl },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.dinnerTitle, fontSize: 17, color: colors.textPrimary },
  rowMeta: { ...typography.body, fontSize: 11, color: colors.textMuted, marginTop: spacing.xxs / 2 },
  rowPrice: { ...typography.price, color: colors.textMuted },

  // Error/empty
  coverTitle: { ...typography.coverTitle, color: colors.textPrimary, marginBottom: spacing.sm },
  standfirst: { ...typography.standfirst, color: colors.textSecondary },
  linkAccent: { ...typography.price, color: colors.textPrimary, borderBottomWidth: borders.medium, borderBottomColor: colors.accent, paddingBottom: spacing.xxs / 2 },
  errorBlock: { paddingHorizontal: spacing.gutter, paddingVertical: spacing.xxl, alignItems: 'center', gap: spacing.md },
});
