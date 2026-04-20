import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using ES Module compatible syntax
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
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // 1. Get AI Text Details
      const prompt = `Provide a dictionary-style detail for the word "${word}". 
      Return ONLY a JSON object with these keys: 
      "example" (a modern sentence), 
      "etymology" (origin story), 
      "imageSearchQuery" (a 2-word noun description for a photo search).`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```json|```/g, "").trim();
      const aiResponse = JSON.parse(responseText);

      // 2. Visual Engine: Fetch & Upload to Cloudinary
      // Using a more reliable Unsplash URL pattern
      const sourceImageUrl = `https://images.unsplash.com/photo-1500622764614-be3c1601719a?q=80&w=800&auto=format&fit=crop&keywords=${encodeURIComponent(aiResponse.imageSearchQuery)}`;
      
      const uploadResponse = await cloudinary.uploader.upload(sourceImageUrl, {
        public_id: `word_${word.toLowerCase()}`,
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
    console.error("Detailed Error:", error);
    return res.status(500).json({ 
      error: "Brain overload", 
      details: error.message 
    });
  }
}