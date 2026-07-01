// ChatScreen.js — Rediseño editorial: lista de conversaciones + chat WebSocket
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/core';
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
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
import { chatApi, CHAT_SERVICE_URL } from '../services/api';

const WS_BASE = CHAT_SERVICE_URL.replace('http', 'ws');

const ROOM_EMOJIS = {
  italiana: '🍝', japonesa: '🍣', vegana: '🥗',
  española: '🥘', tapas: '🥘', peruana: '🍹',
  mediterr: '🫒', default: '🍽️',
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

export default function ChatScreen() {
  const user = useSelector(selectUser);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openRoom, setOpenRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const wsRef = useRef(null);
  const flatRef = useRef(null);

  // ─── Load rooms ───
  const loadRooms = useCallback(async () => {
    try {
      const res = await chatApi.get('/rooms/my-rooms');
      setRooms(res.data.rooms || []);
    } catch { /* no rooms yet */ }
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { loadRooms(); }, [loadRooms]));

  // ─── Open room → connect WS ───
  useEffect(() => {
    if (!openRoom) return;
    const loadHistory = async () => {
      try {
        const res = await chatApi.get(`/rooms/${openRoom.id}/messages?limit=50`);
        setMessages(res.data || []);
      } catch {}
    };
    loadHistory();

    const token = AsyncStorage.getItem('@appchef:access_token').then((t) => {
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

  // ─── Chat view ───
  if (openRoom) {
    const userId = user?.id;
    return (
      <SafeAreaView style={st.safe} edges={['top']}>
        {/* Header */}
        <View style={st.chatHeader}>
          <Pressable onPress={() => { setOpenRoom(null); setMessages([]); }} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <View style={st.chatHeaderBody}>
            <Text style={st.chatHeaderTitle} numberOfLines={1}>{openRoom.name}</Text>
            <Text style={st.chatHeaderSub}>{openRoom.host_name ? `Chef ${openRoom.host_name}` : ''}</Text>
          </View>
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
        {rooms.length > 0 ? `${rooms.length} conversación${rooms.length > 1 ? 'es' : ''} abierta${rooms.length > 1 ? 's' : ''}.` : 'Sin conversaciones aún.'}
      </Text>
      <View style={st.ruleFull} />

      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xxl }} />
      ) : rooms.length === 0 ? (
        <View style={st.empty}>
          <Text style={st.emptyText}>Reserva una cena para unirte al chat del evento.</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(r) => r.id}
          contentContainerStyle={st.listContent}
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
                  {item.last_message || 'Sin mensajes aún'}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Room list
  header: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },
  title: { ...typography.sectionTitle, color: colors.textPrimary },
  standfirst: { ...typography.standfirst, fontSize: 15, color: colors.textMuted, paddingHorizontal: spacing.gutter, marginTop: spacing.xs, marginBottom: spacing.md },
  ruleFull: { height: borders.hairline, backgroundColor: colors.border, marginHorizontal: spacing.gutter },
  listContent: { paddingHorizontal: spacing.gutter },
  empty: { paddingHorizontal: spacing.gutter, paddingTop: spacing.xxl, alignItems: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },

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
  chatHeaderSub: { ...typography.label, color: colors.textMuted, letterSpacing: 0 },

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
    borderTopWidth: borders.hairline, borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  inputField: {
    flex: 1, ...typography.body, color: colors.textPrimary,
    backgroundColor: colors.surface, borderRadius: radius.xs,
    paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2,
  },
  sendBtn: {
    width: 36, height: 36, borderRadius: radius.pill,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
});
