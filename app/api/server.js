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

const PLACE_NAMES = LOCATIONS.map((l) => l.name);
const PLACE_NAMES_TEXT = PLACE_NAMES.join(', ');

// ----------------- OpenAI client -----------------

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompt uses the same location list as the frontend map
const SYSTEM_PROMPT = `
You are an assistant helping users explore Athens.

You MUST ALWAYS respond ONLY with a JSON object that matches this schema:

{
  "reply": string,
  "placeName": string | null
}

- "reply": a short, friendly natural-language answer.
- "placeName": either:
    - EXACTLY one of: ${PLACE_NAMES_TEXT}, or
    - null when no specific place from that list is clearly referenced.

If the user is asking about one of those places (even approximately, like "acropolis" or "syntagma"),
map it to the exact full name from the list above.
Do NOT include any extra fields.
`;

// ----------------- Routes -----------------

// Locations API – frontend gets all pins from here
app.get('/api/locations', (req, res) => {
  res.json({ locations: LOCATIONS });
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
