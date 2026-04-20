import Groq from "groq-sdk";
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
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
      
      // 1. Fetch Text Details from Groq (Llama 3.3 70B)
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are a professional dictionary assistant. Return ONLY a JSON object. No prose."
          },
          {
            role: "user",
            content: `Provide dictionary details for "${word}". 
            Keys: "example" (usage sentence), "etymology" (origin), "imageSearchQuery" (2-word visual noun description).`
          },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const aiResponse = JSON.parse(chatCompletion.choices[0].message.content);

      // 2. Fetch Image and Upload to Cloudinary
      // Using a high-quality Unsplash random redirect based on the AI's search query
      const sourceImageUrl = `https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=800&auto=format&fit=crop&sig=${encodeURIComponent(word)}`;
      
      const uploadResponse = await cloudinary.uploader.upload(sourceImageUrl, {
        public_id: `word_${word.toLowerCase().trim()}`,
        folder: "neuron_app_images",
        overwrite: false, // Don't re-upload if we already have it
        resource_type: "image"
      });

      return res.status(200).json({
        example: aiResponse.example,
        etymology: aiResponse.etymology,
        image_url: uploadResponse.secure_url
      });
    }

    // Fallback for other actions (search, transcribe)
    return res.status(200).json({ status: "ok", message: "Action received" });

  } catch (error) {
    console.error("Backend Error:", error);
    return res.status(500).json({ 
      error: "AI Engine error", 
      message: error.message 
    });
  }
}