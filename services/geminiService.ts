import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BrandingResult, FactCheckResult, FactCheckSource } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const BRANDING_SYSTEM_INSTRUCTION = `
You are an expert Personal Branding Strategist and Copywriter. 
Your task is to analyze the provided input text (which may be a resume, article, or raw notes) and generate a high-impact professional profile.

You must generate the output in JSON format with the following keys:
- "summary": A powerful, executive-style summary (2-3 sentences).
- "bio": A professional short biography written in the third person (approx. 100-150 words).
- "impact": An array of bullet points highlighting key achievements, impact, and skills.

CRITICAL: Detect the language of the input text. If the input is in Somali, the output MUST be in Somali. If English, output in English.
`;

const FACT_CHECK_SYSTEM_INSTRUCTION = `
You are a meticulous Fact-Checking AI. 
Your task is to verify the claims made in the provided text using Google Search.
Analyze the text for factual accuracy, dates, names, and specific claims.

If the input is in Somali, your analysis must be in Somali.

Provide a detailed analysis of the facts.
`;

export const generateBrandingProfile = async (text: string): Promise<BrandingResult> => {
  if (!text) throw new Error("No text provided");

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: { type: Type.STRING, description: "Executive summary" },
      bio: { type: Type.STRING, description: "Professional bio in 3rd person" },
      impact: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "List of key impacts or achievements" 
      }
    },
    required: ["summary", "bio", "impact"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: text,
      config: {
        systemInstruction: BRANDING_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    if (!response.text) {
      throw new Error("No response generated");
    }

    return JSON.parse(response.text) as BrandingResult;
  } catch (error) {
    console.error("Branding Gen Error:", error);
    throw error;
  }
};

export const performFactCheck = async (text: string): Promise<FactCheckResult> => {
  if (!text) throw new Error("No text provided");

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Fact check the following text. Highlight verified facts and potential inaccuracies: \n\n${text}`,
      config: {
        systemInstruction: FACT_CHECK_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }]
      }
    });

    const analysis = response.text || "No analysis generated.";
    
    // Extract Grounding Metadata
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: FactCheckSource[] = [];

    chunks.forEach(chunk => {
      if (chunk.web) {
        sources.push({
          title: chunk.web.title || "Web Source",
          uri: chunk.web.uri || "#"
        });
      }
    });

    // Remove duplicates based on URI
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

    return {
      analysis,
      sources: uniqueSources
    };
  } catch (error) {
    console.error("Fact Check Error:", error);
    throw error;
  }
};