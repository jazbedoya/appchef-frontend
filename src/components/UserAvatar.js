import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import typography from '../theme/typography';

const UserAvatar = ({
  uri,
  name,
  size = 48,
  isOnline = false,
  showBorder = false,
  style,
}) => {
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map(n => n[0]?.toUpperCase() || '')
        .join('')
    : '?';

  const fontSize = size * 0.38;
  const onlineIndicatorSize = Math.max(10, size * 0.25);
  const onlineBorderSize = 2;

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: showBorder ? 2 : 0,
              borderColor: showBorder ? colors.white : 'transparent',
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: showBorder ? 2 : 0,
              borderColor: showBorder ? colors.white : 'transparent',
            },
          ]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </View>
      )}

      {isOnline && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: onlineIndicatorSize,
              height: onlineIndicatorSize,
              borderRadius: onlineIndicatorSize / 2,
              borderWidth: onlineBorderSize,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    resizeMode: 'cover',
    backgroundColor: colors.beigeDark,
  },
  placeholder: {
    backgroundColor: colors.cafe,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: colors.beige,
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
    borderColor: colors.white,
  },
});

export default UserAvatar;
