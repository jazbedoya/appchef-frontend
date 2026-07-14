// ChatScreen.js — Editorial: lista de rooms + chat + panel de miembros con follow
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/core';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet, ScrollView, RefreshControl,
  KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, StatusBar, Image,
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

// ─── Fallback images ───
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&q=80',
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=400&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&q=80',
];
const getFallbackImage = (title) => {
  if (!title) return FALLBACK_IMAGES[0];
  let hash = 0;
  for (let i = 0; i < title.length; i++) hash = ((hash << 5) - hash + title.charCodeAt(i)) | 0;
  return FALLBACK_IMAGES[Math.abs(hash) % FALLBACK_IMAGES.length];
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h`;
  return `${Math.floor(h / 24)} d`;
};

const formatEventDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${hh}:${mm}`;
};

// Sort rooms by last activity within each group
const sortByActivity = (list) =>
  [...list].sort((a, b) => {
    const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
    const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
    return bTime - aTime; // most recent first
  });

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
  const [unreadCounts, setUnreadCounts] = useState({}); // { room_id: count }
  const wsRef = useRef(null);
  const flatRef = useRef(null);
  const pollRef = useRef(null);

  const openRoomId = route?.params?.openRoomId;
  const roomName = route?.params?.roomName;

  // Hide/show tab bar based on whether a room is open
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;
    if (openRoom) {
      parent.setOptions({ tabBarStyle: { display: 'none' } });
    } else {
      parent.setOptions({
        tabBarStyle: {
          position: 'absolute',
          bottom: spacing.floatingTabBottom,
          left: spacing.floatingTabInset,
          right: spacing.floatingTabInset,
          height: 56,
          borderRadius: radius.pill,
          backgroundColor: colors.tabFloating,
          borderTopWidth: 0,
          paddingBottom: 0,
          paddingTop: 0,
          shadowColor: colors.textPrimary,
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.4,
          shadowRadius: 24,
          elevation: 12,
        },
      });
    }
  }, [openRoom, navigation]);

  // ─── Unread counts polling ───
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const res = await chatApi.get('/rooms/unread-counts');
      setUnreadCounts(res.data.counts || {});
      // Update tab badge
      const total = res.data.total || 0;
      navigation.getParent()?.setOptions({
        tabBarBadge: total > 0 ? total : undefined,
        tabBarBadgeStyle: total > 0 ? {
          backgroundColor: colors.accent,
          color: colors.onAccent,
          fontSize: 10,
          fontWeight: '700',
          minWidth: 18,
          height: 18,
          borderRadius: 9,
        } : undefined,
      });
    } catch {}
  }, [navigation]);

  useFocusEffect(useCallback(() => {
    fetchUnreadCounts();
    // Poll every 15s while on this tab
    pollRef.current = setInterval(fetchUnreadCounts, 15000);
    return () => { clearInterval(pollRef.current); };
  }, [fetchUnreadCounts]));

  // ─── Load rooms (derived from confirmed reservations + hosting) ───
  const loadRooms = useCallback(async () => {
    try {
      const resData = await reservationApi.get(`/reservations/user/${user?.id}`, { params: { status: 'confirmed' } });
      const reservations = resData.data.reservations || resData.data.items || [];

      const eventInfoMap = {};
      reservations.forEach(r => {
        eventInfoMap[String(r.event_id)] = {
          event_title: r.event_title,
          event_date: r.event_date,
          cover_image_url: r.event_cover_image_url,
          host_name: r.host_name,
          event_city: r.event_city,
        };
      });
      const confirmedEvents = reservations.map(r => r.event_id);

      const hostData = await reservationApi.get('/events/host/my-events', { params: { page: 1, per_page: 50 } });
      const hostEvents = hostData.data.events || hostData.data.items || [];
      hostEvents.forEach(e => {
        eventInfoMap[String(e.id)] = {
          event_title: e.title,
          event_date: e.event_date,
          cover_image_url: e.cover_image_url,
          host_name: e.host_name,
          event_city: e.city,
        };
      });
      const hostEventIds = hostEvents.map(e => e.id);

      const allEventIds = [...new Set([...confirmedEvents, ...hostEventIds])];
      if (allEventIds.length === 0) { setRooms([]); setLoading(false); return; }

      const roomsRes = await chatApi.post('/rooms/by-events', { event_ids: allEventIds });
      const seen = new Set();
      const unique = (roomsRes.data.rooms || []).filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });

      const enriched = unique.map(r => {
        const info = eventInfoMap[String(r.event_id)] || {};
        return {
          ...r,
          event_title: info.event_title || r.name,
          event_date: info.event_date,
          cover_image_url: info.cover_image_url,
          host_name: info.host_name || r.host_name,
          event_city: info.event_city,
        };
      });

      setRooms(enriched);
    } catch {
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
    if (found) handleOpenRoom(found);
    else if (openRoomId && roomName) handleOpenRoom({ id: openRoomId, name: roomName });
  }, [openRoomId, rooms]);

  // ─── Open room + mark read ───
  const handleOpenRoom = useCallback(async (room) => {
    setOpenRoom(room);
    // Mark as read
    try {
      await chatApi.post(`/rooms/${room.id}/read`);
      setUnreadCounts(prev => {
        const next = { ...prev };
        delete next[room.id];
        return next;
      });
    } catch {}
  }, []);

  // ─── Open room -> connect WS ───
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
            // Keep read pointer fresh while in the room
            chatApi.post(`/rooms/${openRoom.id}/read`).catch(() => {});
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
    // Refresh unread counts + rooms after leaving
    fetchUnreadCounts();
    loadRooms();
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
            <Text style={st.chatHeaderTitle} numberOfLines={1}>{openRoom.event_title || openRoom.name}</Text>
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
              <View style={[st.msgRow, isOwn ? st.msgRowOwn : st.msgRowOther]}>
                <View style={[st.bubble, isOwn ? st.bubbleOwn : st.bubbleOther]}>
                  {!isOwn && <Text style={st.bubbleName}>{item.sender_name}</Text>}
                  <Text style={[st.bubbleText, isOwn && st.bubbleTextOwn]}>{item.content}</Text>
                </View>
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

        {/* Members Modal */}
        <Modal visible={membersVisible} animationType="slide" onRequestClose={() => setMembersVisible(false)}>
          <View style={st.modalContainer}>
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
                        {isMe && <Text style={st.memberBadgeMe}>TÚ</Text>}
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

  // ─── Separate upcoming / past, sorted by activity ───
  const now = new Date();
  const upcoming = sortByActivity(
    rooms.filter(r => !r.event_date || new Date(r.event_date) >= now)
  );
  const past = sortByActivity(
    rooms.filter(r => r.event_date && new Date(r.event_date) < now)
  );

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const renderRoomRow = (item) => {
    const imageUri = item.cover_image_url || getFallbackImage(item.event_title || item.name);
    const title = item.event_title || item.name;
    const date = formatEventDate(item.event_date);
    const preview = item.last_message || 'Sé el primero en saludar';
    const previewMuted = !item.last_message;
    const unread = unreadCounts[item.id] || 0;

    return (
      <Pressable style={st.row} onPress={() => handleOpenRoom(item)}>
        <Image source={{ uri: imageUri }} style={st.thumb} />
        <View style={st.rowBody}>
          <View style={st.rowLine}>
            <Text style={[st.rowTitle, unread > 0 && st.rowTitleBold]} numberOfLines={1}>{title}</Text>
            {item.last_message_at ? (
              <Text style={[st.rowTime, unread > 0 && { color: colors.accent }]}>{timeAgo(item.last_message_at)}</Text>
            ) : null}
          </View>
          {date ? <Text style={st.rowDate}>{date}</Text> : null}
          <View style={st.rowPreviewRow}>
            <Text style={[st.rowPreview, previewMuted && st.rowPreviewInvite, unread > 0 && st.rowPreviewUnread]} numberOfLines={1}>
              {preview}
            </Text>
            {unread > 0 && (
              <View style={st.unreadBadge}>
                <Text style={st.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  // ─── Room list view ───
  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      <View style={st.header}>
        <Text style={st.title}>Mensajes</Text>
      </View>
      <Text style={st.standfirst}>
        {rooms.length > 0
          ? `${rooms.length} conversación${rooms.length > 1 ? 'es' : ''} abierta${rooms.length > 1 ? 's' : ''}.`
          : 'Sin conversaciones aún.'}
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
          <Text style={st.emptyTitle}>Sin chats todavía</Text>
          <Text style={st.emptyText}>
            Cuando confirmes una cena, aquí aparecerá el grupo para conocer a los demás comensales.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={st.listContent}
          refreshControl={<RefreshControl refreshing={false} onRefresh={() => { loadRooms(); fetchUnreadCounts(); }} tintColor={colors.accent} />}
        >
          {upcoming.length > 0 && (
            <>
              {past.length > 0 && <Text style={st.sectionLabel}>PRÓXIMAS</Text>}
              {upcoming.map(item => (
                <View key={item.id}>{renderRoomRow(item)}</View>
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <Text style={st.sectionLabel}>PASADAS</Text>
              {past.map(item => (
                <View key={item.id} style={{ opacity: 0.6 }}>{renderRoomRow(item)}</View>
              ))}
            </>
          )}
        </ScrollView>
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
  listContent: { paddingHorizontal: spacing.gutter, paddingBottom: spacing.floatingTabTotalH },
  empty: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xxl, alignItems: 'center', gap: spacing.sm, paddingBottom: spacing.floatingTabTotalH },
  emptyTitle: { ...typography.dinnerTitle, fontSize: 20, color: colors.textPrimary },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },

  sectionLabel: {
    ...typography.label, color: colors.textMuted, fontSize: 10, letterSpacing: 1.5,
    marginTop: spacing.lg, marginBottom: spacing.xs,
  },

  row: {
    flexDirection: 'row', gap: spacing.md, alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: borders.hairline, borderBottomColor: colors.borderHairline,
  },
  thumb: {
    width: 56, height: 56, borderRadius: radius.xs,
    backgroundColor: colors.surface,
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rowTitle: { ...typography.dinnerTitle, color: colors.textPrimary, fontSize: 15, flexShrink: 1 },
  rowTitleBold: { fontWeight: '800' },
  rowDate: { ...typography.label, color: colors.textMuted, fontSize: 10, letterSpacing: 0, marginTop: 1 },
  rowTime: { ...typography.label, fontSize: 10, color: colors.textMuted, letterSpacing: 0 },
  rowPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xxs },
  rowPreview: { ...typography.body, fontSize: 13, color: colors.textMuted, flex: 1 },
  rowPreviewInvite: { color: colors.accent, fontStyle: 'italic' },
  rowPreviewUnread: { color: colors.textPrimary, fontWeight: '600' },
  unreadBadge: {
    backgroundColor: colors.accent, borderRadius: radius.pill,
    minWidth: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadBadgeText: {
    color: colors.onAccent, fontSize: 11, fontWeight: '700',
  },

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

  // Bubble layout — wrapper row controls alignment, bubble has content
  msgRow: { width: '100%', marginBottom: spacing.xs },
  msgRowOwn: { alignItems: 'flex-end' },
  msgRowOther: { alignItems: 'flex-start' },
  bubble: { maxWidth: '78%', padding: spacing.sm, borderRadius: radius.sm },
  bubbleOwn: { backgroundColor: colors.textPrimary },
  bubbleOther: { backgroundColor: colors.surface },
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
