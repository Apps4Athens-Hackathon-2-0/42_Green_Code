const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ----------------- Location data (ONLY on backend) -----------------

const LOCATIONS = [
  {
    id: 1,
    name: 'Monastiraki',
    coords: [37.976, 23.7258],
    info: 'Dense, highly built-up area with limited street tree cover.',
    s_cpi: 92, // higher = more urgent need for trees
  },
  {
    id: 2,
    name: 'Syntagma Square',
    coords: [37.9755, 23.7348],
    info: 'Central square with heavy traffic and heat-island effects.',
    s_cpi: 88,
  },
  {
    id: 3,
    name: 'Panathenaic Stadium',
    coords: [37.968, 23.741],
    info: 'Large open area with some potential for perimeter greening.',
    s_cpi: 76,
  },
  {
    id: 4,
    name: 'Acropolis of Athens',
    coords: [37.9715, 23.7267],
    info: 'Historic area; limited planting but high exposure to heat.',
    s_cpi: 63,
  },
  {
    id: 5,
    name: 'National Garden',
    coords: [37.9732, 23.737],
    info: 'Already quite green; relatively lower additional need.',
    s_cpi: 38,
  },
];

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
