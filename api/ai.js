// api/ai.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  try {
    if (action === 'search') {
      const prompt = `Act as a precise dictionary. Find the word for: "${payload}". Return ONLY JSON: {"word": "...", "type": "...", "definition": "..."}. If no specific word exists, return {"word": "No match", "type": "", "definition": ""}.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(text));
    }

    if (action === 'details') {
      const prompt = `You are an expert linguist. Provide deep details for the word "${payload}". Return ONLY a JSON object in this exact format: {"example": "...", "synonyms": ["..."], "etymology": "..."}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(text));
    }

    if (action === 'transcribe') {
      const prompt = "You are an expert transcriber. Listen to this audio and return exactly the word or short phrase spoken. No punctuation, no conversational text. Just the word.";
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: "audio/mp4", data: payload } } // payload is the base64 string
      ]);
      return res.status(200).json({ text: await result.response.text() });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Backend AI Error:', error);
    return res.status(503).json({ error: 'AI servers are busy' });
  }
}