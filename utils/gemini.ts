import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY is missing. Gemini features will not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const translateToPersian = async (text: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Translate the following product name or description to Persian (Farsi). Return ONLY the translated text, no explanation. Text: "${text}"`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};

export const generateProductDescription = async (productName: string): Promise<string> => {
  const ai = getAiClient();
  if (!ai) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a short, industrial-style product description (max 15 words) for a product named "${productName}". Return ONLY the description.`,
    });
    return response.text.trim();
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};