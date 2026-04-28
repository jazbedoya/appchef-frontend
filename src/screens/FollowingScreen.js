import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/core';
import { useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';

import { selectUser } from '../store/authSlice';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { getDistanceKm, formatDistance } from '../utils/geo';
import UserAvatar from '../components/UserAvatar';

const FollowingScreen = ({ navigation }) => {
  const me = useSelector(selectUser);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const myLat = me?.profile?.latitude;
  const myLng = me?.profile?.longitude;

  const fetchFollowing = useCallback(async () => {
    if (!me?.id) return;
    setError(null);
    try {
      const res = await userApi.get(`/users/${me.id}/following`, {
        params: { per_page: 100 },
      });
      setItems(res.data?.users || []);
    } catch (e) {
      setError(e?.userMessage || 'No pudimos cargar tus seguidos.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [me?.id]);

  useEffect(() => { fetchFollowing(); }, [fetchFollowing]);
  useFocusEffect(useCallback(() => { fetchFollowing(); }, [fetchFollowing]));

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchFollowing();
  };

  const renderItem = ({ item }) => {
    const lat = item?.profile?.latitude;
    const lng = item?.profile?.longitude;
    const canShowDistance =
      myLat != null && myLng != null && lat != null && lng != null;
    const distanceText = canShowDistance
      ? formatDistance(getDistanceKm(myLat, myLng, lat, lng))
      : (item?.profile?.city || 'Ubicación no disponible');

    const fullName = [item?.profile?.first_name, item?.profile?.last_name]
      .filter(Boolean).join(' ') || item?.username || 'Usuario';

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
      >
        <UserAvatar
          name={fullName}
          uri={item?.profile?.avatar_url}
          size={52}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{fullName}</Text>
          {item?.username ? (
            <Text style={styles.username} numberOfLines={1}>@{item.username}</Text>
          ) : null}
          <View style={styles.distanceRow}>
            <Icon name="location-outline" size={13} color={colors.gray500} />
            <Text style={styles.distanceText} numberOfLines={1}>{distanceText}</Text>
          </View>
        </View>
        <Icon name="chevron-forward" size={20} color={colors.gray400} />
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchFollowing} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Icon name="people-outline" size={48} color={colors.gray400} />
        <Text style={styles.emptyTitle}>Aún no sigues a nadie</Text>
        <Text style={styles.emptySubtitle}>
          Descubre personas en el mapa o en los chats de tus cenas.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.gold} />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.beigeLight || '#FDFAF5',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  info: {
    flex: 1,
    marginHorizontal: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  username: {
    fontSize: 13,
    color: '#7A7A6E',
    marginTop: 2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#7A7A6E',
    marginLeft: 4,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0EBE0',
    marginLeft: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FDFAF5',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E2D',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#7A7A6E',
    marginTop: 6,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#9A3C3C',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2C3E2D',
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default FollowingScreen;
