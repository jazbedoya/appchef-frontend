import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';

import {
  fetchEventById,
  createReservation,
  selectCurrentEvent,
  selectIsLoadingDetail,
  selectIsBooking,
} from '../store/eventsSlice';
import { selectUser } from '../store/authSlice';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.round(SCREEN_HEIGHT * 0.38);

const CUISINE_IMAGES = {
  Italiana:     'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  Japonesa:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  Vegana:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  Española:     'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
  Mediterránea: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
  Marroquí:     'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  Francesa:     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
};
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80';

function getEventHeroImage(event) {
  if (event?.cover_image_url) return event.cover_image_url;
  const tags = Array.isArray(event?.cuisine_type) ? event.cuisine_type : [];
  return CUISINE_IMAGES[tags[0]] || DEFAULT_IMG;
}

// ─── Color constants — Elegancia Gastronómica ───
const CAFE = '#2C3E2D';
const BEIGE = '#EDE8DF';
const BEIGE_LIGHT = '#FDFAF5';
const TERRACOTA = '#D4A853';
const WHITE = '#FFFFFF';
const GRAY_200 = '#E2D9C8';
const GRAY_500 = '#7A7A6E';
const GRAY_700 = '#3E3E38';

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const dispatch = useDispatch();

  const event = useSelector(selectCurrentEvent);
  const isLoadingDetail = useSelector(selectIsLoadingDetail);
  const isBooking = useSelector(selectIsBooking);
  const user = useSelector(selectUser);

  const [partySize, setPartySize] = useState(1);
  const [chatRoomId, setChatRoomId] = useState(null);

  useEffect(() => {
    dispatch(fetchEventById(eventId));
  }, [dispatch, eventId]);

  useEffect(() => {
    if (!eventId) return;
    import('../services/api').then(({ chatApi }) => {
      chatApi.get(`/rooms/event/${eventId}`)
        .then(res => setChatRoomId(res.data.id))
        .catch(() => {});
    });
  }, [eventId]);

  // ─── Loading state ───
  if (isLoadingDetail || (!event && !isLoadingDetail)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={CAFE} />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  // Event not found after loading
  if (!event) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="alert-circle-outline" size={48} color={TERRACOTA} />
        <Text style={styles.loadingText}>Evento no encontrado</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    title = 'Sin título',
    description,
    cover_image_url,
    event_date,
    price_per_person,
    max_guests,
    confirmed_guests = 0,
    available_spots,
    cuisine_type,
    host,
    host_name,
    city,
    state: eventState,
    address_line1,
    menu,
    status,
  } = event;

  const cuisineTags = Array.isArray(cuisine_type)
    ? cuisine_type
    : cuisine_type
    ? [cuisine_type]
    : [];

  const availableSpots = available_spots != null
    ? available_spots
    : max_guests != null
    ? max_guests - confirmed_guests
    : null;

  const isSoldOut = (availableSpots != null && availableSpots <= 0) || status === 'sold_out';
  const isOwnEvent = user && event.host_id && user.id === event.host_id;

  const hostDisplayName =
    host_name ||
    (host?.profile?.first_name
      ? `${host.profile.first_name} ${host.profile.last_name || ''}`.trim()
      : host?.first_name || 'Chef Anónimo');

  const formattedDate = event_date
    ? new Date(event_date).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Fecha por confirmar';

  const formattedTime = event_date
    ? new Date(event_date).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const pricePerPerson = parseFloat(price_per_person || 0);
  const totalPrice = (pricePerPerson * partySize).toFixed(2);

  const handleReserve = () => {
    if (!user) {
      Alert.alert('Inicio de sesión requerido', 'Por favor inicia sesión para reservar.');
      return;
    }
    Alert.alert(
      'Confirmar reserva',
      `Reservar ${partySize} plaza${partySize > 1 ? 's' : ''} en "${title}"?\n\nTotal: €${totalPrice}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            const result = await dispatch(createReservation({
              eventId: event.id,
              partySize,
            }));
            if (createReservation.fulfilled.match(result)) {
              const code = result.payload?.confirmation_code;
              try {
                const { chatApi } = await import('../services/api');
                const res = await chatApi.get(`/rooms/event/${event.id}`);
                setChatRoomId(res.data.id);
              } catch (_) {}
              Alert.alert(
                '¡Reserva confirmada!',
                'La cena ya se encuentra en tu perfil.' + (code ? `\n\nCódigo: ${code}` : ''),
                [{ text: 'Perfecto' }],
              );
            } else {
              Alert.alert('Error', result.payload || 'No se pudo completar la reserva. Inténtalo de nuevo.');
            }
          },
        },
      ],
    );
  };

  const menuCourses = menu?.courses || (Array.isArray(menu) ? menu : null);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero image */}
        <View style={styles.heroContainer}>
          {Platform.OS === 'web' ? (
            <div style={{
              width: '100%',
              height: HERO_HEIGHT,
              backgroundImage: `url(${getEventHeroImage(event)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }} />
          ) : (
            <Image
              source={{ uri: getEventHeroImage(event) }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          )}
          <View style={styles.heroGradient} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Host info */}
          <View style={styles.hostRow}>
            <View style={styles.hostIconCircle}>
              <Icon name="person" size={16} color={WHITE} />
            </View>
            <View>
              <Text style={styles.hostLabel}>Anfitrión</Text>
              <Text style={styles.hostName}>{hostDisplayName}</Text>
            </View>
          </View>

          {/* Info grid */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Icon name="calendar" size={20} color={TERRACOTA} />
              <Text style={styles.infoCardTitle}>{formattedDate}</Text>
              {formattedTime ? <Text style={styles.infoCardSub}>{formattedTime}</Text> : null}
            </View>
            <View style={styles.infoCard}>
              <Icon name="location" size={20} color={TERRACOTA} />
              <Text style={styles.infoCardTitle}>
                {city || 'Ciudad no especificada'}
                {eventState ? `, ${eventState}` : ''}
              </Text>
              <Text style={styles.infoCardSub}>
                {address_line1 || 'Dirección compartida tras reservar'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Icon name="people" size={20} color={TERRACOTA} />
              <Text style={styles.infoCardTitle}>
                {availableSpots != null ? `${availableSpots} plazas` : `${max_guests || '?'} plazas`}
              </Text>
              <Text style={styles.infoCardSub}>
                {max_guests ? `de ${max_guests} totales` : 'disponibles'}
              </Text>
            </View>
            <View style={styles.infoCard}>
              <Icon name="pricetag" size={20} color={TERRACOTA} />
              <Text style={styles.infoCardTitle}>€{pricePerPerson.toFixed(0)}</Text>
              <Text style={styles.infoCardSub}>por persona</Text>
            </View>
          </View>

          {/* Cuisine tags */}
          {cuisineTags.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cocina</Text>
              <View style={styles.tagsRow}>
                {cuisineTags.map((tag, index) => (
                  <View key={`${tag}-${index}`} style={styles.cuisineTag}>
                    <Text style={styles.cuisineTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Description */}
          {description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre esta cena</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          ) : null}

          {/* Menu */}
          {menuCourses && menuCourses.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>El menú</Text>
              {menuCourses.map((course, idx) => (
                <View key={idx} style={styles.menuCourse}>
                  <View style={styles.menuCourseNumber}>
                    <Text style={styles.menuCourseNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.menuCourseContent}>
                    <Text style={styles.menuCourseName}>
                      {course.name || course.title || `Plato ${idx + 1}`}
                    </Text>
                    {course.description ? (
                      <Text style={styles.menuCourseDesc}>{course.description}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Host bio */}
          {host?.profile?.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tu anfitrión</Text>
              <View style={styles.hostBioCard}>
                <View style={styles.hostBioIconCircle}>
                  <Icon name="person" size={24} color={WHITE} />
                </View>
                <View style={styles.hostBioInfo}>
                  <Text style={styles.hostBioName}>{hostDisplayName}</Text>
                  <Text style={styles.hostBioText} numberOfLines={4}>
                    {host.profile.bio}
                  </Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Chat button */}
          {chatRoomId && (
            <TouchableOpacity
              style={styles.chatButton}
              onPress={async () => {
                // Auto-join the room so the user appears in /rooms/my-rooms
                try {
                  const { chatApi } = await import('../services/api');
                  const profile = user?.profile || {};
                  const userName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim()
                    || user?.username || 'Invitado';
                  await chatApi.post(`/rooms/event/${event.id}/join`, {
                    user_id: user?.id,
                    user_name: userName,
                  });
                } catch (_) {}
                navigation.navigate('Chat', {
                  screen: 'ChatMain',
                  params: { openRoomId: chatRoomId, roomName: title, eventId: event.id },
                });
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.chatButtonText}>💬 Chat del grupo</Text>
            </TouchableOpacity>
          )}

          {/* Bottom padding for fixed bar */}
          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* Fixed booking bar */}
      {!isOwnEvent && (
        <View style={styles.bookingBar}>
          <View style={styles.bookingBarPrice}>
            <Text style={styles.bookingBarPriceAmount}>€{pricePerPerson.toFixed(0)}</Text>
            <Text style={styles.bookingBarPriceSub}>/pers.</Text>
          </View>

          {/* Party size selector */}
          {!isSoldOut && availableSpots != null && (
            <View style={styles.partySizeRow}>
              <TouchableOpacity
                style={styles.partySizeBtn}
                onPress={() => setPartySize(p => Math.max(1, p - 1))}
                disabled={partySize <= 1}
              >
                <Icon name="remove" size={16} color={partySize > 1 ? CAFE : GRAY_200} />
              </TouchableOpacity>
              <Text style={styles.partySizeNum}>{partySize}</Text>
              <TouchableOpacity
                style={styles.partySizeBtn}
                onPress={() => setPartySize(p => Math.min(availableSpots, p + 1))}
                disabled={partySize >= availableSpots}
              >
                <Icon name="add" size={16} color={partySize < availableSpots ? CAFE : GRAY_200} />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[styles.reserveButton, (isSoldOut || isBooking) && styles.reserveButtonDisabled]}
            onPress={handleReserve}
            disabled={isSoldOut || isBooking}
            activeOpacity={0.85}
          >
            {isBooking ? (
              <ActivityIndicator size="small" color={WHITE} />
            ) : (
              <Text style={styles.reserveButtonText}>
                {isSoldOut ? 'Sin plazas' : `Reservar plaza · €${totalPrice}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BEIGE_LIGHT,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BEIGE_LIGHT,
    gap: 12,
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: GRAY_500,
    marginTop: 8,
  },
  backButton: {
    marginTop: 16,
    backgroundColor: CAFE,
    borderRadius: 9999,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },

  // Hero
  heroContainer: {
    height: HERO_HEIGHT,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroPlaceholder: {
    backgroundColor: CAFE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    // Simulate gradient via opacity layer
  },

  // Content
  content: {
    padding: 16,
    backgroundColor: BEIGE_LIGHT,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: CAFE,
    lineHeight: 34,
    marginBottom: 12,
  },

  // Host row
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 12,
    shadowColor: CAFE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  hostIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: CAFE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: GRAY_500,
  },
  hostName: {
    fontSize: 15,
    fontWeight: '600',
    color: CAFE,
  },

  // Info grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 48) / 2,
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    shadowColor: CAFE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  infoCardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: GRAY_700,
    marginTop: 4,
  },
  infoCardSub: {
    fontSize: 11,
    color: GRAY_500,
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: CAFE,
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: GRAY_700,
    lineHeight: 24,
  },

  // Cuisine tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineTag: {
    backgroundColor: BEIGE,
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  cuisineTagText: {
    fontSize: 12,
    fontWeight: '600',
    color: CAFE,
  },

  // Menu
  menuCourse: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  menuCourseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CAFE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
    flexShrink: 0,
  },
  menuCourseNumberText: {
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
  },
  menuCourseContent: {
    flex: 1,
  },
  menuCourseName: {
    fontSize: 14,
    fontWeight: '600',
    color: GRAY_700,
  },
  menuCourseDesc: {
    fontSize: 13,
    color: GRAY_500,
    marginTop: 3,
    lineHeight: 20,
  },

  // Host bio
  hostBioCard: {
    flexDirection: 'row',
    backgroundColor: WHITE,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    shadowColor: CAFE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  hostBioIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CAFE,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  hostBioInfo: {
    flex: 1,
  },
  hostBioName: {
    fontSize: 15,
    fontWeight: '700',
    color: CAFE,
    marginBottom: 4,
  },
  hostBioText: {
    fontSize: 13,
    color: GRAY_500,
    lineHeight: 20,
  },

  // Booking bar
  bookingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHITE,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: GRAY_200,
    gap: 8,
    shadowColor: CAFE,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  bookingBarPrice: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginRight: 4,
  },
  bookingBarPriceAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: CAFE,
  },
  bookingBarPriceSub: {
    fontSize: 12,
    color: GRAY_500,
    marginLeft: 2,
  },
  partySizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partySizeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BEIGE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partySizeNum: {
    fontSize: 15,
    fontWeight: '700',
    color: CAFE,
    minWidth: 20,
    textAlign: 'center',
  },
  reserveButton: {
    flex: 1,
    backgroundColor: CAFE,
    borderRadius: 9999,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reserveButtonDisabled: {
    backgroundColor: GRAY_200,
  },
  reserveButtonText: {
    color: WHITE,
    fontSize: 14,
    fontWeight: '700',
  },

  // Chat button
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: WHITE,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: CAFE,
    gap: 8,
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: CAFE,
  },
});

export default EventDetailScreen;
