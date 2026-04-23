import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, Platform,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

// ─── Color constants — Elegancia Gastronómica ───
const NAVY = '#2C3E2D';
const GOLD = '#D4A853';
const GOLD_DARK = '#C9963A';
const CREAM = '#FDFAF5';
const CREAM_DARK = '#EDE8DF';
const WHITE = '#FFFFFF';
const GRAY_300 = '#C8BFB0';
const GRAY_500 = '#7A7A6E';
const GRAY_700 = '#3E3E38';

const CUISINE_IMAGES = {
  Italiana: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  Japonesa: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  Vegana:   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  Española: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
  Francesa: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  Mexicana: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
  India:    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  default:  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
};

const getEventImage = (cover_image_url, cuisine_type) => {
  if (cover_image_url) return cover_image_url;
  const tag = Array.isArray(cuisine_type) ? cuisine_type[0] : cuisine_type;
  return CUISINE_IMAGES[tag] || CUISINE_IMAGES.default;
};

const EventCard = ({ event, onPress, style, distanceText }) => {
  if (!event) return null;

  const {
    id,
    title = 'Sin título',
    cover_image_url,
    city,
    event_date,
    price_per_person,
    max_guests,
    confirmed_guests = 0,
    available_spots,
    cuisine_type,
    host_name,
    host,
  } = event;

  const cuisineTags = Array.isArray(cuisine_type) ? cuisine_type : cuisine_type ? [cuisine_type] : [];
  const availableSpots = available_spots != null ? available_spots : max_guests != null ? max_guests - confirmed_guests : null;
  const isSoldOut = availableSpots != null && availableSpots <= 0;

  const hostDisplayName =
    host_name ||
    (host?.profile?.first_name
      ? `${host.profile.first_name} ${host.profile.last_name || ''}`.trim()
      : host?.first_name || 'Chef Anónimo');

  const formattedPrice = price_per_person != null
    ? `€${parseFloat(price_per_person).toFixed(0)}`
    : null;

  const formattedDate = event_date
    ? new Date(event_date).toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })
    : null;

  const imageUri = getEventImage(cover_image_url, cuisine_type);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={() => onPress?.(event)}
      activeOpacity={0.92}
    >
      {/* Image with gradient overlay */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(27,43,28,0.65)']}
          style={styles.gradientOverlay}
        />

        {/* Price badge top-right */}
        {formattedPrice && (
          <View style={styles.priceBadge}>
            <Text style={styles.priceBadgeText}>{formattedPrice}</Text>
            <Text style={styles.priceBadgeSub}>/persona</Text>
          </View>
        )}

        {/* Cuisine badge bottom-left on image */}
        {cuisineTags.length > 0 && (
          <View style={styles.cuisineOnImage}>
            <Text style={styles.cuisineOnImageText}>
              {cuisineTags[0]}
            </Text>
          </View>
        )}

        {/* Sold out overlay */}
        {isSoldOut && (
          <View style={styles.soldOutOverlay}>
            <Text style={styles.soldOutText}>Mesa Completa</Text>
          </View>
        )}
      </View>

      {/* Card body */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>

        <View style={styles.hostRow}>
          <Icon name="person-circle-outline" size={15} color={GOLD_DARK} />
          <Text style={styles.hostName}>por {hostDisplayName}</Text>
          {distanceText ? (
            <>
              <Text style={styles.hostSep}>·</Text>
              <Text style={styles.distanceBadge}>{distanceText}</Text>
            </>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          {city && (
            <View style={styles.metaItem}>
              <Icon name="location-outline" size={13} color={GRAY_500} />
              <Text style={styles.metaText} numberOfLines={1}>{city}</Text>
            </View>
          )}
          {formattedDate && (
            <View style={styles.metaItem}>
              <Icon name="calendar-outline" size={13} color={GRAY_500} />
              <Text style={styles.metaText} numberOfLines={1}>{formattedDate}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          {availableSpots != null && (
            <View style={styles.spotsRow}>
              <Icon name="people-outline" size={14} color={isSoldOut ? '#D32F2F' : NAVY} />
              <Text style={[styles.spotsText, isSoldOut && styles.spotsTextSoldOut]}>
                {isSoldOut ? 'Sin plazas' : `${availableSpots} plazas`}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.ctaButton, isSoldOut && styles.ctaButtonDisabled]}
            onPress={() => onPress?.(event)}
            disabled={isSoldOut}
            activeOpacity={0.8}
          >
            <Text style={styles.ctaButtonText}>
              {isSoldOut ? 'Completo' : 'Ver mesa →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: WHITE,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    width: CARD_WIDTH,
    alignSelf: 'center',
    shadowColor: '#2C3E2D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'transform 300ms ease, box-shadow 300ms ease',
      },
    }),
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 220 },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  priceBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  priceBadgeText: { color: NAVY, fontSize: 15, fontWeight: '800' },
  priceBadgeSub: { color: NAVY, fontSize: 10, fontWeight: '600', opacity: 0.8 },
  cuisineOnImage: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: '#2C3E2D',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  cuisineOnImageText: { color: '#D4A853', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  soldOutOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27,43,28,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  soldOutText: { color: WHITE, fontSize: 18, fontWeight: '700', letterSpacing: 1.5 },

  body: { padding: 16, backgroundColor: WHITE },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: NAVY,
    lineHeight: 24,
    marginBottom: 6,
    fontFamily: Platform.select({ web: '"Cormorant Garamond", Georgia, serif' }),
  },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  hostName: { fontSize: 12, color: GRAY_500, fontWeight: '500' },
  hostSep: { fontSize: 12, color: GRAY_300, marginHorizontal: 2 },
  distanceBadge: { fontSize: 12, color: GOLD_DARK, fontWeight: '500' },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, minWidth: 80 },
  metaText: { fontSize: 12, color: GRAY_500, flex: 1 },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2D9C8',
  },
  spotsRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  spotsText: { fontSize: 13, fontWeight: '600', color: NAVY },
  spotsTextSoldOut: { color: '#D32F2F' },
  ctaButton: {
    backgroundColor: NAVY,
    borderRadius: 9999,
    paddingVertical: 8,
    paddingHorizontal: 18,
    ...Platform.select({ web: { transition: 'background-color 200ms ease' } }),
  },
  ctaButtonDisabled: { backgroundColor: '#C8BFB0' },
  ctaButtonText: { color: WHITE, fontSize: 13, fontWeight: '700' },
});

export default EventCard;
