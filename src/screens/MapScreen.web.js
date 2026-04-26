import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { fetchEvents, selectEvents } from '../store/eventsSlice';
import { fetchNearbyUsers, selectNearbyUsers, selectUsersLoading } from '../store/usersSlice';

// Fix broken default marker icons when bundled with webpack/metro
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('mapscreen-styles')) {
  const style = document.createElement('style');
  style.id = 'mapscreen-styles';
  style.textContent = `
    @keyframes slideUp {
      from { opacity: 0; transform: translateX(-50%) translateY(16px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

// --- Helpers ---

const createPinIcon = (price, isSelected = false) =>
  L.divIcon({
    className: '',
    html: `<div style="
      background: ${isSelected ? '#D4A853' : '#2C3E2D'};
      color: ${isSelected ? 'white' : '#D4A853'};
      padding: 6px 10px;
      border-radius: 20px;
      font-weight: 700;
      font-size: 13px;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
      white-space: nowrap;
      border: 2px solid ${isSelected ? 'white' : '#D4A853'};
      cursor: pointer;
      transition: all 0.15s ease;
    ">€${price}</div>`,
    iconSize: [50, 30],
    iconAnchor: [25, 30],
  });

const createPersonPinIcon = (user, isSelected = false) => {
  const label = user.profile?.first_name || user.username || '?';
  const isHost = user.profile?.is_host;
  const emoji = isHost ? '👨‍🍳' : '👤';

  let bg = isSelected ? '#C4622D' : (isHost ? '#2C3E2D' : '#FDFAF5');
  let color = isSelected ? 'white' : (isHost ? '#D4A853' : '#2C3E2D');
  let border = isSelected ? 'white' : '#C9963A';

  return L.divIcon({
    className: '',
    html: `<div style="
      background: ${bg};
      color: ${color};
      padding: 5px 10px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 12px;
      font-family: 'DM Sans', sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      white-space: nowrap;
      border: 2px solid ${border};
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
    ">${emoji} ${label}</div>`,
    iconSize: [null, 30],
    iconAnchor: [40, 30],
  });
};

const userLocationIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;background:#4A90E2;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m de ti`;
  if (km < 10) return `${km.toFixed(1)} km de ti`;
  return `${Math.round(km)} km de ti`;
}

const CUISINE_IMAGES = {
  Italiana:     'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
  Japonesa:     'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
  Vegana:       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  Española:     'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&q=80',
  Mediterránea: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
  Marroquí:     'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  Francesa:     'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
};
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80';
const getEventImage = (event) => event.cover_image_url || CUISINE_IMAGES[event.cuisine_type] || DEFAULT_IMAGE;

// --- Component ---

const MapScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const allEvents = useSelector(selectEvents);
  const nearbyUsers = useSelector(selectNearbyUsers);
  const usersLoading = useSelector(selectUsersLoading);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef(new Map());      // event.id → marker
  const personMarkerRefs = useRef(new Map()); // user.id → marker
  const userMarkerRef = useRef(null);

  const [mode, setMode] = useState('events'); // 'events' | 'people'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Fetch events on mount
  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  // Fetch nearby users when switching to people mode (if we already have location)
  useEffect(() => {
    if (mode === 'people' && userLocation) {
      dispatch(fetchNearbyUsers({ lat: userLocation.lat, lng: userLocation.lng, radius_km: 50 }));
    }
  }, [mode, userLocation, dispatch]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 6);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const loc = { lat: latitude, lng: longitude };
          setUserLocation(loc);
          map.setView([latitude, longitude], 7);

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            userMarkerRef.current = L.marker([latitude, longitude], { icon: userLocationIcon })
              .addTo(map)
              .bindTooltip('Tu ubicación', { permanent: false });
          }
        },
        () => {}
      );
    }

    map.on('click', () => { setSelectedEvent(null); setSelectedUser(null); });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRefs.current.clear();
      personMarkerRefs.current.clear();
      userMarkerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show/hide event markers based on mode
  useEffect(() => {
    markerRefs.current.forEach(marker => {
      if (mode === 'events') marker.addTo(mapRef.current);
      else marker.remove();
    });
  }, [mode]);

  // Show/hide person markers based on mode
  useEffect(() => {
    personMarkerRefs.current.forEach(marker => {
      if (mode === 'people') marker.addTo(mapRef.current);
      else marker.remove();
    });
  }, [mode]);

  // Events with distance
  const eventsWithDistance = useMemo(() => {
    const enriched = allEvents
      .filter(e => e.latitude && e.longitude)
      .map(e => ({
        ...e,
        distanceKm: userLocation
          ? getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(e.latitude), parseFloat(e.longitude))
          : null,
      }));
    if (userLocation) enriched.sort((a, b) => a.distanceKm - b.distanceKm);
    return enriched;
  }, [allEvents, userLocation]);

  // Users with distance
  const usersWithDistance = useMemo(() => {
    return nearbyUsers
      .filter(u => u.profile?.latitude && u.profile?.longitude)
      .map(u => ({
        ...u,
        distanceKm: userLocation
          ? getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(u.profile.latitude), parseFloat(u.profile.longitude))
          : null,
      }))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [nearbyUsers, userLocation]);

  // Paint event markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const incomingIds = new Set(eventsWithDistance.map(e => e.id));
    markerRefs.current.forEach((marker, id) => {
      if (!incomingIds.has(id)) { marker.remove(); markerRefs.current.delete(id); }
    });

    eventsWithDistance.forEach(event => {
      const lat = parseFloat(event.latitude);
      const lng = parseFloat(event.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const price = parseFloat(event.price_per_person || 0).toFixed(0);
      const isSelected = selectedEvent?.id === event.id;

      if (markerRefs.current.has(event.id)) {
        markerRefs.current.get(event.id).setIcon(createPinIcon(price, isSelected));
      } else {
        const marker = L.marker([lat, lng], { icon: createPinIcon(price, false) });
        if (mode === 'events') marker.addTo(map);
        marker.on('click', (e) => { L.DomEvent.stopPropagation(e); setSelectedEvent(event); });
        markerRefs.current.set(event.id, marker);
      }
    });
  }, [eventsWithDistance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update event pin colors on selection change
  useEffect(() => {
    eventsWithDistance.forEach(event => {
      const marker = markerRefs.current.get(event.id);
      if (!marker) return;
      marker.setIcon(createPinIcon(parseFloat(event.price_per_person || 0).toFixed(0), selectedEvent?.id === event.id));
    });
  }, [selectedEvent, eventsWithDistance]);

  // Paint person markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const incomingIds = new Set(usersWithDistance.map(u => u.id));
    personMarkerRefs.current.forEach((marker, id) => {
      if (!incomingIds.has(id)) { marker.remove(); personMarkerRefs.current.delete(id); }
    });

    usersWithDistance.forEach(user => {
      const lat = parseFloat(user.profile.latitude);
      const lng = parseFloat(user.profile.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const isSelected = selectedUser?.id === user.id;

      if (personMarkerRefs.current.has(user.id)) {
        personMarkerRefs.current.get(user.id).setIcon(createPersonPinIcon(user, isSelected));
      } else {
        const marker = L.marker([lat, lng], { icon: createPersonPinIcon(user, false) });
        if (mode === 'people') marker.addTo(map);
        marker.on('click', (e) => { L.DomEvent.stopPropagation(e); setSelectedUser(user); });
        personMarkerRefs.current.set(user.id, marker);
      }
    });
  }, [usersWithDistance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update person pin colors on selection change
  useEffect(() => {
    usersWithDistance.forEach(user => {
      const marker = personMarkerRefs.current.get(user.id);
      if (!marker) return;
      marker.setIcon(createPersonPinIcon(user, selectedUser?.id === user.id));
    });
  }, [selectedUser, usersWithDistance]);

  const handleModeChange = useCallback((newMode) => {
    setMode(newMode);
    setSelectedEvent(null);
    setSelectedUser(null);
  }, []);

  // --- Derived values ---
  const nearest = eventsWithDistance[0];
  const counterText = mode === 'events'
    ? eventsWithDistance.length === 0
      ? 'Sin cenas disponibles'
      : userLocation && nearest?.distanceKm != null
        ? `${eventsWithDistance.length} cenas disponibles · más cercana a ${formatDistance(nearest.distanceKm)}`
        : `${eventsWithDistance.length} cenas disponibles`
    : usersLoading
      ? 'Buscando personas cercanas...'
      : `${usersWithDistance.length} personas cercanas`;

  const selectedDistance = selectedEvent && userLocation
    ? getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(selectedEvent.latitude), parseFloat(selectedEvent.longitude))
    : null;

  // --- Render ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── MAP SECTION (60vh) ── */}
      <div style={{ position: 'relative', height: '60vh', flexShrink: 0 }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Toggle Cenas / Personas — flotante sobre el mapa */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          display: 'flex',
          background: 'rgba(255,255,255,0.95)',
          borderRadius: '24px',
          padding: '4px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          backdropFilter: 'blur(8px)',
        }}>
          {[
            { key: 'events', label: '🍽 Cenas' },
            { key: 'people', label: '👤 Personas' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              style={{
                padding: '6px 18px',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '13px',
                transition: 'all 0.15s ease',
                background: mode === key ? '#2C3E2D' : 'transparent',
                color: mode === key ? '#D4A853' : '#7a6a5a',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Mini floating card — evento seleccionado */}
        {mode === 'events' && selectedEvent && (
          <div style={{
            position: 'absolute',
            bottom: '44%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            width: '280px',
            display: 'flex',
            gap: '12px',
            padding: '12px',
            zIndex: 1000,
            animation: 'slideUp 0.2s ease',
          }}>
            <img
              src={getEventImage(selectedEvent)}
              alt={selectedEvent.title || 'Evento'}
              style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#2C3E2D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedEvent.title || 'Evento'}
              </div>
              <div style={{ fontSize: '12px', color: '#7A7A6E', margin: '4px 0' }}>
                👨‍🍳 {selectedEvent.host_name || 'Chef'}
              </div>
              {selectedDistance != null && (
                <div style={{ fontSize: '12px', color: '#7A7A6E' }}>📍 {formatDistance(selectedDistance)}</div>
              )}
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#D4A853', margin: '4px 0' }}>
                €{parseFloat(selectedEvent.price_per_person || 0).toFixed(0)}/persona
              </div>
              <button
                onClick={() => navigation.navigate('EventDetailFromMap', { eventId: selectedEvent.id })}
                style={{ background: '#2C3E2D', color: '#D4A853', border: 'none', borderRadius: '9999px', padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Ver mesa →
              </button>
            </div>
          </div>
        )}

        {/* Mini floating card — persona seleccionada */}
        {mode === 'people' && selectedUser && (
          <div style={{
            position: 'absolute',
            bottom: '44%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            width: '280px',
            padding: '14px',
            zIndex: 1000,
            animation: 'slideUp 0.2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {/* Avatar inicial */}
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: selectedUser.profile?.is_host ? '#2C3E2D' : '#EDE8DF',
                color: selectedUser.profile?.is_host ? '#D4A853' : '#2C3E2D',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 700, flexShrink: 0,
              }}>
                {selectedUser.profile?.is_host ? '👨‍🍳' : (selectedUser.profile?.first_name?.[0] || '?')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#2C3E2D' }}>
                  {((selectedUser.profile?.first_name || '') + ' ' + (selectedUser.profile?.last_name || '')).trim() || selectedUser.username}
                </div>
                {selectedUser.profile?.is_host && (
                  <span style={{ background: '#D4A853', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                    Anfitrión
                  </span>
                )}
              </div>
            </div>
            {selectedUser.profile?.city && (
              <div style={{ fontSize: '12px', color: '#7A7A6E', marginBottom: '4px' }}>
                📍 {selectedUser.profile.city}
                {selectedUser.distanceKm != null && ` · ${formatDistance(selectedUser.distanceKm)}`}
              </div>
            )}
            {selectedUser.profile?.average_host_rating && (
              <div style={{ fontSize: '12px', color: '#7A7A6E', marginBottom: '4px' }}>
                ⭐ {selectedUser.profile.average_host_rating.toFixed(1)} · {selectedUser.profile.total_dinners_hosted} cenas organizadas
              </div>
            )}
            {selectedUser.profile?.bio && (
              <div style={{ fontSize: '12px', color: '#5a4a3a', fontStyle: 'italic', marginBottom: '8px', lineHeight: 1.4 }}>
                "{selectedUser.profile.bio.substring(0, 80)}{selectedUser.profile.bio.length > 80 ? '…' : ''}"
              </div>
            )}
            <button
              onClick={() => navigation.navigate('UserProfile', { userId: selectedUser.id })}
              style={{ background: '#2C3E2D', color: '#D4A853', border: 'none', borderRadius: '9999px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', width: '100%' }}
            >
              Ver perfil →
            </button>
          </div>
        )}
      </div>

      {/* ── LIST SECTION (40vh) ── */}
      <div style={{ height: '40vh', display: 'flex', flexDirection: 'column', background: '#FAFAF8', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 10px', fontWeight: 700, fontSize: '15px', color: '#2C3E2D', borderBottom: '1px solid #EDEDE8', flexShrink: 0 }}>
          {mode === 'events' ? '🍽️' : '👤'} {counterText}
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* ── EVENTOS ── */}
          {mode === 'events' && eventsWithDistance.map(event => {
            const price = parseFloat(event.price_per_person || 0).toFixed(0);
            const isSelected = selectedEvent?.id === event.id;
            return (
              <div
                key={event.id}
                onClick={() => {
                  if (isSelected) { navigation.navigate('EventDetailFromMap', { eventId: event.id }); return; }
                  setSelectedEvent(event);
                  if (mapRef.current && event.latitude && event.longitude) {
                    mapRef.current.setView([parseFloat(event.latitude), parseFloat(event.longitude)], 13, { animate: true });
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: isSelected ? '#F5F0E8' : 'white',
                  border: `1.5px solid ${isSelected ? '#D4A853' : '#EDEDE8'}`,
                  borderRadius: '14px', padding: '10px 12px', cursor: 'pointer',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                <img src={getEventImage(event)} alt={event.title || 'Evento'} style={{ width: '60px', height: '60px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#2C3E2D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.title || 'Evento'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7A7A6E', marginTop: '2px' }}>👨‍🍳 {event.host_name || 'Chef'}</div>
                  {event.distanceKm != null && (
                    <div style={{ fontSize: '12px', color: '#D4A853', fontWeight: 600, marginTop: '2px' }}>📍 {formatDistance(event.distanceKm)}</div>
                  )}
                </div>
                <div style={{
                  background: isSelected ? '#D4A853' : '#2C3E2D',
                  color: isSelected ? 'white' : '#D4A853',
                  borderRadius: '20px', padding: '5px 10px', fontSize: '13px',
                  fontWeight: 700, flexShrink: 0, border: `2px solid ${isSelected ? 'white' : '#D4A853'}`,
                }}>€{price}</div>
              </div>
            );
          })}

          {mode === 'events' && eventsWithDistance.length === 0 && (
            <div style={{ textAlign: 'center', color: '#7A7A6E', fontSize: '14px', marginTop: '24px' }}>
              No hay cenas disponibles.
            </div>
          )}

          {/* ── PERSONAS ── */}
          {mode === 'people' && usersLoading && (
            <div style={{ textAlign: 'center', color: '#7A7A6E', fontSize: '14px', marginTop: '24px' }}>
              Buscando personas cercanas...
            </div>
          )}

          {mode === 'people' && !usersLoading && usersWithDistance.map(user => {
            const isSelected = selectedUser?.id === user.id;
            const name = ((user.profile?.first_name || '') + ' ' + (user.profile?.last_name || '')).trim() || user.username;
            const isHost = user.profile?.is_host;
            return (
              <div
                key={user.id}
                onClick={() => {
                  setSelectedUser(isSelected ? null : user);
                  if (!isSelected && mapRef.current && user.profile?.latitude && user.profile?.longitude) {
                    mapRef.current.setView([parseFloat(user.profile.latitude), parseFloat(user.profile.longitude)], 13, { animate: true });
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: isSelected ? '#F5F0E8' : 'white',
                  border: `1.5px solid ${isSelected ? '#D4A853' : '#EDEDE8'}`,
                  borderRadius: '14px', padding: '10px 12px', cursor: 'pointer',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '52px', height: '52px', borderRadius: '50%', flexShrink: 0,
                  background: isHost ? '#2C3E2D' : '#EDE8DF',
                  color: isHost ? '#D4A853' : '#2C3E2D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px', fontWeight: 700,
                }}>
                  {isHost ? '👨‍🍳' : (user.profile?.first_name?.[0]?.toUpperCase() || '?')}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: '#2C3E2D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                    {isHost && (
                      <span style={{ background: '#D4A853', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', flexShrink: 0 }}>
                        Anfitrión
                      </span>
                    )}
                  </div>
                  {user.profile?.city && (
                    <div style={{ fontSize: '12px', color: '#7A7A6E' }}>
                      📍 {user.profile.city}
                      {user.distanceKm != null && ` · ${formatDistance(user.distanceKm)}`}
                    </div>
                  )}
                  {isHost && user.profile?.average_host_rating && (
                    <div style={{ fontSize: '12px', color: '#D4A853', fontWeight: 600 }}>
                      ⭐ {user.profile.average_host_rating.toFixed(1)} · {user.profile.total_dinners_hosted} cenas
                    </div>
                  )}
                  {user.profile?.bio && (
                    <div style={{ fontSize: '11px', color: '#7A7A6E', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      "{user.profile.bio}"
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); navigation.navigate('UserProfile', { userId: user.id }); }}
                  style={{ background: '#2C3E2D', color: '#D4A853', border: 'none', borderRadius: '20px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                >
                  Ver →
                </button>
              </div>
            );
          })}

          {mode === 'people' && !usersLoading && usersWithDistance.length === 0 && (
            <div style={{ textAlign: 'center', color: '#7A7A6E', fontSize: '14px', marginTop: '24px' }}>
              {userLocation ? 'No hay personas cercanas en un radio de 50 km.' : 'Activa la ubicación para ver personas cercanas.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapScreen;
