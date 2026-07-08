// ChatScreen.js — Editorial: lista de rooms + chat + panel de miembros con follow
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/core';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, ScrollView, RefreshControl,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { selectUser } from '../store/authSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { sizes } from '../theme/sizes';
import { typography } from '../theme/typography';
import { chatApi, userApi, reservationApi, CHAT_SERVICE_URL } from '../services/api';

const WS_BASE = CHAT_SERVICE_URL.replace('http', 'ws');

const ROOM_EMOJIS = {
  italiana: '\uD83C\uDF5D', japonesa: '\uD83C\uDF63', vegana: '\uD83E\uDD57',
  española: '\uD83E\uDD58', tapas: '\uD83E\uDD58', peruana: '\uD83C\uDF79',
  mediterr: '\uD83E\uDED2', default: '\uD83C\uDF7D\uFE0F',
};
const getEmoji = (name) => {
  if (!name) return ROOM_EMOJIS.default;
  const l = name.toLowerCase();
  const k = Object.keys(ROOM_EMOJIS).find((k) => l.includes(k));
  return k ? ROOM_EMOJIS[k] : ROOM_EMOJIS.default;
};
const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
};

export default function ChatScreen({ route, navigation }) {
  const user = useSelector(selectUser);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRoom, setOpenRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [membersVisible, setMembersVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [followLoading, setFollowLoading] = useState(null);
  const wsRef = useRef(null);
  const flatRef = useRef(null);

  const openRoomId = route?.params?.openRoomId;
  const roomName = route?.params?.roomName;

  // ─── Load rooms (derived from confirmed reservations + hosting) ───
  const loadRooms = useCallback(async () => {
    try {
      // Get confirmed reservations
      const resData = await reservationApi.get(`/reservations/user/${user?.id}`, { params: { status: 'confirmed' } });
      const confirmedEvents = (resData.data.reservations || resData.data.items || []).map(r => r.event_id);

      // Get events where user is host
      const hostData = await reservationApi.get('/events/host/my-events', { params: { page: 1, per_page: 50 } });
      const hostEvents = (hostData.data.events || hostData.data.items || []).map(e => e.id);

      const allEventIds = [...new Set([...confirmedEvents, ...hostEvents])];
      if (allEventIds.length === 0) { setRooms([]); setLoading(false); return; }

      // Get rooms for those events (deduplicate by room id)
      const roomsRes = await chatApi.post('/rooms/by-events', { event_ids: allEventIds });
      const seen = new Set();
      const unique = (roomsRes.data.rooms || []).filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
      setRooms(unique);
    } catch {
      // Fallback to old method
      try {
        const res = await chatApi.get('/rooms/my-rooms');
        setRooms(res.data.rooms || []);
      } catch {}
    }
    setLoading(false);
  }, [user?.id]);

  useFocusEffect(useCallback(() => { loadRooms(); }, [loadRooms]));

  // Auto-open room from EventDetail
  useEffect(() => {
    if (!openRoomId || openRoom) return;
    const found = rooms.find(r => r.id === openRoomId);
    if (found) setOpenRoom(found);
    else if (openRoomId && roomName) setOpenRoom({ id: openRoomId, name: roomName });
  }, [openRoomId, rooms]);

  // ─── Open room → connect WS ───
  useEffect(() => {
    if (!openRoom) return;
    (async () => {
      try {
        const res = await chatApi.get(`/rooms/${openRoom.id}/messages?limit=50`);
        setMessages(res.data || []);
      } catch {}
    })();
    AsyncStorage.getItem('@appchef:access_token').then((t) => {
      const ws = new WebSocket(`${WS_BASE}/ws/${openRoom.id}?token=${t || 'anon'}`);
      ws.onmessage = (evt) => {
        try {
          const parsed = JSON.parse(evt.data);
          if (parsed.type === 'message' || parsed.type === 'system') {
            setMessages((prev) => [...prev, parsed.data]);
            setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
          }
        } catch {}
      };
      wsRef.current = ws;
    });
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [openRoom]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !wsRef.current) return;
    wsRef.current.send(JSON.stringify({
      type: 'message',
      content: text,
      sender_name: user?.username || 'Tú',
      role: 'GUEST',
    }));
    setInput('');
  };

  // ─── Members panel ───
  const openMembers = async () => {
    if (!openRoom) return;
    setMembersVisible(true);
    try {
      const res = await chatApi.get(`/rooms/${openRoom.id}/members`);
      const seen = new Set();
      const mems = (res.data || []).filter(m => {
        if (!m.user_id || seen.has(m.user_id)) return false;
        seen.add(m.user_id);
        return true;
      });
      setMembers(mems);
      // Fetch profiles for each member
      const profiles = {};
      await Promise.all(mems.map(async (m) => {
        if (!m.user_id || m.user_id === user?.id) return;
        try {
          const r = await userApi.get(`/users/${m.user_id}`);
          profiles[m.user_id] = r.data;
        } catch {
          profiles[m.user_id] = { username: m.user_name };
        }
      }));
      setMemberProfiles(profiles);
    } catch {}
  };

  const handleFollow = async (targetId) => {
    setFollowLoading(targetId);
    const profile = memberProfiles[targetId];
    const isFollowing = profile?.is_following;
    try {
      if (isFollowing) {
        await userApi.delete(`/users/${targetId}/follow`);
      } else {
        await userApi.post(`/users/${targetId}/follow`);
      }
      setMemberProfiles(prev => ({
        ...prev,
        [targetId]: { ...prev[targetId], is_following: !isFollowing },
      }));
    } catch (e) {
      Alert.alert('Error', e.userMessage || 'No se pudo completar');
    }
    setFollowLoading(null);
  };

  const closeRoom = () => {
    setOpenRoom(null);
    setMessages([]);
    setMembersVisible(false);
    setMembers([]);
    setMemberProfiles({});
  };

  // ─── Chat view ───
  if (openRoom) {
    const userId = user?.id;
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        {/* Header */}
        <View style={st.chatHeader}>
          <Pressable onPress={closeRoom} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={st.chatHeaderBody}>
            <Text style={st.chatHeaderTitle} numberOfLines={1}>{openRoom.name}</Text>
            <Text style={st.chatHeaderSub}>
              {openRoom.host_name ? `Chef ${openRoom.host_name}` : ''}
            </Text>
          </View>
          <Pressable onPress={openMembers} hitSlop={12}>
            <Ionicons name="people-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={st.ruleFull} />

        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m, i) => m.id || String(i)}
          contentContainerStyle={st.msgList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => {
            if (!item.sender_id || item.message_type === 'SYSTEM') {
              return <Text style={st.systemMsg}>{item.content}</Text>;
            }
            const isOwn = item.sender_id === userId;
            return (
              <View style={[st.bubble, isOwn ? st.bubbleOwn : st.bubbleOther]}>
                {!isOwn && <Text style={st.bubbleName}>{item.sender_name}</Text>}
                <Text style={[st.bubbleText, isOwn && st.bubbleTextOwn]}>{item.content}</Text>
              </View>
            );
          }}
        />

        {/* Input */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.inputBar}>
            <TextInput
              style={st.inputField}
              value={input}
              onChangeText={setInput}
              placeholder="Escribe un mensaje..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <Pressable onPress={sendMessage} style={st.sendBtn}>
              <Ionicons name="arrow-up" size={18} color={colors.onAccent} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>

        {/* ── Members Modal ── */}
        <Modal visible={membersVisible} animationType="slide" onRequestClose={() => setMembersVisible(false)}>
          <View style={st.modalContainer}>
            {/* Header with close */}
            <View style={st.membersTopBar}>
              <Pressable onPress={() => setMembersVisible(false)} hitSlop={16} style={st.membersCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
              <Text style={st.membersTopTitle}>Comensales</Text>
              <Text style={st.membersTopCount}>{members.length}</Text>
            </View>
            <View style={st.ruleNoMargin} />

            <FlatList
              data={members}
              keyExtractor={(m) => m.user_id}
              contentContainerStyle={st.membersList}
              renderItem={({ item }) => {
                const isMe = item.user_id === userId;
                const profile = memberProfiles[item.user_id];
                const displayName = profile?.profile?.first_name
                  ? `${profile.profile.first_name} ${profile.profile.last_name || ''}`.trim()
                  : profile?.username || item.user_name;
                const isFollowing = profile?.is_following;
                const isHost = item.role === 'HOST';

                return (
                  <Pressable
                    style={st.memberRow}
                    onPress={() => {
                      if (!isMe) {
                        setMembersVisible(false);
                        navigation.navigate('ChefProfile', {
                          userId: item.user_id, userName: displayName,
                        });
                      }
                    }}
                    disabled={isMe}
                  >
                    <View style={st.memberAvatar}>
                      <Text style={st.memberInitial}>
                        {(displayName || '?')[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={st.memberNameRow}>
                        <Text style={st.memberName}>{displayName}</Text>
                        {isHost && <Text style={st.memberBadge}>CHEF</Text>}
                        {isMe && <Text style={st.memberBadgeMe}>T\u00DA</Text>}
                      </View>
                      {profile?.profile?.bio ? (
                        <Text style={st.memberBio} numberOfLines={1}>{profile.profile.bio}</Text>
                      ) : null}
                    </View>
                    {!isMe && (
                      <Pressable
                        style={[st.followBtn, isFollowing && st.followBtnActive]}
                        onPress={() => handleFollow(item.user_id)}
                        disabled={followLoading === item.user_id}
                      >
                        {followLoading === item.user_id ? (
                          <ActivityIndicator size="small" color={isFollowing ? colors.textPrimary : colors.onAccent} />
                        ) : (
                          <Text style={[st.followBtnText, isFollowing && st.followBtnTextActive]}>
                            {isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
                          </Text>
                        )}
                      </Pressable>
                    )}
                  </Pressable>
                );
              }}
            />
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ─── Room list view ───
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Mensajes</Text>
      </View>
      <Text style={st.standfirst}>
        {rooms.length > 0
          ? `${rooms.length} conversaci\u00F3n${rooms.length > 1 ? 'es' : ''} abierta${rooms.length > 1 ? 's' : ''}.`
          : 'Sin conversaciones a\u00FAn.'}
      </Text>
      <View style={st.ruleFull} />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      ) : rooms.length === 0 ? (
        <ScrollView
          contentContainerStyle={st.empty}
          refreshControl={<RefreshControl refreshing={false} onRefresh={loadRooms} tintColor={colors.accent} />}
        >
          <Ionicons name="chatbubbles-outline" size={36} color={colors.textMuted} />
          <Text style={st.emptyTitle}>Sin chats todav\u00EDa</Text>
          <Text style={st.emptyText}>Tus cenas confirmadas aparecer\u00E1n aqu\u00ED.</Text>
        </ScrollView>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={st.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={loadRooms} tintColor={colors.accent} />}
          renderItem={({ item }) => (
            <Pressable style={st.row} onPress={() => setOpenRoom(item)}>
              <View style={st.thumb}>
                <Text style={st.thumbEmoji}>{getEmoji(item.name)}</Text>
              </View>
              <View style={st.rowBody}>
                <View style={st.rowLine}>
                  <Text style={st.rowTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={st.rowTime}>{timeAgo(item.last_message_at)}</Text>
                </View>
                <Text style={st.rowPreview} numberOfLines={1}>
                  {item.last_message || 'Sin mensajes a\u00FAn'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Room list
  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },
  title: { ...typography.sectionTitle, color: colors.textPrimary },
  standfirst: { ...typography.standfirst, fontSize: 15, color: colors.textMuted, paddingHorizontal: spacing.gutter, marginTop: spacing.xs, marginBottom: spacing.md },
  ruleFull: { height: borders.hairline, backgroundColor: colors.borderHairline, marginHorizontal: spacing.gutter },
  ruleNoMargin: { height: borders.hairline, backgroundColor: colors.borderHairline },
  listContent: { paddingHorizontal: spacing.gutter },
  empty: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  row: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start',
    paddingVertical: spacing.md, borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  thumb: {
    width: sizes.thumb, height: sizes.thumb,
    borderWidth: borders.hairline, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbEmoji: { fontSize: 22 },
  rowBody: { flex: 1, minWidth: 0 },
  rowLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { ...typography.dinnerTitle, color: colors.textPrimary, flexShrink: 1 },
  rowTime: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 0 },
  rowPreview: { ...typography.body, fontSize: 13, color: colors.textMuted, marginTop: spacing.xxs },

  // Chat view
  chatHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
  },
  chatHeaderBody: { flex: 1 },
  chatHeaderTitle: { ...typography.dinnerTitle, color: colors.textPrimary },
  chatHeaderSub: { ...typography.price, color: colors.textMuted },

  msgList: { padding: spacing.gutter, paddingBottom: spacing.xl },
  systemMsg: { ...typography.label, color: colors.textMuted, textAlign: 'center', marginVertical: spacing.sm, letterSpacing: 0 },
  bubble: { maxWidth: '78%', padding: spacing.sm, marginBottom: spacing.xs, borderRadius: radius.sm },
  bubbleOwn: { alignSelf: 'flex-end', backgroundColor: colors.textPrimary },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  bubbleName: { ...typography.labelSm, color: colors.accent, marginBottom: spacing.xxs, letterSpacing: 0 },
  bubbleText: { ...typography.body, color: colors.textPrimary },
  bubbleTextOwn: { color: colors.onAccent },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingHorizontal: spacing.gutter, paddingVertical: spacing.sm,
    borderTopWidth: borders.hairline, borderTopColor: colors.borderHairline,
    backgroundColor: colors.background,
  },
  inputField: {
    flex: 1, ...typography.body, color: colors.textPrimary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },

  // Members modal
  modalContainer: {
    flex: 1, backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 40) + spacing.xs : spacing.xxxl,
  },
  membersTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  membersCloseBtn: {
    width: 36, height: 36,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: borders.hairline,
    borderColor: colors.borderHairline,
    borderRadius: radius.pill,
  },
  membersTopTitle: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 20,
    flex: 1,
  },
  membersTopCount: {
    ...typography.numeral,
    color: colors.textMuted,
    fontSize: 18,
  },
  membersList: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  memberAvatar: {
    width: 42, height: 42, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  memberInitial: {
    ...typography.dinnerTitle, color: colors.onAccent, fontSize: 16,
  },
  memberNameRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
  },
  memberName: {
    ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 16,
  },
  memberBadge: {
    ...typography.label, color: colors.accent, fontSize: 8, letterSpacing: 1.5,
    backgroundColor: 'rgba(191,71,38,0.1)',
    paddingHorizontal: spacing.xxs + 2,
    paddingVertical: 1,
  },
  memberBadgeMe: {
    ...typography.label, color: colors.textMuted, fontSize: 8, letterSpacing: 1,
  },
  memberBio: {
    ...typography.body, color: colors.textMuted, fontSize: 12, marginTop: 1,
  },
  followBtn: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.xxs + 2,
    paddingHorizontal: spacing.sm,
  },
  followBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: borders.medium,
    borderColor: colors.border,
  },
  followBtnText: {
    ...typography.button, color: colors.onAccent, fontSize: 9,
  },
  followBtnTextActive: {
    color: colors.textPrimary,
  },
});
