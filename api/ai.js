import Groq from "groq-sdk";
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, payload } = req.body;

  try {
    if (action === 'details') {
      const word = payload;
      
      // 1. Fetch Text Details from Groq
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "Return ONLY a JSON object. No prose." },
          { role: "user", content: `Details for "${word}". Keys: "example", "etymology", "imageSearchQuery" (2-word noun).` }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);

      // 2. FETCH REAL IMAGE FROM UNSPLASH API
      const unsplashRes = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(aiResponse.imageSearchQuery)}&per_page=1`,
        { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
      );
      
      const unsplashData = await unsplashRes.json();
      
      // Fallback image if search fails
      let sourceImageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa"; 
      
      if (unsplashData.results && unsplashData.results.length > 0) {
        sourceImageUrl = unsplashData.results[0].urls.regular;
      }

      // 3. UPLOAD TO CLOUDINARY
      const uploadResponse = await cloudinary.uploader.upload(sourceImageUrl, {
        public_id: `word_${word.toLowerCase().trim()}`,
        folder: "neuron_app_images",
        overwrite: false,
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
    return res.status(500).json({ error: error.message });
  }
}