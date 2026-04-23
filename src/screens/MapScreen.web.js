import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { fetchEvents, selectEvents } from '../store/eventsSlice';

// Fix broken default marker icons when bundled with webpack/metro
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Inject slideUp keyframe animation once
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

const userIcon = L.divIcon({
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
  Italiana:      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
  Japonesa:      'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&q=80',
  Vegana:        'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
  Española:      'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400&q=80',
  Mediterránea:  'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&q=80',
  Marroquí:      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&q=80',
  Francesa:      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80',
};

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80';

const getEventImage = (event) => {
  if (event.cover_image_url) return event.cover_image_url;
  return CUISINE_IMAGES[event.cuisine_type] || DEFAULT_IMAGE;
};

// --- Component ---

const MapScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const allEvents = useSelector(selectEvents);

  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRefs = useRef(new Map()); // event.id → Leaflet marker
  const userMarkerRef = useRef(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Fetch all published events on mount
  useEffect(() => {
    dispatch(fetchEvents());
  }, [dispatch]);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([40.4168, -3.7038], 6);
    mapRef.current = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    // Geolocation: center map on user, save to localStorage
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const userLoc = { lat: latitude, lng: longitude };
          localStorage.setItem('userLocation', JSON.stringify(userLoc));
          setUserLocation(userLoc);

          map.setView([latitude, longitude], 7);

          if (userMarkerRef.current) {
            userMarkerRef.current.setLatLng([latitude, longitude]);
          } else {
            userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
              .addTo(map)
              .bindTooltip('Tu ubicación', { permanent: false });
          }
        },
        () => {
          // Permission denied — stay on default Spain view
        }
      );
    }

    // Close mini card when clicking on the map background
    map.on('click', () => setSelectedEvent(null));

    return () => {
      map.remove();
      mapRef.current = null;
      markerRefs.current.clear();
      userMarkerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Events enriched with distance, sorted nearest first
  const eventsWithDistance = useMemo(() => {
    const enriched = allEvents
      .filter((e) => e.latitude && e.longitude)
      .map((e) => ({
        ...e,
        distanceKm: userLocation
          ? getDistanceKm(userLocation.lat, userLocation.lng, parseFloat(e.latitude), parseFloat(e.longitude))
          : null,
      }));

    if (userLocation) {
      enriched.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return enriched;
  }, [allEvents, userLocation]);

  // Paint / update event markers whenever eventsWithDistance changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const incomingIds = new Set(eventsWithDistance.map((e) => e.id));
    markerRefs.current.forEach((marker, id) => {
      if (!incomingIds.has(id)) {
        marker.remove();
        markerRefs.current.delete(id);
      }
    });

    eventsWithDistance.forEach((event) => {
      const lat = parseFloat(event.latitude);
      const lng = parseFloat(event.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const price = parseFloat(event.price_per_person || 0).toFixed(0);
      const isSelected = selectedEvent && selectedEvent.id === event.id;

      if (markerRefs.current.has(event.id)) {
        markerRefs.current.get(event.id).setIcon(createPinIcon(price, isSelected));
      } else {
        const marker = L.marker([lat, lng], { icon: createPinIcon(price, false) }).addTo(map);
        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedEvent(event);
        });
        markerRefs.current.set(event.id, marker);
      }
    });
  }, [eventsWithDistance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update pin icons when selection changes
  useEffect(() => {
    eventsWithDistance.forEach((event) => {
      const marker = markerRefs.current.get(event.id);
      if (!marker) return;
      const price = parseFloat(event.price_per_person || 0).toFixed(0);
      const isSelected = selectedEvent && selectedEvent.id === event.id;
      marker.setIcon(createPinIcon(price, isSelected));
    });
  }, [selectedEvent, eventsWithDistance]);

  // --- Derived values ---
  const selectedPrice = selectedEvent
    ? parseFloat(selectedEvent.price_per_person || 0).toFixed(0)
    : null;

  const selectedDistance =
    selectedEvent && userLocation && selectedEvent.latitude && selectedEvent.longitude
      ? getDistanceKm(
          userLocation.lat,
          userLocation.lng,
          parseFloat(selectedEvent.latitude),
          parseFloat(selectedEvent.longitude)
        )
      : null;

  const nearest = eventsWithDistance[0];
  const counterText = eventsWithDistance.length === 0
    ? 'Sin eventos disponibles'
    : userLocation && nearest?.distanceKm != null
      ? `${eventsWithDistance.length} cenas disponibles · más cercana a ${formatDistance(nearest.distanceKm)}`
      : `${eventsWithDistance.length} cenas disponibles`;

  // --- Render ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── MAP SECTION (60vh) ── */}
      <div style={{ position: 'relative', height: '60vh', flexShrink: 0 }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

        {/* Mini floating card */}
        {selectedEvent && (
          <div
            style={{
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
            }}
          >
            <img
              src={getEventImage(selectedEvent)}
              alt={selectedEvent.title || 'Evento'}
              style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '14px',
                  color: '#2C3E2D',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedEvent.title || 'Evento'}
              </div>
              <div style={{ fontSize: '12px', color: '#7A7A6E', margin: '4px 0' }}>
                👨‍🍳 {selectedEvent.host_name || 'Chef'}
              </div>
              {selectedDistance != null && (
                <div style={{ fontSize: '12px', color: '#7A7A6E' }}>
                  📍 {formatDistance(selectedDistance)}
                </div>
              )}
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#D4A853', margin: '4px 0' }}>
                €{selectedPrice}/persona
              </div>
              <button
                onClick={() => navigation.navigate('EventDetailFromMap', { eventId: selectedEvent.id })}
                style={{
                  background: '#2C3E2D',
                  color: '#D4A853',
                  border: 'none',
                  borderRadius: '9999px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Ver mesa →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── EVENT LIST SECTION (40vh) ── */}
      <div
        style={{
          height: '40vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FAFAF8',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px 10px',
            fontWeight: 700,
            fontSize: '15px',
            color: '#2C3E2D',
            borderBottom: '1px solid #EDEDE8',
            flexShrink: 0,
          }}
        >
          🍽️ {counterText}
        </div>

        {/* Scrollable cards */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {eventsWithDistance.map((event) => {
            const price = parseFloat(event.price_per_person || 0).toFixed(0);
            const isSelected = selectedEvent && selectedEvent.id === event.id;

            return (
              <div
                key={event.id}
                onClick={() => {
                  if (isSelected) {
                    // Second tap → navigate to detail
                    navigation.navigate('EventDetailFromMap', { eventId: event.id });
                    return;
                  }
                  setSelectedEvent(event);
                  const map = mapRef.current;
                  if (map && event.latitude && event.longitude) {
                    map.setView(
                      [parseFloat(event.latitude), parseFloat(event.longitude)],
                      13,
                      { animate: true }
                    );
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: isSelected ? '#F5F0E8' : 'white',
                  border: isSelected ? '1.5px solid #D4A853' : '1.5px solid #EDEDE8',
                  borderRadius: '14px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              >
                {/* Cover image */}
                <img
                  src={getEventImage(event)}
                  alt={event.title || 'Evento'}
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '14px',
                      color: '#2C3E2D',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {event.title || 'Evento'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#7A7A6E', marginTop: '2px' }}>
                    👨‍🍳 {event.host_name || 'Chef'}
                  </div>
                  {event.distanceKm != null && (
                    <div style={{ fontSize: '12px', color: '#D4A853', fontWeight: 600, marginTop: '2px' }}>
                      📍 {formatDistance(event.distanceKm)}
                    </div>
                  )}
                </div>

                {/* Price badge */}
                <div
                  style={{
                    background: isSelected ? '#D4A853' : '#2C3E2D',
                    color: isSelected ? 'white' : '#D4A853',
                    borderRadius: '20px',
                    padding: '5px 10px',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0,
                    border: `2px solid ${isSelected ? 'white' : '#D4A853'}`,
                  }}
                >
                  €{price}
                </div>
              </div>
            );
          })}

          {eventsWithDistance.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                color: '#7A7A6E',
                fontSize: '14px',
                marginTop: '24px',
              }}
            >
              No hay cenas disponibles.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapScreen;
