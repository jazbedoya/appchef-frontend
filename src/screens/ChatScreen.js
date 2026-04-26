import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/core';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

import { selectUser } from '../store/authSlice';
import UserAvatar from '../components/UserAvatar';
import { colors } from '../theme/colors';
import typography from '../theme/typography';
import { spacing, shadows, borderRadius } from '../theme/spacing';
import { chatApi, CHAT_SERVICE_URL } from '../services/api';

const WS_BASE = CHAT_SERVICE_URL.replace('http', 'ws');
const WS_URL = __DEV__ ? WS_BASE : 'wss://chat.appchef.com';

// ─── Mock data for UI development ───
const MOCK_CONVERSATIONS = [
  {
    id: 'conv1',
    room_name: 'Italian Night - Marco\'s Kitchen',
    event_id: 'evt1',
    last_message: 'Can\'t wait for Saturday! Should I bring dessert?',
    last_message_time: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    unread_count: 2,
    participants: [
      { id: 'u1', name: 'Marco', avatar_url: null, is_host: true,  role: 'Anfitrión', distance_km: null },
      { id: 'current', name: 'Tú',   avatar_url: null, is_host: false, role: 'Invitado',  distance_km: 155 },
      { id: 'u2', name: 'Sofia', avatar_url: null, is_host: false, role: 'Invitada',  distance_km: 417 },
    ],
  },
  {
    id: 'conv2',
    room_name: 'Japanese Omakase with Kenji',
    event_id: 'evt2',
    last_message: 'The reservation is confirmed for Friday at 7pm.',
    last_message_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unread_count: 0,
    participants: [
      { id: 'u3', name: 'Kenji',   avatar_url: null, is_host: true,  role: 'Anfitrión', distance_km: null },
      { id: 'current', name: 'Tú', avatar_url: null, is_host: false, role: 'Invitado',  distance_km: 88 },
    ],
  },
  {
    id: 'conv3',
    room_name: 'Tapas Evening - Barcelona Vibes',
    event_id: 'evt3',
    last_message: 'Bring your appetite! Starting with patatas bravas.',
    last_message_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    unread_count: 0,
    participants: [
      { id: 'u4', name: 'Isabel', avatar_url: null, is_host: true,  role: 'Anfitriona', distance_km: null },
      { id: 'current', name: 'Tú', avatar_url: null, is_host: false, role: 'Invitado',  distance_km: 230 },
    ],
  },
];

const MOCK_MESSAGES = {
  conv1: [
    { id: 'm1', sender_id: 'u1', sender_name: 'Marco', content: 'Welcome to Italian Night! 🍝', created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), is_read: true },
    { id: 'm2', sender_id: 'current', sender_name: 'You', content: 'So excited! What time should we arrive?', created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), is_read: true },
    { id: 'm3', sender_id: 'u1', sender_name: 'Marco', content: 'Doors open at 7:30pm, dinner at 8. Come hungry!', created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), is_read: true },
    { id: 'm4', sender_id: 'u2', sender_name: 'Sofia', content: 'Can\'t wait for Saturday! Should I bring dessert?', created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), is_read: false },
  ],
};

const ROOM_EMOJIS = {
  italian: '🍝', italiana: '🍝',
  japanese: '🍣', japonesa: '🍣',
  vegan: '🥗', vegana: '🥗',
  spanish: '🥘', española: '🥘',
  tapas: '🥘',
  omakase: '🍣',
  french: '🥐', francesa: '🥐',
  default: '🍽️',
};

const CUISINE_EMOJIS = {
  Italiana: '🍝', Japonesa: '🍣', Vegana: '🥗', Española: '🥘',
};

const getRoomEmoji = (roomName, cuisineType) => {
  if (cuisineType) {
    let types = cuisineType;
    if (typeof cuisineType === 'string') {
      try { types = JSON.parse(cuisineType); } catch (_) { types = [cuisineType]; }
    }
    if (!Array.isArray(types)) types = [types];
    for (const t of types) {
      if (CUISINE_EMOJIS[t]) return CUISINE_EMOJIS[t];
    }
  }
  if (!roomName) return ROOM_EMOJIS.default;
  const lower = roomName.toLowerCase();
  const match = Object.keys(ROOM_EMOJIS).find(k => lower.includes(k));
  return match ? ROOM_EMOJIS[match] : ROOM_EMOJIS.default;
};

// ─── Conversation List Item ───
const ConversationItem = ({ conversation, onPress }) => {
  const timeAgo = (isoString) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  };

  const emoji = getRoomEmoji(conversation.room_name, conversation.cuisine_type);
  const unreadCount = conversation.unread_count || 0;

  return (
    <TouchableOpacity
      style={styles.convItem}
      onPress={() => onPress(conversation)}
      activeOpacity={0.85}
    >
      <View style={styles.convEmojiAvatar}>
        <Text style={styles.convEmojiText}>{emoji}</Text>
      </View>
      <View style={styles.convContent}>
        <View style={styles.convTopRow}>
          <Text style={styles.convName} numberOfLines={1}>{conversation.room_name}</Text>
          <Text style={styles.convTime}>{timeAgo(conversation.last_message_time)}</Text>
        </View>
        <View style={styles.convBottomRow}>
          <Text
            style={[styles.convLastMsg, unreadCount > 0 && styles.convLastMsgBold]}
            numberOfLines={1}
          >
            {conversation.last_message}
          </Text>
          {unreadCount > 0 && (
            <View style={{ backgroundColor: '#D4A853', borderRadius: 10,
                           width: 20, height: 20, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ─── Individual Message Bubble ───
const MessageBubble = ({ message, isOwn, isHost }) => {
  const formattedTime = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  // System message (no sender_id or type === 'system')
  if (message.type === 'system' || !message.sender_id) {
    return (
      <View style={styles.systemMessageWrapper}>
        <Text style={styles.systemMessage}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View style={[
      styles.messageBubbleWrapper,
      isOwn ? styles.messageBubbleOwn : styles.messageBubbleOther,
    ]}>
      {!isOwn && (
        <UserAvatar name={message.sender_name} size={28} style={styles.messageAvatar} />
      )}
      <View style={styles.messageBubbleInner}>
        {!isOwn && isHost && (
          <Text style={styles.hostTag}>👨‍🍳 Chef</Text>
        )}
        {!isOwn && !isHost && (
          <Text style={styles.messageSenderName}>{message.sender_name}</Text>
        )}
        {isOwn ? (
          <LinearGradient
            colors={['#D4A853', '#C9963A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageBubble, styles.messageBubbleOwnShape]}
          >
            <Text style={styles.messageTextOwn}>{message.content}</Text>
            <View style={styles.messageMetaRow}>
              <Text style={styles.messageTimeOwn}>{formattedTime}</Text>
              <Icon
                name={message.is_read ? 'checkmark-done' : 'checkmark'}
                size={12}
                color={message.is_read ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)'}
              />
            </View>
          </LinearGradient>
        ) : isHost ? (
          <LinearGradient
            colors={['#2C3E2D', '#3D5C3E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.messageBubble, styles.messageBubbleHostShape]}
          >
            <Text style={styles.messageTextOwn}>{message.content}</Text>
            <View style={styles.messageMetaRow}>
              <Text style={styles.messageTimeOwn}>{formattedTime}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={[styles.messageBubble, styles.messageBubbleOtherShape]}>
            <Text style={styles.messageText}>{message.content}</Text>
            <View style={styles.messageMetaRow}>
              <Text style={styles.messageTime}>{formattedTime}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Main Chat Screen ───
const ChatScreen = ({ route }) => {
  const user = useSelector(selectUser);
  const [conversations, setConversations] = useState(null); // null = loading
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const [showParticipants, setShowParticipants] = useState(true);

  const socketRef = useRef(null);
  const flatListRef = useRef(null);
  const myTokenPrefix = useRef(null);

  // Load rooms from API — refresh every time the screen is focused
  const loadRooms = useCallback(() => {
    chatApi.get('/rooms/my-rooms')
      .then(res => {
        const apiRooms = (res.data.rooms || []).map(r => ({
          id: r.id,
          room_name: r.name,
          event_id: r.event_id,
          last_message: r.last_message || 'Sin mensajes aún',
          last_message_time: r.last_message_at || new Date().toISOString(),
          unread_count: 0,
          participants: r.host_name
            ? [{ id: r.host_id || 'host', name: r.host_name, is_host: true, role: 'Anfitrión', distance_km: null }]
            : [],
        }));
        setConversations(apiRooms.length > 0 ? apiRooms : MOCK_CONVERSATIONS);
      })
      .catch(() => setConversations(MOCK_CONVERSATIONS));
  }, []);

  useFocusEffect(useCallback(() => {
    if (!activeConversation) loadRooms();
  }, [activeConversation, loadRooms]));

  // Token is loaded lazily when opening a conversation
  useEffect(() => {
    return () => {
      // Cleanup WebSocket on unmount
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  const connectToRoom = useCallback(async (conversation) => {
    // Guard against concurrent calls (async gap between close and new WS creation)
    if (socketRef.current === 'connecting') return;

    // Close any existing connection
    if (socketRef.current && socketRef.current !== 'connecting') {
      socketRef.current.close();
      setIsConnected(false);
    }
    socketRef.current = 'connecting'; // sentinel prevents second concurrent call

    let token = 'anonymous';
    try {
      const stored = await AsyncStorage.getItem('@appchef:access_token');
      if (stored) token = stored;
      myTokenPrefix.current = token.slice(0, 32);
    } catch (_) {}

    const senderName = user?.profile?.first_name || user?.username || 'Usuario';
    const wsUrl = `${WS_URL}/ws/${conversation.id}?token=${encodeURIComponent(token)}`;

    let ws;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn('WebSocket init failed:', err);
      return;
    }

    ws.onopen = () => {
      setIsConnected(true);
      // Send join frame so server records our display name
      ws.send(JSON.stringify({
        type: 'join',
        sender_name: senderName,
        role: 'GUEST',
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const data = msg.data || {};

        if (msg.type === 'message') {
          setMessages(prev => [...prev, {
            id: data.id || `ws_${Date.now()}_${Math.random()}`,
            sender_id: data.sender_id || 'other',
            sender_name: data.sender_name || 'Usuario',
            content: data.content || '',
            created_at: data.created_at || new Date().toISOString(),
            is_read: false,
          }]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
        } else if (msg.type === 'system') {
          setMessages(prev => [...prev, {
            id: data.id || `sys_${Date.now()}`,
            sender_id: null,
            sender_name: 'Sistema',
            content: data.content || '',
            created_at: data.created_at || new Date().toISOString(),
            type: 'system',
          }]);
        }
      } catch (err) {
        console.warn('WS message parse error:', err);
      }
    };

    ws.onerror = (err) => {
      console.warn('WebSocket error — chat offline');
      setIsConnected(false);
    };

    ws.onclose = () => setTimeout(() => connectToRoom(conversation), 3000);

    socketRef.current = ws;
  }, [user, WS_URL]);

  const loadHistory = useCallback(async (conversationId) => {
    try {
      let token = 'anonymous';
      try {
        const stored = await AsyncStorage.getItem('@appchef:access_token');
        if (stored) token = stored;
      } catch (_) {}

      const res = await fetch(
        `${CHAT_SERVICE_URL}/rooms/${conversationId}/messages?limit=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) return;
      const history = await res.json();
      if (Array.isArray(history) && history.length > 0) {
        setMessages(history);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 50);
      }
    } catch (err) {
      // Chat history unavailable — mock messages already loaded
    }
  }, []);

  const openConversation = useCallback(async (conversation) => {
    setActiveConversation(conversation);
    setIsLoadingMessages(true);

    // Show mock messages immediately as fallback
    const existing = MOCK_MESSAGES[conversation.id] || [];
    setMessages(existing);

    // Await history before connecting WS — avoids race condition
    // where WS system messages arrive before history and get wiped
    await loadHistory(conversation.id);
    setIsLoadingMessages(false);

    // Connect WebSocket for live messages (appends on top of history)
    connectToRoom(conversation);
  }, [connectToRoom, loadHistory]);

  // Auto-open room when screen is focused with openRoomId param (from EventDetailScreen)
  const autoOpenedRef = useRef(null);
  useFocusEffect(
    useCallback(() => {
      const openRoomId = route?.params?.openRoomId;
      if (openRoomId && openRoomId !== autoOpenedRef.current) {
        autoOpenedRef.current = openRoomId;
        openConversation({
          id: openRoomId,
          room_name: route?.params?.roomName || 'Chat del grupo',
          event_id: route?.params?.eventId || '',
          participants: [],
          last_message: '',
          last_message_time: new Date().toISOString(),
          unread_count: 0,
        });
      }
    }, [route?.params?.openRoomId, openConversation])
  );

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text || !activeConversation) return;

    const senderName = user?.profile?.first_name || user?.username || 'You';

    setInputText('');

    // Send via WebSocket — server broadcasts back to all including sender
    // Message appears via onmessage (single source of truth, no duplicates)
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'message',
        content: text,
        sender_name: senderName,
        role: 'GUEST',
      }));
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, [inputText, activeConversation, user]);

  const displayConversations = conversations ?? [];

  // ─── Conversation List View ───
  if (!activeConversation) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listHeaderTitle}>Messages</Text>
        </View>

        {conversations === null ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.cafe} />
          </View>
        ) : displayConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="chatbubbles-outline" size={60} color={colors.gray300} />
            <Text style={styles.emptyStateTitle}>No messages yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              When you book or host a dinner, your chat with the group will appear here.
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayConversations}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <ConversationItem
                conversation={item}
                onPress={openConversation}
                currentUserId={user?.id}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    );
  }

  // ─── Chat Room View ───
  return (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity
          onPress={() => {
            if (socketRef.current) {
              socketRef.current.close();
              socketRef.current = null;
            }
            setIsConnected(false);
            setActiveConversation(null);
          }}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={22} color={colors.cafe} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatHeaderInfo}
          onPress={() => setShowParticipants(v => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.chatHeaderTitle} numberOfLines={1}>
            {activeConversation.room_name}
          </Text>
          <View style={styles.chatHeaderSubRow}>
            <Text style={styles.chatHeaderSub}>
              {activeConversation.participants.length} participantes
            </Text>
            <Icon
              name={showParticipants ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={colors.gray400}
              style={{ marginLeft: 4 }}
            />
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.chatHeaderMenu}>
          <Icon name="ellipsis-vertical" size={20} color={colors.cafe} />
        </TouchableOpacity>
      </View>

      {/* Participants Panel */}
      {showParticipants && (
        <View style={styles.participantsPanel}>
          <Text style={styles.participantsLabel}>PARTICIPANTES</Text>
          {activeConversation.participants.map((p, i) => {
            const initials = p.name.slice(0, 1).toUpperCase();
            const distanceText = p.distance_km == null
              ? 'Aquí mismo'
              : `A ${p.distance_km} km`;
            return (
              <View key={p.id} style={[
                styles.participantRow,
                i < activeConversation.participants.length - 1 && styles.participantRowBorder,
              ]}>
                {/* Avatar */}
                <View style={[styles.participantAvatar, p.is_host && styles.participantAvatarHost]}>
                  <Text style={[styles.participantInitial, p.is_host && styles.participantInitialHost]}>
                    {initials}
                  </Text>
                </View>
                {/* Info */}
                <View style={styles.participantInfo}>
                  <View style={styles.participantNameRow}>
                    <Text style={styles.participantName}>{p.name}</Text>
                    {p.is_host && (
                      <View style={styles.chefBadge}>
                        <Text style={styles.chefBadgeText}>CHEF</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.participantMeta}>
                    {p.role} · {distanceText}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Messages */}
      {isLoadingMessages ? (
        <View style={styles.loadingMessages}>
          <ActivityIndicator size="large" color={colors.cafe} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              isOwn={
                item.sender_id === 'current' ||
                item.sender_id === user?.id ||
                (myTokenPrefix.current != null && item.sender_id === myTokenPrefix.current)
              }
              isHost={item.sender_id === activeConversation.participants[0]?.id}
            />
          )}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity style={styles.inputAttach}>
          <Icon name="attach-outline" size={22} color={colors.gray500} />
        </TouchableOpacity>
        <TextInput
          style={styles.messageInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          placeholderTextColor={colors.gray400}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          onKeyPress={(e) => {
            if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim()}
        >
          <Icon
            name="send"
            size={18}
            color={inputText.trim() ? colors.white : colors.gray400}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.beigeLight },
  chatContainer: { flex: 1, backgroundColor: colors.beigeLight },

  // List styles
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: Platform.OS === 'ios' ? 54 : spacing.base,
    paddingBottom: spacing.base,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  listHeaderTitle: { ...typography.displaySmall, color: colors.cafe },
  connectionDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  connectionIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gray300 },
  connectionIndicatorOnline: { backgroundColor: colors.success },
  connectionText: { ...typography.caption, color: colors.gray500 },

  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    marginHorizontal: spacing.base,
    marginBottom: 10,
    shadowColor: '#2C3E2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  convEmojiAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F5EDD8',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  convEmojiText: {
    fontSize: 24,
  },
  convContent: { flex: 1 },
  convTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  convName: { ...typography.labelLarge, color: colors.gray800, flex: 1, marginRight: spacing.sm },
  convTime: { ...typography.caption, color: colors.gray500 },
  convBottomRow: { flexDirection: 'row', alignItems: 'center' },
  convLastMsg: { ...typography.body, color: colors.gray500, flex: 1 },
  convLastMsgBold: { fontWeight: '600', color: colors.gray700 },
  unreadBadge: {
    backgroundColor: '#D4A853',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  unreadCount: { color: colors.white, fontSize: 11, fontWeight: '700' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xxl, gap: spacing.base },
  emptyStateTitle: { ...typography.h2, color: colors.gray500 },
  emptyStateSubtitle: { ...typography.body, color: colors.gray400, textAlign: 'center', lineHeight: 22 },

  // Chat Room styles
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingTop: Platform.OS === 'ios' ? 54 : spacing.sm,
    paddingBottom: spacing.base,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    ...shadows.sm,
  },
  backButton: { padding: 4, marginRight: spacing.sm },
  chatHeaderInfo: { flex: 1 },
  chatHeaderTitle: { ...typography.h3, color: colors.cafe },
  chatHeaderSubRow: { flexDirection: 'row', alignItems: 'center' },
  chatHeaderSub: { ...typography.caption, color: colors.gray500 },
  chatHeaderMenu: { padding: 4 },

  // Participants panel
  participantsPanel: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  participantsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.gray400,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  participantRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE8DF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  participantAvatarHost: {
    backgroundColor: '#2C3E2D',
  },
  participantInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#7A7A6E',
  },
  participantInitialHost: {
    color: '#D4A853',
  },
  participantInfo: { flex: 1 },
  participantNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1C1C1C',
  },
  chefBadge: {
    backgroundColor: '#D4A853',
    borderRadius: 20,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  chefBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1C1C1C',
    letterSpacing: 1,
  },
  participantMeta: {
    fontSize: 12,
    color: '#7A7A6E',
    marginTop: 2,
  },

  loadingMessages: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesList: { padding: spacing.base, paddingBottom: spacing.xl },

  messageBubbleWrapper: { flexDirection: 'row', marginBottom: spacing.sm, maxWidth: '80%' },
  messageBubbleOwn: { alignSelf: 'flex-end', justifyContent: 'flex-end' },
  messageBubbleOther: { alignSelf: 'flex-start' },
  messageAvatar: { marginRight: spacing.sm, alignSelf: 'flex-end' },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: spacing.base,
    maxWidth: '100%',
  },
  messageBubbleOwnShape: {
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  messageBubbleHostShape: {
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  messageBubbleOtherShape: {
    backgroundColor: '#F5F0E8',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  messageBubbleInner: {
    maxWidth: '100%',
  },
  systemMessageWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  systemMessage: {
    fontSize: 12,
    color: '#B0A898',
    fontStyle: 'italic',
  },
  hostTag: {
    fontSize: 11,
    color: '#D4A853',
    fontWeight: '600',
    marginBottom: 2,
    paddingLeft: 2,
  },
  messageSenderName: { ...typography.labelSmall, color: colors.terracotta, marginBottom: 2, textTransform: 'none' },
  messageText: { ...typography.body, color: colors.gray800 },
  messageTextOwn: { color: colors.white },
  messageMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 3 },
  messageTime: { ...typography.caption, color: colors.gray400, fontSize: 10 },
  messageTimeOwn: { color: 'rgba(255,255,255,0.6)' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
    gap: spacing.sm,
  },
  inputAttach: { padding: 8, marginBottom: 2 },
  messageInput: {
    flex: 1,
    ...typography.body,
    color: colors.gray800,
    backgroundColor: colors.white,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#E2D9C8',
    paddingHorizontal: spacing.base,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2C3E2D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  sendButtonDisabled: { backgroundColor: colors.gray200 },
});

export default ChatScreen;
