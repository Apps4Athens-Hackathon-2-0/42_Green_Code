// src/App.jsx
import { useState, useRef, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Simple circular marker icon
const pinIcon = L.divIcon({
  className:
    'bg-blue-600 rounded-full border-2 border-white shadow-md w-4 h-4',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ----------------- API helpers -----------------

async function callChatApi(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    throw new Error('Network error');
  }

  const data = await res.json();
  // Expected: { reply: string, placeName: string | null }
  return data;
}

async function fetchLocations() {
  const res = await fetch('/api/locations');
  if (!res.ok) {
    throw new Error('Failed to load locations');
  }
  const data = await res.json();
  return data.locations; // [{ id, name, coords, info }, ...]
}

// ----------------- Chatbot -----------------

function ChatbotPanel({ locations, onSelectLocation, locationsLoading }) {
  const [messages, setMessages] = useState([
    {
      id: 0,
      from: 'bot',
      text: 'Hi! Ask me about Athens or any of the places below, and I’ll highlight them on the map 👋',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const findLocationFromName = (placeName) => {
    if (!placeName) return null;
    const target = placeName.toLowerCase();

    return (
      locations.find(
        (loc) =>
          loc.name.toLowerCase() === target ||
          loc.name.toLowerCase().includes(target) ||
          target.includes(loc.name.toLowerCase())
      ) || null
    );
  };

  const sendMessage = async (text) => {
    const userMsg = { id: Date.now(), from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    let reply = '';
    let placeName = null;

    try {
      const result = await callChatApi(text);
      reply = result.reply;
      placeName = result.placeName;
      console.log('API result:', result, typeof result);
      console.log('Reply:', reply);
      console.log('Determined placeName:', placeName);
    } catch (err) {
      console.error(err);
      reply =
        "Sorry, I had a problem talking to my brain in the cloud. Please try again in a moment.";
      placeName = null;
    }

    let highlightedLoc = findLocationFromName(placeName);
    if (highlightedLoc) {
      onSelectLocation(highlightedLoc.id);
      reply += `\n\n(I’ve highlighted **${highlightedLoc.name}** on the map.)`;
    }

    const botMsg = {
      id: Date.now() + 1,
      from: 'bot',
      text: reply,
    };

    setMessages((prev) => [...prev, botMsg]);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    await sendMessage(trimmed);
  };

  const handleSelectPlace = async (loc) => {
    if (!loc) return;
    onSelectLocation(loc.id);
    const text = `Tell me about ${loc.name} in Athens.`;
    await sendMessage(text);
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-50">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-wide">Chatbot</h1>
        <p className="text-xs text-slate-400">
          Ask about Athens or tap a place to jump on the map.
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${
              m.from === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.from === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-100'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-xs text-slate-400">Thinking…</div>
        )}
      </div>

      {/* Places list */}
      <div className="border-t border-slate-800 px-3 py-2 max-h-40 overflow-y-auto">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Places in Athens
        </div>
        {locationsLoading && (
          <div className="text-xs text-slate-500">Loading places…</div>
        )}
        {!locationsLoading && locations.length === 0 && (
          <div className="text-xs text-slate-500">
            No places available from the API.
          </div>
        )}
        <div className="space-y-1">
          {locations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelectPlace(loc)}
              className="w-full rounded-xl bg-slate-800/70 px-3 py-2 text-left text-xs hover:bg-slate-700"
            >
              {loc.name}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-t border-slate-800 px-3 py-2"
      >
        <input
          className="flex-1 rounded-full bg-slate-800 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 active:bg-blue-700 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </div>
  );
}

// ----------------- Map helpers -----------------

function MapFocus({ locations, selectedLocationId, markerRefs }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedLocationId) return;
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) return;

    map.flyTo(loc.coords, 16, { duration: 1 });

    const marker = markerRefs.current[selectedLocationId];
    if (marker) {
      marker.openPopup();
    }
  }, [selectedLocationId, locations, map, markerRefs]);

  return null;
}

function AthensMap({ locations, selectedLocationId, onSelectLocation, locationsLoading }) {
  const athensCenter = [37.9838, 23.7275];
  const markerRefs = useRef({});

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <h2 className="text-lg font-semibold tracking-wide">Χάρτης (Map)</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 shadow-sm">
          Click a pin or ask the chatbot about a place.
        </div>
      </div>

      <div className="flex-1">
        {locationsLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-500">
            Loading map locations…
          </div>
        ) : (
          <MapContainer
            center={athensCenter}
            zoom={14}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {locations.map((loc) => (
              <Marker
                key={loc.id}
                position={loc.coords}
                icon={pinIcon}
                title={loc.name}
                eventHandlers={{
                  click: () => onSelectLocation(loc.id),
                }}
                ref={(ref) => {
                  if (ref) markerRefs.current[loc.id] = ref;
                }}
              >
                <Popup>
                  <div className="space-y-1">
                    <div className="font-semibold">{loc.name}</div>
                    <div className="text-xs text-slate-700">{loc.info}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

            <MapFocus
              locations={locations}
              selectedLocationId={selectedLocationId}
              markerRefs={markerRefs}
            />
          </MapContainer>
        )}
      </div>
    </div>
  );
}

// ----------------- Root -----------------

export default function App() {
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [locationsError, setLocationsError] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const locs = await fetchLocations();
        setLocations(locs);
      } catch (err) {
        console.error(err);
        setLocationsError('Failed to load locations from the API.');
      } finally {
        setLocationsLoading(false);
      }
    })();
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-900 p-4">
      <div className="flex h-full overflow-hidden rounded-3xl bg-slate-950 shadow-2xl ring-1 ring-slate-800">
        {/* Left: Chatbot */}
        <div className="w-full max-w-xs border-r border-slate-800">
          {locationsError ? (
            <div className="flex h-full items-center justify-center px-4 text-sm text-red-400">
              {locationsError}
            </div>
          ) : (
            <ChatbotPanel
              locations={locations}
              locationsLoading={locationsLoading}
              onSelectLocation={setSelectedLocationId}
            />
          )}
        </div>

        {/* Right: Map */}
        <div className="flex-1">
          {locationsError ? (
            <div className="flex h-full items-center justify-center text-sm text-red-500">
              {locationsError}
            </div>
          ) : (
            <AthensMap
              locations={locations}
              locationsLoading={locationsLoading}
              selectedLocationId={selectedLocationId}
              onSelectLocation={setSelectedLocationId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
