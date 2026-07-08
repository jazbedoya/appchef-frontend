// NotificationsScreen.js — Lista de notificaciones in-app
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import notificationsService from '../services/notificationsService';

const ICON_MAP = {
  RESERVATION_REQUEST: 'calendar-outline',
  RESERVATION_ACCEPTED: 'checkmark-circle-outline',
  NEW_REVIEW: 'star-outline',
  NEW_FOLLOWER: 'person-add-outline',
};

function formatMessage(notif) {
  const p = notif.payload || {};
  const name = p.actor_name || 'Alguien';
  const title = p.event_title || 'una cena';
  switch (notif.type) {
    case 'RESERVATION_REQUEST':
      return `${name} solicit\u00F3 unirse a tu cena "${title}"`;
    case 'RESERVATION_ACCEPTED':
      return `Aceptaron tu solicitud para "${title}"`;
    case 'NEW_REVIEW':
      return `${name} te dej\u00F3 una rese\u00F1a${p.rating ? ` (${p.rating}\u2605)` : ''}`;
    case 'NEW_FOLLOWER':
      return `${name} te empez\u00F3 a seguir`;
    default:
      return 'Nueva notificaci\u00F3n';
  }
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await notificationsService.getNotifications({ perPage: 50 });
      setNotifications(data.notifications || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const markAllRead = async () => {
    await notificationsService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const onPress = async (notif) => {
    if (!notif.read) {
      notificationsService.markRead(notif.id).catch(() => {});
      setNotifications((prev) => prev.map((n) => n.id === notif.id ? { ...n, read: true } : n));
    }
    const p = notif.payload || {};
    switch (notif.type) {
      case 'RESERVATION_REQUEST':
        if (p.event_id) navigation.navigate('EventDetail', { eventId: p.event_id });
        break;
      case 'RESERVATION_ACCEPTED':
        // Navigate to Chat tab so the new room appears
        navigation.navigate('Chat');
        break;
      case 'NEW_REVIEW':
        navigation.navigate('Profile');
        break;
      case 'NEW_FOLLOWER':
        if (p.actor_id) navigation.navigate('ChefProfile', { userId: p.actor_id, userName: p.actor_name });
        break;
    }
  };

  const renderItem = ({ item }) => (
    <Pressable style={[st.row, !item.read && st.rowUnread]} onPress={() => onPress(item)}>
      <View style={[st.iconWrap, !item.read && st.iconWrapUnread]}>
        <Ionicons name={ICON_MAP[item.type] || 'notifications-outline'} size={20} color={!item.read ? colors.accent : colors.textMuted} />
      </View>
      <View style={st.body}>
        <Text style={[st.message, !item.read && st.messageUnread]} numberOfLines={2}>
          {formatMessage(item)}
        </Text>
        <Text style={st.time}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.read && <View style={st.dot} />}
    </Pressable>
  );

  if (loading) {
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={st.title}>Notificaciones</Text>
        {notifications.some((n) => !n.read) ? (
          <Pressable onPress={markAllRead}>
            <Text style={st.markAll}>Leer todo</Text>
          </Pressable>
        ) : <View style={{ width: 60 }} />}
      </View>

      {notifications.length === 0 ? (
        <View style={st.empty}>
          <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
          <Text style={st.emptyTitle}>Sin notificaciones</Text>
          <Text style={st.emptyText}>Cuando alguien reserve, te siga o te deje una rese\u00F1a, lo ver\u00E1s aqu\u00ED.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        />
      )}
    </SafeAreaView>
  );
};

export default NotificationsScreen;

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  title: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  markAll: { ...typography.label, fontSize: 9, color: colors.accent, letterSpacing: 1.2 },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.gutter,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  rowUnread: { backgroundColor: 'rgba(191,71,38,0.04)' },

  iconWrap: {
    width: 40, height: 40, borderRadius: radius.pill,
    backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: 'rgba(191,71,38,0.1)' },

  body: { flex: 1 },
  message: { ...typography.body, color: colors.textSecondary, fontSize: 13, lineHeight: 18 },
  messageUnread: { color: colors.textPrimary },
  time: { ...typography.price, color: colors.textMuted, fontSize: 10, marginTop: 2 },

  dot: {
    width: 8, height: 8, borderRadius: radius.pill, backgroundColor: colors.accent,
  },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.sm,
  },
  emptyTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
