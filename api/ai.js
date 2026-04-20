import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;

  try {
    if (action === 'details') {
      const word = payload;
      // FIX: Changed model name to 'gemini-1.5-flash' (stable) or 'gemini-pro'
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

      const prompt = `Provide a dictionary-style detail for the word "${word}". 
      Return ONLY a raw JSON object. No markdown.
      {
        "example": "modern sentence",
        "etymology": "origin story",
        "imageSearchQuery": "2-word visual noun"
      }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(text);

      // FIX: Using a reliable Unsplash URL structure instead of the deprecated Source API
      const searchQuery = encodeURIComponent(aiResponse.imageSearchQuery);
      const sourceImageUrl = `https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop&sig=${word}`; 
      // Note: For a true production search, we'd use the Unsplash API, 
      // but for now, we'll send a high-quality landscape as a fallback to test Cloudinary.
      
      const uploadResponse = await cloudinary.uploader.upload(sourceImageUrl, {
        public_id: `word_${word.toLowerCase().trim()}`,
        folder: "neuron_app_images",
        overwrite: false,
        resource_type: "image"
      });

      return res.status(200).json({
        example: aiResponse.example,
        etymology: aiResponse.etymology,
        image_url: uploadResponse.secure_url
      });
    }

    return res.status(200).json({ status: "ok" });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ 
      error: "AI logic error", 
      details: error.message 
    });
  }
}