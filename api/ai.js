import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;

  try {
    // Force v1 API version to stop the 404 Beta issues
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" },
      { apiVersion: 'v1' }
    );

    if (action === 'search') {
      const prompt = `Define "${payload}". Return ONLY JSON: {"word": "...", "partOfSpeech": "...", "definition": "...", "phonetic": "...", "example": "..."}. If no match, return {"word": "No match"}.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().replace(/```json|```/g, "").trim();
      
      return res.status(200).json(JSON.parse(text));

    } else if (action === 'transcribe') {
      const result = await model.generateContent([
        "Transcribe this audio. Return ONLY the word spoken.",
        { inlineData: { mimeType: "audio/mp4", data: payload } }
      ]);
      const response = await result.response;
      return res.status(200).json({ text: response.text().trim() });
    }
  } catch (error) {
    console.error('Gemini Error:', error);
    // Send the actual error message back so we can see it in Vercel logs
    return res.status(500).json({ error: error.message });
  }
}