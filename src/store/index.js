import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import eventsReducer from './eventsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
  },
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore Date objects in actions/state
        ignoredActions: ['events/setEvents', 'events/addEvent', 'events/setCurrentEvent'],
        ignoredPaths: ['events.events', 'events.currentEvent', 'events.nearbyEvents'],
      },
    }),
});

export default store;
