// src/components/FeaturedCarousel.js
// Carrusel horizontal de cenas destacadas (FlatList con paginado por snap).
// Expo-friendly: NO requiere librerías externas.
//   - Swipe manual con snapToInterval.
//   - Autoavance que se pausa al arrastrar.
//   - Indicadores: contador "01 / 05" + dots (activo se alarga).
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';

const AUTOPLAY_MS = 4500;

const CUISINE_IMAGES = {
  Italiana:     'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  Japonesa:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  Vegana:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  Española:     'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
  Mediterránea: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
  Marroquí:     'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  Francesa:     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
  Peruana:      'https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=800&q=80',
  Vasca:        'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
};
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80';

function getCuisine(event) {
  try {
    const ct = typeof event.cuisine_type === 'string'
      ? JSON.parse(event.cuisine_type)
      : event.cuisine_type;
    return Array.isArray(ct) ? ct[0] : ct || '';
  } catch { return ''; }
}

function getImage(event) {
  if (event.cover_image_url) return event.cover_image_url;
  return CUISINE_IMAGES[getCuisine(event)] || DEFAULT_IMG;
}

function getSpots(event) {
  return Math.max(0, (event.max_guests || 0) - (event.confirmed_guests || 0));
}

function pad2(i) {
  return String(i + 1).padStart(2, '0');
}

function Slide({ item, width, onPress }) {
  const cuisine = getCuisine(item);
  const spots = getSpots(item);
  const price = Number(item.price_per_person || 0).toFixed(0);
  const hostName = item.host_name || item.host?.profile?.first_name || 'Chef';

  return (
    <Pressable onPress={onPress} style={[styles.card, { width, height: sizes.featuredCardH }]}>
      <Image source={{ uri: getImage(item) }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <View style={styles.scrim} />
      <View style={styles.body}>
        <Text style={styles.hostLine}>POR {hostName.toUpperCase()}</Text>
        <Text style={styles.cat}>{cuisine}{item.city ? ` · ${item.city}` : ''}</Text>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.footer}>
          <Text style={styles.meta}>€{price} · {spots} plazas</Text>
          <Text style={styles.cta}>SOLICITAR SITIO →</Text>
        </View>
      </View>
    </Pressable>
  );
}

export default function FeaturedCarousel({ data, onPressItem }) {
  const { width: screenW } = useWindowDimensions();
  const cardW = screenW - spacing.gutter * 2 - sizes.carouselPeek;
  const interval = cardW + spacing.md;

  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    if (data.length <= 1) return;
    const id = setInterval(() => {
      if (pausedRef.current || !listRef.current) return;
      const next = (index + 1) % data.length;
      listRef.current.scrollToOffset({ offset: next * interval, animated: true });
      setIndex(next);
    }, AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [index, interval, data.length]);

  const onMomentumEnd = useCallback(
    (e) => {
      const i = Math.round(e.nativeEvent.contentOffset.x / interval);
      setIndex(Math.max(0, Math.min(data.length - 1, i)));
    },
    [interval, data.length]
  );

  if (data.length === 0) return null;

  return (
    <View>
      <View style={styles.head}>
        <Text style={styles.kicker}>Esta noche · Destacadas</Text>
        <Text style={styles.counter}>
          {pad2(index)} <Text style={styles.counterTotal}>{`/ ${pad2(data.length - 1)}`}</Text>
        </Text>
      </View>

      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(it) => it.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        snapToAlignment="start"
        disableIntervalMomentum
        contentContainerStyle={styles.track}
        ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
        renderItem={({ item }) => (
          <Slide item={item} width={cardW} onPress={() => onPressItem?.(item)} />
        )}
        onScrollBeginDrag={() => { pausedRef.current = true; }}
        onScrollEndDrag={() => { pausedRef.current = false; }}
        onMomentumScrollEnd={onMomentumEnd}
      />

      {data.length > 1 && (
        <View style={styles.dots}>
          {data.map((it, i) => (
            <Pressable
              key={it.id}
              onPress={() => {
                listRef.current?.scrollToOffset({ offset: i * interval, animated: true });
                setIndex(i);
              }}
              style={[styles.dot, i === index ? styles.dotActive : styles.dotIdle]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  kicker: { ...typography.label, color: colors.accent, letterSpacing: 2 },
  counter: { ...typography.price, color: colors.textPrimary, letterSpacing: 1.4 },
  counterTotal: { color: colors.textMuted },

  track: { paddingHorizontal: spacing.gutter },

  card: {
    borderRadius: radius.xs,
    overflow: 'hidden',
    backgroundColor: colors.imagePlaceholder,
    justifyContent: 'flex-end',
  },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '72%', backgroundColor: colors.cardScrim },
  body: { padding: spacing.md },
  hostLine: {
    ...typography.label,
    fontSize: 10,
    color: colors.accent,
    letterSpacing: 2.5,
    marginBottom: spacing.xs,
  },
  cat: { ...typography.labelSm, fontSize: 9, color: colors.onDarkMuted, letterSpacing: 1.6, marginBottom: spacing.xs },
  title: { ...typography.coverTitle, fontSize: 29, lineHeight: 29, color: colors.onDark, marginBottom: spacing.xs },
  desc: { ...typography.standfirst, fontSize: 14, lineHeight: 19, color: colors.onDarkMuted, marginBottom: spacing.md },
  footer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    borderTopWidth: borders.hairline,
    borderTopColor: colors.onDarkHairline,
    paddingTop: spacing.sm,
  },
  meta: { ...typography.price, color: colors.onDarkMuted, letterSpacing: 0.8 },
  cta: {
    ...typography.price,
    color: colors.onAccent,
    borderBottomWidth: borders.medium,
    borderBottomColor: colors.accent,
    paddingBottom: spacing.xxs / 2,
  },

  dots: { flexDirection: 'row', gap: spacing.xs - 1, justifyContent: 'center', paddingTop: spacing.md, paddingBottom: spacing.lg },
  dot: { height: sizes.dotH, borderRadius: radius.pill },
  dotIdle: { width: sizes.dotW, backgroundColor: colors.borderHairline },
  dotActive: { width: sizes.dotActiveW, backgroundColor: colors.accent },
});
