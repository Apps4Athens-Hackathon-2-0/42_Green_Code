import { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Simple circular marker icon using divIcon (no external images needed)
const pinIcon = L.divIcon({
  className:
    'bg-blue-600 rounded-full border-2 border-white shadow-md w-4 h-4',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Some sample points of interest in Athens
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
    coords: [37.9760, 23.7258],
    info: 'Famous for its flea market and vibrant streets.',
  },
  {
    id: 4,
    name: 'National Garden',
    coords: [37.9732, 23.7370],
    info: 'Large public park next to the Parliament.',
  },
  {
    id: 5,
    name: 'Panathenaic Stadium',
    coords: [37.9680, 23.7410],
    info: 'Historic stadium, hosted the first modern Olympic Games.',
  },
];

function ChatbotPanel() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      from: 'bot',
      text: 'Hi! Ask me anything about Athens or the pins on the map 👋',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMsg = {
      id: Date.now(),
      from: 'user',
      text: trimmed,
    };

    // Very simple “AI”: echo with a friendly reply.
    const botMsg = {
      id: Date.now() + 1,
      from: 'bot',
      text:
        "I'm a demo chatbot 🤖. I don’t call a real API yet, " +
        "but I can pretend! You said: “" +
        trimmed +
        '”.',
    };

    setMessages((prev) => [...prev, userMsg, botMsg]);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-50">
      {/* Header */}
      <div className="border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-wide">Chatbot</h1>
        <p className="text-xs text-slate-400">
          Ask about places in Athens or anything you like.
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
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
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
          className="rounded-full bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600 active:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function AthensMap() {
  const athensCenter = [37.9838, 23.7275]; // approximate city center

  return (
    <div className="flex h-full flex-col bg-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-3">
        <h2 className="text-lg font-semibold tracking-wide">Χάρτης (Map)</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 shadow-sm">
          Click a pin to see details.
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
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {ATHENS_LOCATIONS.map((loc) => (
            <Marker
              key={loc.id}
              position={loc.coords}
              icon={pinIcon}
              title={loc.name}
            >
              <Popup>
                <div className="space-y-1">
                  <div className="font-semibold">{loc.name}</div>
                  <div className="text-xs text-slate-700">{loc.info}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="h-screen w-screen bg-slate-900 p-4">
      <div className="flex h-full rounded-3xl bg-slate-950 shadow-2xl ring-1 ring-slate-800 overflow-hidden">
        {/* Left: Chatbot */}
        <div className="w-full max-w-xs border-r border-slate-800">
          <ChatbotPanel />
        </div>

        {/* Right: Map */}
        <div className="flex-1">
          <AthensMap />
        </div>
      </div>
    </div>
  );
}
