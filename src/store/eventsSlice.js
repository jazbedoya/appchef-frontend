import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import eventsService from '../services/eventsService';

export const fetchEvents = createAsyncThunk('events/fetchEvents', async (filters = {}, { rejectWithValue }) => {
  try {
    return await eventsService.getEvents(filters);
  } catch (error) {
    return rejectWithValue(error.userMessage || 'Error cargando eventos');
  }
});

export const fetchNearbyEvents = createAsyncThunk('events/fetchNearby', async (params, { rejectWithValue }) => {
  try {
    return await eventsService.getNearbyEvents(params);
  } catch (error) {
    return rejectWithValue(error.userMessage || 'Error');
  }
});

export const fetchUserReservations = createAsyncThunk('events/fetchReservations', async (userId, { rejectWithValue }) => {
  try {
    // userId may be passed as a plain ID or as an object { userId: id }
    const resolvedId = (userId && typeof userId === 'object') ? (userId.userId || userId.id) : userId;
    return await eventsService.getUserReservations(resolvedId);
  } catch (error) {
    return rejectWithValue(error.userMessage || 'Error');
  }
});

export const fetchEventById = createAsyncThunk(
  'events/fetchEventById',
  async (eventId, { rejectWithValue }) => {
    try {
      return await eventsService.getEvent(eventId);
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Error cargando evento');
    }
  },
);

export const createReservation = createAsyncThunk(
  'events/createReservation',
  async (reservationData, { rejectWithValue }) => {
    try {
      return await eventsService.createReservation(reservationData);
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Error al reservar');
    }
  },
);

export const fetchPendingApprovals = createAsyncThunk(
  'events/fetchPendingApprovals',
  async (_, { rejectWithValue }) => {
    try {
      return await eventsService.getPendingApprovals();
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Error cargando solicitudes');
    }
  },
);

export const approveReservation = createAsyncThunk(
  'events/approveReservation',
  async (reservationId, { rejectWithValue }) => {
    try {
      return await eventsService.confirmReservation(reservationId);
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Error al aprobar');
    }
  },
);

export const rejectReservation = createAsyncThunk(
  'events/rejectReservation',
  async (reservationId, { rejectWithValue }) => {
    try {
      return await eventsService.rejectReservation(reservationId);
    } catch (error) {
      return rejectWithValue(error.userMessage || 'Error al rechazar');
    }
  },
);

const eventsSlice = createSlice({
  name: 'events',
  initialState: {
    events: [],
    nearbyEvents: [],
    currentEvent: null,
    myReservations: [],
    pendingApprovals: [],
    isLoading: false,
    isLoadingDetail: false,
    isBooking: false,
    error: null,
    bookingError: null,
    lastBooking: null,
    totalCount: 0,
  },
  reducers: {
    setCurrentEvent: (state, action) => { state.currentEvent = action.payload; },
    clearEvents: (state) => { state.events = []; state.nearbyEvents = []; },
    clearCurrentEvent: (state) => { state.currentEvent = null; },
    clearError: (state) => { state.error = null; },
    clearBookingError: (state) => { state.bookingError = null; },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchEvents.pending, state => { state.isLoading = true; state.error = null; })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        // handle both array and paginated response
        state.events = Array.isArray(action.payload) ? action.payload : (action.payload?.items || action.payload?.events || []);
        state.totalCount = action.payload?.total || state.events.length;
      })
      .addCase(fetchEvents.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(fetchNearbyEvents.fulfilled, (state, action) => {
        state.nearbyEvents = Array.isArray(action.payload) ? action.payload : (action.payload?.items || action.payload?.events || []);
      })

      .addCase(fetchUserReservations.fulfilled, (state, action) => {
        state.myReservations = Array.isArray(action.payload) ? action.payload : (action.payload?.items || action.payload?.reservations || []);
      })

      .addCase(fetchEventById.pending, state => { state.isLoadingDetail = true; state.currentEvent = null; })
      .addCase(fetchEventById.fulfilled, (state, action) => { state.isLoadingDetail = false; state.currentEvent = action.payload; })
      .addCase(fetchEventById.rejected, (state, action) => { state.isLoadingDetail = false; state.error = action.payload; })

      .addCase(createReservation.pending, state => { state.isBooking = true; state.bookingError = null; state.lastBooking = null; })
      .addCase(createReservation.fulfilled, (state, action) => {
        state.isBooking = false;
        state.lastBooking = action.payload;
        state.myReservations = [action.payload, ...state.myReservations];
      })
      .addCase(createReservation.rejected, (state, action) => { state.isBooking = false; state.bookingError = action.payload; })

      .addCase(fetchPendingApprovals.fulfilled, (state, action) => {
        state.pendingApprovals = action.payload?.reservations || [];
      })

      .addCase(approveReservation.fulfilled, (state, action) => {
        state.pendingApprovals = state.pendingApprovals.filter(r => r.id !== action.payload.id);
      })

      .addCase(rejectReservation.fulfilled, (state, action) => {
        state.pendingApprovals = state.pendingApprovals.filter(r => r.id !== action.payload.id);
      });
  },
});

export const { setCurrentEvent, clearEvents, clearCurrentEvent, clearError, clearBookingError } = eventsSlice.actions;
export const selectPendingApprovals = state => state.events.pendingApprovals;
export const selectEvents = state => state.events.events;
export const selectNearbyEvents = state => state.events.nearbyEvents;
export const selectEventsLoading = state => state.events.isLoading;
export const selectEventsError = state => state.events.error;
export const selectCurrentEvent = state => state.events.currentEvent;
export const selectMyReservations = state => state.events.myReservations;
export const selectIsBooking = state => state.events.isBooking;
export const selectBookingError = state => state.events.bookingError;
export const selectLastBooking = state => state.events.lastBooking;
export const selectIsLoadingDetail = state => state.events.isLoadingDetail;
export default eventsSlice.reducer;
