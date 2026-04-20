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
      
      // Update: Use the Gemini 2.0 Flash identifier
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 

      const prompt = `Return ONLY a JSON object for the word "${word}". 
      Required keys: 
      "example" (usage sentence), 
      "etymology" (brief origin), 
      "imageSearchQuery" (visual noun).
      Strict JSON format only.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Better JSON cleaning (handles extra text or markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("AI failed to return valid JSON");
      const aiResponse = JSON.parse(jsonMatch[0]);

      // Using a high-quality stable landscape as the test visual 
      // (We will refine the "dynamic" search once the connection is green)
      const sourceImageUrl = `https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop`;
      
      const uploadResponse = await cloudinary.uploader.upload(sourceImageUrl, {
        public_id: `word_${word.toLowerCase().trim()}`,
        folder: "neuron_app_images",
        overwrite: true,
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
      error: "AI initialization failed", 
      message: error.message 
    });
  }
}