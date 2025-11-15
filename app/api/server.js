const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Init OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Dummy system prompt to orient the bot
const SYSTEM_PROMPT = `
You are an assistant helping users learn about Athens.
If they mention a famous location, include a 1–2 sentence explanation.
Keep replies short and helpful.
`;

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message }
      ]
    });

    const text = response.output[0].content[0].text;

    res.json({ reply: text });
  } catch (err) {
    console.error("OpenAI error:", err);
    res
      .status(500)
      .json({ reply: "Sorry, I couldn’t reach the AI server. Try again later." });
  }
});

app.listen(3001, () => {
  console.log("🟢 OpenAI Chat API running on http://localhost:3001");
});
