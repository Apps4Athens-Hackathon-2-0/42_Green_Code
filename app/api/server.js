const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ----------------- Location data (ONLY on backend) -----------------

// All metrics assumed 0–100, FeasibilityScore 0–1
const RAW_LOCATIONS = [
  {
    id: 1,
    name: 'Monastiraki',
    coords: [37.976, 23.7258],
    info: 'Dense, highly built-up area with limited street tree cover.',
    metrics: {
      LST: 95,               // hotter → more need
      NDVI: 5,              // lower vegetation → more need (assuming already inverted)
      PopulationDensity: 92, // more people → more need
      CCS: 85,               // citizens strongly request cooling
      FeasibilityScore: 0.8, // how feasible planting is (0–1)
      AirQuality: 70,        // stored, not yet in formula
    },
  },
  {
    id: 2,
    name: 'Syntagma Square',
    coords: [37.9755, 23.7348],
    info: 'Central square with heavy traffic and heat-island effects.',
    metrics: {
      LST: 82,
      NDVI: 20,
      PopulationDensity: 88,
      CCS: 80,
      FeasibilityScore: 0.9,
      AirQuality: 65,
    },
  },
  {
    id: 3,
    name: 'Panathenaic Stadium',
    coords: [37.968, 23.741],
    info: 'Large open area with some potential for perimeter greening.',
    metrics: {
      LST: 75,
      NDVI: 45,
      PopulationDensity: 70,
      CCS: 60,
      FeasibilityScore: 0.85,
      AirQuality: 60,
    },
  },
  {
    id: 4,
    name: 'Acropolis of Athens',
    coords: [37.9715, 23.7267],
    info: 'Historic area; limited planting but high exposure to heat.',
    metrics: {
      LST: 80,
      NDVI: 35,
      PopulationDensity: 65,
      CCS: 55,
      FeasibilityScore: 0.6,
      AirQuality: 68,
    },
  },
  {
    id: 5,
    name: 'National Garden',
    coords: [37.9732, 23.737],
    info: 'Already quite green; relatively lower additional need.',
    metrics: {
      LST: 60,
      NDVI: 20,  // here “NDVI” should be interpreted as “greening need” if you use this formula
      PopulationDensity: 50,
      CCS: 45,
      FeasibilityScore: 0.7,
      AirQuality: 55,
    },
  },
];

function computeSCPI(m) {
  const base =
    0.4 * m.LST +
    0.3 * (100- m.NDVI) +
    0.2 * m.PopulationDensity +
    0.1 * m.CCS;

  const s_cpi = base * m.FeasibilityScore;

  // Clamp to 0–100 and round to 1 decimal
  return Math.max(0, Math.min(100, Math.round(s_cpi * 10) / 10));
}

const LOCATIONS = RAW_LOCATIONS.map((loc) => ({
  ...loc,
  s_cpi: computeSCPI(loc.metrics),
}));

const PLACE_NAMES = LOCATIONS.map((l) => l.name);
const PLACE_NAMES_TEXT = PLACE_NAMES.join(', ');

// ----------------- OpenAI client -----------------

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt uses the same location list as the frontend map
const SYSTEM_PROMPT = `
You are an assistant helping with urban tree-planting priorities in Athens.

Each known location has an S_CPI (Street Canopy Priority Index) between 0 and 100.
Higher S_CPI means a stronger need for additional tree planting.

The locations and their S_CPI are:
${LOCATIONS.map(l => `- ${l.name}: S_CPI ${l.s_cpi}`).join('\n')}

You MUST ALWAYS respond ONLY with a JSON object that matches this schema:

{
  "reply": string,
  "placeName": string | null
}

- "reply": a short, friendly natural-language answer about tree-planting need,
  S_CPI, heat, or greening opportunities.
- "placeName": either:
    - EXACTLY one of: ${PLACE_NAMES_TEXT}, or
    - null when no specific place from that list is clearly referenced.

If the user is asking about one of those places (even approximately, like "monastiraki" or "syntagma"),
map it to the exact full name from the list above.
Do NOT include any extra fields.
`;


// ----------------- Routes -----------------

// Locations API – frontend gets all pins from here
app.get('/api/locations', (req, res) => {
  const sorted = [...LOCATIONS].sort((a, b) => b.s_cpi - a.s_cpi);
  res.json({ locations: sorted });
});

// Chat API – returns { reply, placeName }
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await client.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ChatWithPlace',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              reply: { type: 'string' },
              placeName: {
                anyOf: [{ type: 'string' }, { type: 'null' }],
              },
            },
            required: ['reply', 'placeName'],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = response.choices[0].message.content;

    let parsed;
    try {
        console.log('Raw response from model:', raw);
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse JSON from model:', raw);
      parsed = { reply: raw, placeName: null };
    }

    // Frontend expects: { reply, placeName }
    res.json(parsed);
  } catch (err) {
    console.error('OpenAI error:', err);
    res.status(500).json({
      reply: "Sorry, I couldn't reach the AI server. Please try again later.",
      placeName: null,
    });
  }
});

app.listen(3001, () => {
  console.log('🟢 API running on http://localhost:3001');
});
