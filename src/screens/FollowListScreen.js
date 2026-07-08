// FollowListScreen.js — Lista de seguidores o siguiendo
import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, Pressable, Image, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { userApi } from '../services/api';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';

export default function FollowListScreen({ route, navigation }) {
  const { userId, mode = 'followers' } = route.params;
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    userApi.get(`/users/${userId}/${mode}`)
      .then((res) => setUsers(res.data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId, mode]);

  const title = mode === 'followers' ? 'Seguidores' : 'Siguiendo';

  const renderItem = ({ item }) => {
    const name = item.profile?.first_name
      ? `${item.profile.first_name} ${item.profile.last_name || ''}`.trim()
      : item.username;
    const initial = (name || '?')[0].toUpperCase();
    const avatar = item.profile?.avatar_url;

    return (
      <Pressable
        style={st.row}
        onPress={() => navigation.navigate('ChefProfile', { userId: item.id, userName: name })}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={st.avatar} />
        ) : (
          <View style={st.avatarPlaceholder}>
            <Text style={st.avatarLetter}>{initial}</Text>
          </View>
        )}
        <View style={st.body}>
          <Text style={st.name} numberOfLines={1}>{name}</Text>
          <Text style={st.username}>@{item.username}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={st.title}>{title}</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={st.rule} />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      ) : users.length === 0 ? (
        <View style={st.empty}>
          <Ionicons name="people-outline" size={36} color={colors.textMuted} />
          <Text style={st.emptyText}>
            {mode === 'followers' ? 'A\u00FAn no tienes seguidores.' : 'A\u00FAn no sigues a nadie.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  title: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  rule: { height: borders.hairline, backgroundColor: colors.borderHairline, marginHorizontal: spacing.gutter },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  avatar: { width: 42, height: 42, borderRadius: radius.pill },
  avatarPlaceholder: {
    width: 42, height: 42, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { ...typography.dinnerTitle, color: colors.onAccent, fontSize: 16 },
  body: { flex: 1 },
  name: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 16 },
  username: { ...typography.price, color: colors.textMuted, fontSize: 11, marginTop: 1 },

  empty: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: spacing.xxl, gap: spacing.sm,
  },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
