// EventDetailScreen.js — Rediseño editorial: detalle de cena
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet, TextInput, Modal,
  TouchableOpacity, ActivityIndicator, Alert,
  Platform, Dimensions, Pressable, KeyboardAvoidingView,
} from 'react-native';
import StripePaymentSheet from '../components/StripePaymentSheet';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';

import {
  fetchEventById, createReservation,
  selectCurrentEvent, selectIsLoadingDetail, selectIsBooking, selectMyReservations,
} from '../store/eventsSlice';
import { selectUser } from '../store/authSlice';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { borders } from '../theme/borders';
import { radius } from '../theme/radius';
import { typography } from '../theme/typography';
import RatingStars from '../components/RatingStars';
import eventsService from '../services/eventsService';
import { hapticSuccess, hapticError, hapticMedium } from '../lib/haptics';

const { width: SW, height: SH } = Dimensions.get('window');
const HERO_H = Math.round(SH * 0.40);

const CUISINE_IMAGES = {
  Italiana:     'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
  Japonesa:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
  Vegana:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
  Española:     'https://images.unsplash.com/photo-1515443961218-a51367888e4b?w=800&q=80',
  Mediterránea: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
  Marroquí:     'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
  Francesa:     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
};
const DEFAULT_IMG = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80';

function heroImage(ev) {
  if (ev?.cover_image_url) return ev.cover_image_url;
  const t = Array.isArray(ev?.cuisine_type) ? ev.cuisine_type : [];
  return CUISINE_IMAGES[t[0]] || DEFAULT_IMG;
}

// ─── Component ───

const EventDetailScreen = ({ route, navigation }) => {
  const { eventId } = route.params;
  const dispatch = useDispatch();
  const event = useSelector(selectCurrentEvent);
  const isLoadingDetail = useSelector(selectIsLoadingDetail);
  const isBooking = useSelector(selectIsBooking);
  const user = useSelector(selectUser);
  const myReservations = useSelector(selectMyReservations);

  const scrollRef = useRef(null);
  const [partySize, setPartySize] = useState(1);
  const [chatRoomId, setChatRoomId] = useState(null);

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSent, setReviewSent] = useState(null); // sent review object
  const [existingReview, setExistingReview] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);

  useEffect(() => { dispatch(fetchEventById(eventId)); }, [dispatch, eventId]);

  // Chat room: fetch or create for confirmed guests / host
  useEffect(() => {
    if (!eventId || !user?.id) return;
    const confirmed = myReservations.find(r => r.event_id === eventId && r.status === 'confirmed');
    const own = user && event?.host_id && user.id === event.host_id;
    if (!confirmed && !own) return;
    import('../services/api').then(({ chatApi }) => {
      chatApi.get(`/rooms/event/${eventId}`)
        .then(res => {
          setChatRoomId(res.data.id);
          if (confirmed) {
            const p = user?.profile || {};
            const n = [p.first_name, p.last_name].filter(Boolean).join(' ').trim() || user?.username || 'Invitado';
            chatApi.post(`/rooms/event/${eventId}/join`, { user_id: user.id, user_name: n }).catch(() => {});
          }
        })
        .catch(() => {
          chatApi.post('/rooms/create', { event_id: eventId, name: event?.title || 'Chat' })
            .then(res => setChatRoomId(res.data.id)).catch(() => {});
        });
    });
  }, [eventId, user?.id, myReservations, event?.host_id]);

  // Check if user already reviewed the host for this event
  useEffect(() => {
    if (!user?.id || !event?.host_id || user.id === event.host_id) return;
    const confirmed = myReservations.find(r => r.event_id === eventId && r.status === 'confirmed');
    if (!confirmed) return;
    eventsService.getUserReviews(event.host_id).then(data => {
      const mine = (data.reviews || []).find(
        r => r.reviewer_id === user.id && r.event_id === eventId
      );
      if (mine) setExistingReview(mine);
    }).catch(() => {});
  }, [user?.id, event?.host_id, eventId, myReservations]);

  const handleSubmitReview = async () => {
    if (reviewRating === 0) { Alert.alert('Puntuación', 'Selecciona al menos una estrella.'); return; }
    setReviewSubmitting(true);
    try {
      const result = await eventsService.createReview({
        revieweeId: event.host_id,
        eventId: event.id,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSent(result);
      Alert.alert('Gracias', 'Tu reseña se ha publicado.');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'No se pudo enviar la reseña.';
      Alert.alert('Error', msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // ─── Loading ───
  if (isLoadingDetail || (!event && !isLoadingDetail)) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (!event) {
    return (
      <View style={s.center}>
        <Icon name="alert-circle-outline" size={40} color={colors.accent} />
        <Text style={s.emptyText}>Evento no encontrado</Text>
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
          <Text style={s.backBtnText}>VOLVER</Text>
        </Pressable>
      </View>
    );
  }

  // ─── Derived data ───
  const {
    title = 'Sin título', description, event_date, price_per_person,
    max_guests, confirmed_guests = 0, available_spots, cuisine_type,
    host, host_name, city, state: evState, address_line1, menu, status,
  } = event;

  const cuisineTags = Array.isArray(cuisine_type) ? cuisine_type : cuisine_type ? [cuisine_type] : [];
  const spots = available_spots != null ? available_spots : max_guests != null ? max_guests - confirmed_guests : null;
  const soldOut = (spots != null && spots <= 0) || status === 'sold_out';
  const isOwn = user && event.host_id && user.id === event.host_id;
  const myRes = myReservations.find(r => r.event_id === event.id && ['pending_approval', 'confirmed', 'pending_payment'].includes(r.status));
  const hostName = host_name || (host?.profile?.first_name ? `${host.profile.first_name} ${host.profile.last_name || ''}`.trim() : host?.first_name || 'Chef Anónimo');

  const fmtDate = event_date
    ? new Date(event_date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    : 'Fecha por confirmar';
  const fmtTime = event_date
    ? new Date(event_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : '';
  const price = parseFloat(price_per_person || 0);
  const subtotal = price * partySize;
  const serviceFee = Math.max(subtotal * 0.10, 2);
  const total = (subtotal + serviceFee).toFixed(2);
  const menuCourses = menu?.courses || (Array.isArray(menu) ? menu : null);

  const handleReserve = () => {
    if (!user) { Alert.alert('Inicia sesión', 'Necesitas una cuenta para reservar.'); return; }
    Alert.alert(
      'Solicitar plaza',
      `${partySize} plaza${partySize > 1 ? 's' : ''} en "${title}"\n\nPrecio: €${subtotal.toFixed(0)}\nGastos de servicio: €${serviceFee.toFixed(2)}\nTotal: €${total}\n\nEl anfitrión confirmará tu solicitud.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar',
          onPress: async () => {
            const guestName = user?.profile?.first_name
              ? `${user.profile.first_name} ${user.profile.last_name || ''}`.trim()
              : user?.username || '';
            const result = await dispatch(createReservation({ eventId: event.id, partySize, guestName }));
            if (!createReservation.fulfilled.match(result)) {
              Alert.alert('Error', result.payload || 'No se pudo crear la solicitud.');
              return;
            }
            const cs = result.payload?.client_secret;
            if (cs) {
              // Production: show payment sheet
              setPaymentModal({ clientSecret: cs, amount: Math.round(parseFloat(total) * 100) });
            } else {
              // Dev mode: no payment needed
              Alert.alert(
                'Solicitud enviada',
                `${hostName} revisará tu solicitud. Cuando acepte tu plaza, podrás unirte al chat de la cena.`,
                [{ text: 'Entendido', onPress: () => navigation.goBack() }],
              );
            }
          },
        },
      ],
    );
  };

  // ─── Render ───
  return (
    <>
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Hero ── */}
        <View style={s.hero}>
          {Platform.OS === 'web' ? (
            <div style={{ width: '100%', height: HERO_H, backgroundImage: `url(${heroImage(event)})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          ) : (
            <Image source={{ uri: heroImage(event) }} style={s.heroImg} resizeMode="cover" />
          )}
          {/* Scrim overlay */}
          <View style={s.heroScrim} />
          {/* Overline on hero */}
          <View style={s.heroOverlay}>
            <Text style={s.heroOverline}>
              {cuisineTags[0] || ''}{city ? ` \u00B7 ${city}` : ''}
            </Text>
            <Text style={s.heroPrice}>{'\u20AC'}{price.toFixed(0)}</Text>
          </View>
        </View>

        {/* ── Content ── */}
        <View style={s.content}>

          {/* Title */}
          <Text style={s.title}>{title}</Text>

          {/* Overline: date + time */}
          <Text style={s.dateLine}>
            {fmtDate}{fmtTime ? ` \u00B7 ${fmtTime}` : ''}
          </Text>

          <View style={s.rule} />

          {/* ── Status banner (guest) ── */}
          {myRes && (
            <View style={[s.statusCard, myRes.status === 'confirmed' ? s.statusConfirmed : s.statusPending]}>
              <Icon
                name={myRes.status === 'confirmed' ? 'checkmark-circle' : 'time-outline'}
                size={22}
                color={myRes.status === 'confirmed' ? colors.success : colors.accent}
              />
              <View style={{ flex: 1 }}>
                <Text style={[s.statusTitle, { color: myRes.status === 'confirmed' ? colors.success : colors.accent }]}>
                  {myRes.status === 'confirmed' ? 'Reserva confirmada'
                    : myRes.status === 'pending_approval' ? 'Solicitud pendiente'
                    : 'Procesando pago'}
                </Text>
                {myRes.confirmation_code && (
                  <Text style={s.statusSub}>Código: {myRes.confirmation_code}</Text>
                )}
                {myRes.status === 'pending_approval' && (
                  <Text style={s.statusSub}>El anfitrión revisará tu solicitud</Text>
                )}
              </View>
            </View>
          )}

          {/* ── Chat button ── */}
          {(myRes?.status === 'confirmed' || isOwn) && chatRoomId && (
            <Pressable
              style={s.chatBtn}
              onPress={() => navigation.navigate('Chat', {
                screen: 'ChatMain',
                params: { openRoomId: chatRoomId, roomName: title, eventId: event.id },
              })}
            >
              <Icon name="chatbubbles-outline" size={18} color={colors.onAccent} />
              <Text style={s.chatBtnText}>CHAT DEL GRUPO</Text>
              <Icon name="chevron-forward" size={14} color={colors.onAccent} />
            </Pressable>
          )}

          {/* ── Quick info row ── */}
          <View style={s.infoRow}>
            <InfoItem icon="location-outline" text={city || 'Sin ubicación'} sub={address_line1 || (myRes?.status === 'confirmed' ? null : 'Tras confirmar')} />
            <View style={s.infoSep} />
            <InfoItem icon="people-outline" text={spots != null ? `${spots} plazas` : `${max_guests || '?'}`} sub={`de ${max_guests || '?'} totales`} />
            <View style={s.infoSep} />
            <InfoItem icon="pricetag-outline" text={`\u20AC${price.toFixed(0)}`} sub="por persona" />
          </View>

          <View style={s.rule} />

          {/* ── Cuisine tags ── */}
          {cuisineTags.length > 0 && (
            <View style={s.tagsRow}>
              {cuisineTags.map((t, i) => (
                <View key={`${t}-${i}`} style={s.tag}>
                  <Text style={s.tagText}>{t}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Description ── */}
          {description ? (
            <View style={s.section}>
              <Text style={s.sectionLabel}>SOBRE ESTA CENA</Text>
              <Text style={s.bodyText}>{description}</Text>
            </View>
          ) : null}

          {/* ── Menu ── */}
          {menuCourses && menuCourses.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionLabel}>EL MEN\u00DA</Text>
              {menuCourses.map((c, i) => (
                <View key={i} style={s.menuItem}>
                  <Text style={s.menuNum}>{String(i + 1).padStart(2, '0')}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.menuName}>{c.name || c.title || `Plato ${i + 1}`}</Text>
                    {c.description ? <Text style={s.menuDesc}>{c.description}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={s.rule} />

          {/* ── Host card ── */}
          <Pressable
            style={s.hostCard}
            onPress={() => navigation.navigate('ChefProfile', { userId: event.host_id, userName: hostName })}
          >
            <View style={s.hostAvatar}>
              <Text style={s.hostInitial}>{hostName[0]?.toUpperCase() || '?'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.hostLabel}>ANFITRI\u00D3N</Text>
              <Text style={s.hostName}>{hostName}</Text>
              {host?.profile?.bio ? (
                <Text style={s.hostBio} numberOfLines={2}>{host.profile.bio}</Text>
              ) : null}
            </View>
            <Icon name="chevron-forward" size={16} color={colors.textMuted} style={{ alignSelf: 'center' }} />
          </Pressable>

          {/* ── Review section ── */}
          {myRes?.status === 'confirmed' && !isOwn && (
            <>
              <View style={s.rule} />
              {existingReview || reviewSent ? (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>TU RESE\u00D1A</Text>
                  <RatingStars rating={(reviewSent || existingReview).rating} size={18} />
                  {(reviewSent || existingReview).comment ? (
                    <Text style={[s.bodyText, { marginTop: spacing.xs }]}>
                      {(reviewSent || existingReview).comment}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View style={s.section}>
                  <Text style={s.sectionLabel}>DEJA TU RESE\u00D1A</Text>
                  <Text style={[s.bodyText, { marginBottom: spacing.sm }]}>
                    {'\u00BF'}C{'\u00F3'}mo fue tu experiencia con {hostName}?
                  </Text>
                  <RatingStars
                    rating={reviewRating}
                    size={32}
                    interactive
                    onRatingChange={setReviewRating}
                    style={{ marginBottom: spacing.sm }}
                  />
                  <TextInput
                    style={s.reviewInput}
                    placeholder="Escribe un comentario (opcional)"
                    placeholderTextColor={colors.textMuted}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                    multiline
                    maxLength={1000}
                    textAlignVertical="top"
                    onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
                  />
                  <Pressable
                    style={[s.reviewBtn, (reviewRating === 0 || reviewSubmitting) && s.reviewBtnOff]}
                    onPress={handleSubmitReview}
                    disabled={reviewRating === 0 || reviewSubmitting}
                  >
                    {reviewSubmitting ? (
                      <ActivityIndicator size="small" color={colors.onAccent} />
                    ) : (
                      <Text style={s.reviewBtnText}>PUBLICAR RESE\u00D1A</Text>
                    )}
                  </Pressable>
                </View>
              )}
            </>
          )}

          {/* Bottom padding */}
          <View style={{ height: myRes || isOwn ? spacing.xxl : 110 }} />
        </View>
      </ScrollView>

      {/* ── Booking bar ── */}
      {!isOwn && !myRes && (
        <View style={s.bookingBar}>
          <View style={s.bookingLeft}>
            <Text style={s.bookingPrice}>{'\u20AC'}{price.toFixed(0)}</Text>
            <Text style={s.bookingPriceSub}>/pers.</Text>
          </View>

          {!soldOut && spots != null && (
            <View style={s.stepper}>
              <Pressable style={s.stepBtn} onPress={() => setPartySize(p => Math.max(1, p - 1))} disabled={partySize <= 1}>
                <Icon name="remove" size={16} color={partySize > 1 ? colors.textPrimary : colors.textMuted} />
              </Pressable>
              <Text style={s.stepNum}>{partySize}</Text>
              <Pressable style={s.stepBtn} onPress={() => setPartySize(p => Math.min(spots, p + 1))} disabled={partySize >= spots}>
                <Icon name="add" size={16} color={partySize < spots ? colors.textPrimary : colors.textMuted} />
              </Pressable>
            </View>
          )}

          <Pressable
            style={[s.reserveBtn, (soldOut || isBooking) && s.reserveBtnOff]}
            onPress={handleReserve}
            disabled={soldOut || isBooking}
          >
            {isBooking ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Text style={s.reserveBtnText}>
                {soldOut ? 'LISTA DE ESPERA' : `SOLICITAR \u00B7 \u20AC${total}`}
              </Text>
            )}
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>

      <Modal visible={!!paymentModal} animationType="slide" onRequestClose={() => setPaymentModal(null)}>
        {paymentModal && (
          <StripePaymentSheet
            clientSecret={paymentModal.clientSecret}
            amount={paymentModal.amount}
            currency="eur"
            onSuccess={() => {
              hapticSuccess();
              setPaymentModal(null);
              Alert.alert(
                'Solicitud enviada',
                `Tu pago de €${total} está RETENIDO, todavía no se ha cobrado.\n\n${hostName} revisará tu solicitud. Cuando acepte tu plaza, se completará el cobro y podrás unirte al chat de la cena.\n\nSi no la acepta, no se te cobrará nada.`,
                [
                  { text: 'Mis cenas', onPress: () => { navigation.goBack(); navigation.navigate('Profile', { screen: 'MisCenas' }); } },
                  { text: 'Cerrar', onPress: () => navigation.goBack() },
                ],
              );
            }}
            onCancel={() => {
              setPaymentModal(null);
              Alert.alert('Cancelado', 'No se realizó el pago.');
            }}
            onError={(msg) => {
              setPaymentModal(null);
              hapticError();
              Alert.alert('Error de pago', msg || 'No se pudo procesar el pago.');
            }}
          />
        )}
      </Modal>
    </>
  );
};

// ─── Small info component ───
const InfoItem = ({ icon, text, sub }) => (
  <View style={s.infoItem}>
    <Icon name={icon} size={16} color={colors.accent} />
    <Text style={s.infoText}>{text}</Text>
    {sub ? <Text style={s.infoSub}>{sub}</Text> : null}
  </View>
);

export default EventDetailScreen;

// ─── Styles ───

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, gap: spacing.sm, padding: spacing.xxl },
  emptyText: { ...typography.standfirst, color: colors.textSecondary },
  backBtn: { marginTop: spacing.sm, borderWidth: borders.medium, borderColor: colors.border, paddingVertical: spacing.xs, paddingHorizontal: spacing.lg },
  backBtnText: { ...typography.button, color: colors.textPrimary },

  // Hero
  hero: { height: HERO_H, position: 'relative' },
  heroImg: { width: '100%', height: HERO_H },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,22,19,0.35)',
  },
  heroOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: spacing.gutter, paddingBottom: spacing.md,
  },
  heroOverline: {
    ...typography.label,
    color: 'rgba(241,234,221,0.9)',
    letterSpacing: 2.5,
  },
  heroPrice: {
    ...typography.numeral,
    color: '#F1EADD',
    fontSize: 28,
  },

  // Content
  content: { paddingHorizontal: spacing.gutter, paddingTop: spacing.lg },

  title: {
    ...typography.coverTitle,
    color: colors.textPrimary,
    fontSize: 32,
    lineHeight: 34,
    marginBottom: spacing.xs,
  },
  dateLine: {
    ...typography.standfirst,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  rule: {
    height: borders.hairline,
    backgroundColor: colors.borderHairline,
    marginVertical: spacing.md,
  },

  // Status card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderLeftWidth: 3,
    marginBottom: spacing.md,
  },
  statusConfirmed: {
    backgroundColor: 'rgba(46,125,50,0.08)',
    borderLeftColor: colors.success,
  },
  statusPending: {
    backgroundColor: 'rgba(191,71,38,0.08)',
    borderLeftColor: colors.accent,
  },
  statusTitle: {
    ...typography.body,
    fontFamily: typography.body.fontFamily,
    fontWeight: '600',
    fontSize: 14,
  },
  statusSub: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },

  // Chat
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  chatBtnText: {
    ...typography.button,
    color: colors.onAccent,
    flex: 1,
    textAlign: 'center',
  },

  // Quick info row
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 0,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xxs,
  },
  infoText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
  },
  infoSub: {
    ...typography.price,
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
  },
  infoSep: {
    width: borders.hairline,
    height: 32,
    backgroundColor: colors.borderHairline,
    alignSelf: 'center',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tag: {
    borderWidth: borders.hairline,
    borderColor: colors.textMuted,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  tagText: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 1.5,
    fontSize: 9,
  },

  // Sections
  section: { marginBottom: spacing.lg },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 2.5,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.bodyLg,
    color: colors.textSecondary,
    lineHeight: 24,
  },

  // Menu
  menuItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: borders.hairline,
    borderBottomColor: colors.borderHairline,
  },
  menuNum: {
    ...typography.price,
    color: colors.accent,
    fontSize: 12,
    width: 22,
  },
  menuName: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 16,
  },
  menuDesc: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },

  // Host
  hostCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  hostAvatar: {
    width: 44, height: 44, borderRadius: radius.pill,
    backgroundColor: colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
  },
  hostInitial: {
    ...typography.dinnerTitle,
    color: colors.onAccent,
    fontSize: 18,
  },
  hostLabel: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 2,
  },
  hostName: {
    ...typography.dinnerTitle,
    color: colors.textPrimary,
    fontSize: 17,
  },
  hostBio: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xxs,
  },

  // Review form
  reviewInput: {
    ...typography.body,
    color: colors.textPrimary,
    borderWidth: borders.hairline,
    borderColor: colors.borderHairline,
    padding: spacing.sm,
    minHeight: 80,
    marginBottom: spacing.sm,
  },
  reviewBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnOff: {
    backgroundColor: colors.surface,
  },
  reviewBtnText: {
    ...typography.button,
    color: colors.onAccent,
    letterSpacing: 1.5,
  },

  // Booking bar
  bookingBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : spacing.sm,
    borderTopWidth: borders.hairline,
    borderTopColor: colors.borderHairline,
  },
  bookingLeft: {
    flexDirection: 'row', alignItems: 'baseline',
  },
  bookingPrice: {
    ...typography.numeral,
    color: colors.textPrimary,
    fontSize: 22,
  },
  bookingPriceSub: {
    ...typography.price,
    color: colors.textMuted,
    marginLeft: 2,
  },

  stepper: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    marginHorizontal: spacing.xs,
  },
  stepBtn: {
    width: 30, height: 30,
    borderWidth: borders.hairline, borderColor: colors.borderHairline,
    alignItems: 'center', justifyContent: 'center',
  },
  stepNum: {
    ...typography.numeral,
    color: colors.textPrimary,
    fontSize: 16,
    minWidth: 20,
    textAlign: 'center',
  },

  reserveBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  reserveBtnOff: {
    backgroundColor: colors.surface,
  },
  reserveBtnText: {
    ...typography.button,
    color: colors.onAccent,
    letterSpacing: 1.5,
  },
});
