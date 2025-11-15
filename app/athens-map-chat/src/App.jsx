import { useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// --- Shared data -------------------------------------------------

const ATHENS_LOCATIONS = [
  {
    id: 1,
    name: 'Acropolis of Athens',
    coords: [37.9715, 23.7267],
    info: 'Ancient citadel on a rocky outcrop above Athens.',
  },
  {
    id: 2,
    name: 'Syntagma Square',
    coords: [37.9755, 23.7348],
    info: 'Central square, home of the Greek Parliament.',
  },
  {
    id: 3,
    name: 'Monastiraki',
    coords: [37.976, 23.7258],
    info: 'Famous for its flea market and vibrant streets.',
  },
  {
    id: 4,
    name: 'National Garden',
    coords: [37.9732, 23.737],
    info: 'Large public park next to the Parliament.',
  },
  {
    id: 5,
    name: 'Panathenaic Stadium',
    coords: [37.968, 23.741],
    info: 'Historic stadium, hosted the first modern Olympic Games.',
  },
];

const pinIcon = L.divIcon({
  className:
    'bg-blue-600 rounded-full border-2 border-white shadow-md w-4 h-4',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// --- Chatbot -----------------------------------------------------

async function callChatApi(message) {
  // Example: POST to your backend at /api/chat
  // Replace this with your own implementation.
  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });

    if (!res.ok) throw new Error('Network error');

    const data = await res.json();
    return data.reply; // expect { reply: "text..." }
  } catch (err) {
    console.error(err);
    return "Sorry, I couldn't reach the server. Please try again later.";
  }
}

function ChatbotPanel({ locations, onSelectLocation }) {
  const [messages, setMessages] = useState([
    {
      id: 0,
      from: 'bot',
      text: 'Hi! I am your Athens assistant. Ask me anything or pick a place from the list below 👇',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text) => {
    const userMsg = { id: Date.now(), from: 'user', text };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const replyText = await callChatApi(text);

    const botMsg = { id: Date.now() + 1, from: 'bot', text: replyText };
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
    // Tell map to focus
    onSelectLocation(loc.id);

    // Optional: also send a “virtual” message
    const text = `Show me more info about ${loc.name}`;
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
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
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

// --- Map helpers -------------------------------------------------

function MapFocus({ locations, selectedLocationId, markerRefs }) {
  const map = useMap();

  if (!selectedLocationId) return null;

  const loc = locations.find((l) => l.id === selectedLocationId);
  if (!loc) return null;

  // Fly to location and open its popup
  const marker = markerRefs.current[selectedLocationId];
  if (marker) {
    marker.openPopup();
  }
  map.flyTo(loc.coords, 16, { duration: 1 });

  return null;
}

import { useRef } from 'react';

function AthensMap({ locations, selectedLocationId, onSelectLocation }) {
  const athensCenter = [37.9838, 23.7275];
  const markerRefs = useRef({});

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <h2 className="text-lg font-semibold tracking-wide">Χάρτης (Map)</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 shadow-sm">
          Click a pin or pick a place from the chatbot.
        </div>
      </div>

      <div className="flex-1">
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
      </div>
    </div>
  );
}

// --- Root --------------------------------------------------------

export default function App() {
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  return (
    <div className="h-screen w-screen bg-slate-900 p-4">
      <div className="flex h-full overflow-hidden rounded-3xl bg-slate-950 shadow-2xl ring-1 ring-slate-800">
        {/* Left: Chatbot */}
        <div className="w-full max-w-xs border-r border-slate-800">
          <ChatbotPanel
            locations={ATHENS_LOCATIONS}
            onSelectLocation={setSelectedLocationId}
          />
        </div>

        {/* Right: Map */}
        <div className="flex-1">
          <AthensMap
            locations={ATHENS_LOCATIONS}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />
        </div>
      </div>
    </div>
  );
}
