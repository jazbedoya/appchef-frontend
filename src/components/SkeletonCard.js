import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

const SkeletonCard = () => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.image, { opacity }]} />
      <View style={styles.body}>
        <Animated.View style={[styles.lineTitle, { opacity }]} />
        <Animated.View style={[styles.lineShort, { opacity }]} />
        <Animated.View style={[styles.lineMeta, { opacity }]} />
        <View style={styles.footer}>
          <Animated.View style={[styles.lineSpots, { opacity }]} />
          <Animated.View style={[styles.lineButton, { opacity }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    width: CARD_WIDTH,
    alignSelf: 'center',
    shadowColor: '#2C3E2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  image: { width: '100%', height: 220, backgroundColor: '#C8BFB0' },
  body: { padding: 16, gap: 10 },
  lineTitle: { height: 18, backgroundColor: '#E2D9C8', borderRadius: 6, width: '80%' },
  lineShort: { height: 14, backgroundColor: '#E2D9C8', borderRadius: 6, width: '50%' },
  lineMeta: { height: 13, backgroundColor: '#E2D9C8', borderRadius: 6, width: '65%' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  lineSpots: { height: 14, backgroundColor: '#E2D9C8', borderRadius: 6, width: 80 },
  lineButton: { height: 32, backgroundColor: '#E2D9C8', borderRadius: 9999, width: 90 },
});

export default SkeletonCard;
