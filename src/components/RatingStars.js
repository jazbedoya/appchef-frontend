import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import typography from '../theme/typography';

const RatingStars = ({
  rating = 0,
  maxRating = 5,
  size = 20,
  interactive = false,
  onRatingChange,
  showCount = false,
  count = 0,
  style,
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

  const handlePress = starIndex => {
    if (!interactive) return;
    const newRating = starIndex + 1;
    onRatingChange?.(newRating);
    setHoverRating(0);
  };

  const getStarIcon = (starIndex) => {
    const filled = displayRating >= starIndex + 1;
    const halfFilled = !filled && displayRating >= starIndex + 0.5;

    if (filled) return 'star';
    if (halfFilled) return 'star-half';
    return 'star-outline';
  };

  const getStarColor = (starIndex) => {
    const isActive = displayRating >= starIndex + 0.5;
    return isActive ? colors.starFilled : colors.starEmpty;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {Array.from({ length: maxRating }, (_, i) => (
          interactive ? (
            <TouchableOpacity
              key={i}
              onPress={() => handlePress(i)}
              onPressIn={() => setHoverRating(i + 1)}
              onPressOut={() => setHoverRating(0)}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              <Icon
                name={getStarIcon(i)}
                size={size}
                color={getStarColor(i)}
                style={styles.star}
              />
            </TouchableOpacity>
          ) : (
            <Icon
              key={i}
              name={getStarIcon(i)}
              size={size}
              color={getStarColor(i)}
              style={styles.star}
            />
          )
        ))}
      </View>
      {showCount && count > 0 && (
        <Text style={[styles.count, { fontSize: size * 0.7 }]}>
          ({count})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    marginRight: 2,
  },
  count: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginLeft: 4,
  },
});

export default RatingStars;
