// OnboardingScreen.js — Bienvenida 3 slides (solo primera vez)
import React, { useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, Image, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

const SLIDES = [
  {
    image: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80',
    title: 'Cenas entre desconocidos\nque se vuelven amigos',
    sub: 'Descubre cenas íntimas cerca de ti, cocinadas por anfitriones locales.',
  },
  {
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    title: 'Reserva tu sitio\nen la mesa',
    sub: 'Solicita tu plaza; cuando el anfitrión te acepta, te unes al grupo. Pago seguro: no se te cobra hasta que confirman.',
  },
  {
    image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=80',
    title: 'O abre tu\npropia mesa',
    sub: 'Cualquiera puede ser anfitrión. Empieza como comensal o crea tu primera cena.',
  },
];

export default function OnboardingScreen({ onDone }) {
  const { width } = useWindowDimensions();
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);

  const finish = async () => {
    await AsyncStorage.setItem('@appchef:onboarding_seen', 'true');
    onDone();
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  const onMomentumEnd = (e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
  };

  return (
    <SafeAreaView style={st.safe} edges={['top', 'bottom']}>
      <Pressable style={st.skipBtn} onPress={finish}>
        <Text style={st.skipText}>SALTAR</Text>
      </Pressable>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <View style={[st.slide, { width }]}>
            <Image source={{ uri: item.image }} style={st.image} resizeMode="cover" />
            <View style={st.scrim} />
            <View style={st.textWrap}>
              <Text style={st.title}>{item.title}</Text>
              <Text style={st.sub}>{item.sub}</Text>
            </View>
          </View>
        )}
      />

      <View style={st.bottom}>
        <View style={st.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[st.dot, i === index ? st.dotActive : st.dotIdle]} />
          ))}
        </View>

        <Pressable style={st.nextBtn} onPress={next}>
          <Text style={st.nextText}>{index === SLIDES.length - 1 ? 'EMPEZAR' : 'SIGUIENTE'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  skipBtn: { position: 'absolute', top: spacing.xxl + spacing.md, right: spacing.gutter, zIndex: 10 },
  skipText: { ...typography.button, color: colors.textMuted, fontSize: 10, letterSpacing: 1.5 },

  slide: { flex: 1, justifyContent: 'flex-end' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,14,9,0.55)' },
  textWrap: { padding: spacing.xxl, paddingBottom: spacing.xxxl * 2 },
  title: { ...typography.coverTitle, fontSize: 32, lineHeight: 34, color: colors.onDark, marginBottom: spacing.md },
  sub: { ...typography.standfirst, fontSize: 16, lineHeight: 24, color: colors.onDarkMuted },

  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.xxl, alignItems: 'center', gap: spacing.lg },
  dots: { flexDirection: 'row', gap: spacing.xs },
  dot: { height: 3, borderRadius: radius.pill },
  dotIdle: { width: 8, backgroundColor: 'rgba(241,234,221,0.3)' },
  dotActive: { width: 24, backgroundColor: colors.accent },
  nextBtn: { backgroundColor: colors.accent, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.xxl, borderRadius: radius.xs },
  nextText: { ...typography.button, color: colors.onAccent, fontSize: 12, letterSpacing: 1.5 },
});
