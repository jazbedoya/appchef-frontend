import { reservationApi } from './api';

const eventsService = {
  async getEvents({ page = 1, perPage = 20, city, cuisineType, minPrice, maxPrice, diningStyle, hasSpots } = {}) {
    const params = {
      page, per_page: perPage,
      ...(city && { city }),
      ...(cuisineType && { cuisine_type: cuisineType }),
      ...(minPrice !== undefined && { min_price: minPrice }),
      ...(maxPrice !== undefined && { max_price: maxPrice }),
      ...(diningStyle && { dining_style: diningStyle }),
      ...(hasSpots !== undefined && { has_spots: hasSpots }),
    };
    const response = await reservationApi.get('/events', { params });
    return response.data;
  },

  async getNearbyEvents({ lat, lng, radiusKm = 10, page = 1, perPage = 20 }) {
    const response = await reservationApi.get('/events/nearby', {
      params: { lat, lng, radius_km: radiusKm, page, per_page: perPage },
    });
    return response.data;
  },

  async getEvent(eventId) {
    const response = await reservationApi.get(`/events/${eventId}`);
    return response.data;
  },

  async createEvent(eventData) {
    const response = await reservationApi.post('/events', eventData);
    return response.data;
  },

  async createReservation({ eventId, partySize, dietaryNotes, specialRequests }) {
    const response = await reservationApi.post('/reservations', {
      event_id: eventId,
      party_size: partySize,
      dietary_notes: dietaryNotes,
      special_requests: specialRequests,
    });
    return response.data;
  },

  async getUserReservations(userId, { page = 1, perPage = 20 } = {}) {
    const response = await reservationApi.get(`/reservations/user/${userId}`, {
      params: { page, per_page: perPage },
    });
    return response.data;
  },

  async cancelReservation(reservationId, reason) {
    const response = await reservationApi.put(`/reservations/${reservationId}/cancel`, { reason });
    return response.data;
  },

  async getPendingApprovals() {
    const response = await reservationApi.get('/reservations/pending-approvals');
    return response.data;
  },

  async confirmReservation(reservationId) {
    const response = await reservationApi.put(`/reservations/${reservationId}/confirm`);
    return response.data;
  },

  async rejectReservation(reservationId) {
    const response = await reservationApi.put(`/reservations/${reservationId}/reject`);
    return response.data;
  },
};

export default eventsService;
