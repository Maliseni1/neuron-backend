import { GoogleGenerativeAI } from '@google/generative-ai';
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
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
      "imageSearchQuery" (a 2-3 word visual description of this word for an image search).`;

      const result = await model.generateContent(prompt);
      const aiResponse = JSON.parse(result.response.text().replace(/```json|```/g, ""));

      // 2. Visual Engine: Fetch & Upload to Cloudinary
      // We use a high-quality source (Unsplash via Source) for the image
      const sourceImageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(aiResponse.imageSearchQuery)}`;
      
      // Upload to your specific Cloudinary folder/preset
      const uploadResponse = await cloudinary.uploader.upload(sourceImageUrl, {
        public_id: `word_${word.toLowerCase()}`,
        folder: "neuron_app_images",
        overwrite: false, // Don't re-upload if it exists
        resource_type: "image"
      });

      return res.status(200).json({
        example: aiResponse.example,
        etymology: aiResponse.etymology,
        image_url: uploadResponse.secure_url
      });
    }

    // Default response for other actions
    return res.status(200).json({ status: "ok" });

  } catch (error) {
    console.error("AI/Cloudinary Error:", error);
    return res.status(500).json({ error: "Brain overload. Try again later." });
  }
}