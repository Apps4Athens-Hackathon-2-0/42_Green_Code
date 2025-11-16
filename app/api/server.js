const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// All places your frontend map knows about
const ATHENS_PLACE_NAMES = [
  'Acropolis of Athens',
  'Syntagma Square',
  'Monastiraki',
  'National Garden',
  'Panathenaic Stadium',
];

const SYSTEM_PROMPT = `
You are an assistant helping users explore Athens.

You MUST ALWAYS respond ONLY with a JSON object that matches this schema:

{
  "reply": string,
  "placeName": string | null
}

- "reply": a short, friendly natural-language answer.
- "placeName": either:
    - EXACTLY one of: ${ATHENS_PLACE_NAMES.join(', ')}, or
    - null when no specific place from that list is clearly referenced.

If the user is asking about one of those places (even approximately, like "acropolis" or "syntagma"),
map it to the exact full name from the list above.
Do NOT include any extra fields.
`;

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
                anyOf: [
                  { type: 'string' },
                  { type: 'null' },
                ],
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
  console.log('🟢 OpenAI Chat API running on http://localhost:3001');
});
