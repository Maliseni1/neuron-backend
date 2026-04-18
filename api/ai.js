import { GoogleGenerativeAI } from '@google/generative-ai';
import { track } from '@vercel/analytics/server';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  // 1. Handle preflight CORS and Method check
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, payload } = req.body;
  
  // Use gemini-1.5-flash for maximum speed/stability in production
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  try {
    // 2. Log to Analytics (Wrapped in try/catch so analytics failure doesn't break the AI)
    try {
      await track(`AI_Action_${action}`, { 
        type: action,
        query_length: action === 'transcribe' ? 'audio' : (payload?.length || 0) 
      });
    } catch (analyticsError) {
      console.error('Analytics tracking failed:', analyticsError);
    }

    // 3. AI Logic
    if (action === 'search') {
      const prompt = `Act as a precise dictionary. Find the word for: "${payload}". 
      Return ONLY JSON: {"word": "...", "type": "...", "definition": "..."}. 
      If no match found, return {"word": "No match", "type": "", "definition": ""}.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(text));
    }

    if (action === 'details') {
      const prompt = `Provide details for "${payload}". 
      Return ONLY JSON: {"example": "...", "synonyms": ["..."], "etymology": "..."}`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return res.status(200).json(JSON.parse(text));
    }

    if (action === 'transcribe') {
      const prompt = "Transcribe this audio. Return ONLY the word spoken. No punctuation.";
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: "audio/mp4", data: payload } }
      ]);
      const text = result.response.text();
      return res.status(200).json({ text: text.trim() });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Backend AI Error:', error);
    // Return a structured error so the app can handle it
    return res.status(500).json({ error: 'AI processing failed', details: error.message });
  }
}