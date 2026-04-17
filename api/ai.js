import { GoogleGenerativeAI } from '@google/generative-ai';
import { track } from '@vercel/analytics/server'; 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  try {
    // Log the event to Vercel Analytics
    await track(`AI_Action_${action}`, { user_query: action === 'transcribe' ? 'audio' : payload });

    if (action === 'search') {
      const prompt = `Act as a precise dictionary. Find the word for: "${payload}". Return ONLY JSON: {"word": "...", "type": "...", "definition": "..."}.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(text));
    }

    if (action === 'details') {
      const prompt = `Provide details for "${payload}". Return ONLY JSON: {"example": "...", "synonyms": ["..."], "etymology": "..."}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(text));
    }

    if (action === 'transcribe') {
      const prompt = "Transcribe this audio. Return ONLY the word spoken.";
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: "audio/mp4", data: payload } }
      ]);
      const text = await result.response.text();
      return res.status(200).json({ text: text.trim() });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Backend AI Error:', error);
    return res.status(500).json({ error: 'AI processing failed' });
  }
}