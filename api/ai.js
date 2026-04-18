import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;
  // Flash is the fastest, but we use the specific model string
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  try {
    if (action === 'search') {
      const prompt = `Dictionary mode: Define the word for "${payload}". 
      Return ONLY valid JSON: {"word": "...", "partOfSpeech": "...", "definition": "...", "phonetic": "...", "example": "..."}. 
      If no match, return {"word": "No match"}.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(text));

    } else if (action === 'transcribe') {
      const result = await model.generateContent([
        "Transcribe this audio. Return ONLY the word spoken.",
        { inlineData: { mimeType: "audio/mp4", data: payload } }
      ]);
      return res.status(200).json({ text: result.response.text().trim() });
    }
  } catch (error) {
    console.error('Gemini Error:', error);
    return res.status(500).json({ error: 'AI currently unavailable' });
  }
}