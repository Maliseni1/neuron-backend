import { GoogleGenerativeAI } from '@google/generative-ai';
import { track } from '@vercel/analytics/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;
  
  // SWITCHED TO 1.5.-FLASH-8b for better endpoint compatibility
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

  try {
    try {
      await track(`AI_${action}`, { query: action === 'transcribe' ? 'audio' : payload });
    } catch (e) {
      console.warn("Analytics error ignored");
    }

    if (!payload && action !== 'transcribe') {
        return res.status(400).json({ error: 'Payload is required' });
    }

    if (action === 'search') {
      const prompt = `Act as a precise dictionary. Find the word for: "${payload}". 
      Return ONLY JSON: {"word": "...", "type": "...", "definition": "..."}. 
      If no match, return {"word": "No match", "type": "", "definition": ""}.`;
      
      const result = await model.generateContent(prompt);
      // More robust response extraction
      const text = await result.response.text();
      const cleaned = text.replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(cleaned));

    } else if (action === 'details') {
      const prompt = `Provide example, synonyms, and etymology for "${payload}". 
      Return ONLY JSON: {"example": "...", "synonyms": [], "etymology": "..."}`;
      
      const result = await model.generateContent(prompt);
      const text = await result.response.text();
      const cleaned = text.replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(cleaned));

    } else if (action === 'transcribe') {
      const result = await model.generateContent([
        "Return exactly the word spoken in this audio. No punctuation.",
        { inlineData: { mimeType: "audio/mp4", data: payload } }
      ]);
      const text = await result.response.text();
      return res.status(200).json({ text: text.trim() });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Backend AI Error:', error);
    // Return a friendlier error to the app
    return res.status(500).json({ error: "AI endpoint error", message: error.message });
  }
}