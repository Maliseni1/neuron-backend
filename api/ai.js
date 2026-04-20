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
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Using 1.5 for broader compatibility

      // 1. Get AI Text Details with strict JSON instruction
      const prompt = `Provide a dictionary-style detail for the word "${word}". 
      Return ONLY a raw JSON object. No markdown, no preamble.
      {
        "example": "modern sentence",
        "etymology": "origin story",
        "imageSearchQuery": "2-word visual noun"
      }`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Clean JSON string in case AI adds markdown blocks
      const cleanJson = text.replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(cleanJson);

      // 2. Fetch image and upload to Cloudinary
      // Using a reliable Unsplash Source redirect
      const sourceImageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(aiResponse.imageSearchQuery)}`;
      
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
    // Return a structured error so the app doesn't hang
    return res.status(500).json({ 
      error: "Service temporarily unavailable",
      details: error.message 
    });
  }
}