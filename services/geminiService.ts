import { GoogleGenAI, Type, Schema } from "@google/genai";
import { BrandingResult, FactCheckResult, ProjectHighlight } from "../types";

const RESEARCH_SYSTEM_INSTRUCTION = `
You are a high-level Intelligence Researcher. Your task is to use Google Search to find as much professional information as possible about the person provided (Name and Title/Role).
Search for:
1. Career history and major positions held.
2. Education and certifications.
3. Key professional achievements, awards, or public recognition.
4. Major projects, speeches, or articles they have written or been mentioned in.
5. Professional values, philosophy, and public perception.

Synthesize all the information found into a detailed, structured dossier that can be used to write a 4-page professional profile. Include specific dates and names where available.
`;

const BASE_BRANDING_SYSTEM_INSTRUCTION = `
You are an expert Personal Branding Strategist and Copywriter tasked with generating a comprehensive, multi-page professional personal branding document.
Your goal is to transform raw input (resume, articles, notes, or research data) into a high-impact, deeply humanized, professional, and compelling profile.
The output should be free of jargon, authentic, and reflect a world-class standard.

Generate the output in JSON format with the following keys and content requirements:

- "executiveSummary": A powerful, executive-style summary (2-3 sentences) that immediately captures attention.
- "professionalBio": A detailed professional biography written in the third person (approx. 200-300 words). This should tell a concise and inspiring career narrative, highlight core strengths, and articulate the individual's professional philosophy.
- "keyAchievements": An array of 5-7 powerful bullet points, each highlighting a quantifiable achievement, significant impact, or cutting-edge skill. Focus on results and value delivered.
- "coreExpertise": An array of 5-10 key areas of expertise or specific technical/soft skills. Categorize if logical (e.g., "Leadership & Strategy", "Software Development", "Project Management").
- "professionalPhilosophy": A concise statement (100-150 words) outlining the individual's core professional beliefs, work ethic, approach to collaboration, and commitment to excellence.
- "visionAndOutlook": A section (100-150 words) articulating the individual's professional vision, future goals, and how they aspire to make a significant impact in their field or industry.
- "projectHighlights": An array of 2-3 significant projects. Each project highlight should be an object with two keys:
    - "title": The name or brief description of the project.
    - "description": A concise narrative (50-75 words) using the STAR method (Situation, Task, Action, Result) to explain the project's context, the individual's role, actions taken, and the positive outcomes.

Ensure the entire document flows cohesively, telling a compelling story about the individual's professional journey and capabilities. 
CRITICAL: Return ONLY valid JSON. No conversational text.
`;

const FACT_CHECK_SYSTEM_INSTRUCTION = `
You are a meticulous Fact-Checking AI. 
Your task is to verify the claims made in the provided text using Google Search.
Analyze the text for factual accuracy, dates, names, and specific claims.

If the input is in Somali, your analysis must be in Somali.

Provide a detailed analysis of the facts.
`;

const LANGUAGE_DETECTION_SYSTEM_INSTRUCTION = `
You are a language detection AI. Your task is to identify the language of the provided text.
Respond ONLY with the ISO 639-1 code for the language (e.g., "en" for English, "ar" for Arabic, "so" for Somali).
If the language is not clearly one of these, respond ONLY with "en" as a fallback.
`;

const cleanJsonString = (str: string): string => {
  return str.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
};

export const researchPersonOnWeb = async (name: string, title: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Research this person thoroughly on the web: Name: ${name}, Title/Role: ${title}. Provide a detailed dossier of their professional life.`,
            config: {
                systemInstruction: RESEARCH_SYSTEM_INSTRUCTION,
                tools: [{ googleSearch: {} }]
            }
        });
        return response.text || "";
    } catch (error: any) {
        console.error("Web Research Error:", error);
        throw error;
    }
};

export const generateProfessionalPortrait = async (name: string, title: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `A professional, high-quality corporate headshot of ${name}, who is a ${title}. 
  The person should look confident, professional, and friendly. 
  Soft studio lighting, neutral blurred office background, 8k resolution, photorealistic, 1:1 aspect ratio.`;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Portrait Generation Error:", error);
    throw error;
  }
};

const detectLanguage = async (text: string): Promise<'en' | 'ar' | 'so'> => {
  if (!text.trim()) return 'en';
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: {
        systemInstruction: LANGUAGE_DETECTION_SYSTEM_INSTRUCTION,
        maxOutputTokens: 5,
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    const detected = response.text?.trim().toLowerCase();
    if (detected && ['en', 'ar', 'so'].includes(detected)) {
      return detected as 'en' | 'ar' | 'so';
    }
    return 'en';
  } catch (error) {
    console.error("Language detection error:", error);
    return 'en';
  }
};

export const generateBrandingProfile = async (text: string, outputLanguage: 'auto' | 'en' | 'ar' | 'so' = 'auto'): Promise<BrandingResult> => {
  if (!text) throw new Error("No text provided");
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let brandingSystemInstruction = BASE_BRANDING_SYSTEM_INSTRUCTION;
  let targetLang: 'en' | 'ar' | 'so' = 'en';

  if (outputLanguage === 'en') {
    brandingSystemInstruction += `\nCRITICAL: The output MUST be in English.`;
    targetLang = 'en';
  } else if (outputLanguage === 'ar') {
    brandingSystemInstruction += `\nCRITICAL: The output MUST be in Arabic.`;
    targetLang = 'ar';
  } else if (outputLanguage === 'so') {
    brandingSystemInstruction += `\nCRITICAL: The output MUST be in Somali.`;
    targetLang = 'so';
  } else {
    brandingSystemInstruction += `\nCRITICAL: Detect input language. If Somali, output Somali. If English, output English. If Arabic, output Arabic.`;
  }

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      executiveSummary: { type: Type.STRING },
      professionalBio: { type: Type.STRING },
      keyAchievements: { type: Type.ARRAY, items: { type: Type.STRING } },
      coreExpertise: { type: Type.ARRAY, items: { type: Type.STRING } },
      professionalPhilosophy: { type: Type.STRING },
      visionAndOutlook: { type: Type.STRING },
      projectHighlights: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
          },
          required: ["title", "description"],
        },
      },
    },
    required: ["executiveSummary", "professionalBio", "keyAchievements", "coreExpertise", "professionalPhilosophy", "visionAndOutlook", "projectHighlights"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: text,
      config: {
        systemInstruction: brandingSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 1024 }
      }
    });

    if (!response.text) throw new Error("No response generated");

    const cleanedJson = cleanJsonString(response.text);
    const brandingResult = JSON.parse(cleanedJson) as Omit<BrandingResult, 'language'>;
    let finalLang: 'en' | 'ar' | 'so' = outputLanguage === 'auto' ? await detectLanguage(brandingResult.executiveSummary) : targetLang;

    return { ...brandingResult, language: finalLang };
  } catch (error: any) {
    console.error("Branding Gen Error:", error);
    throw error;
  }
};

export const translateBrandingProfileContent = async (
    content: BrandingResult,
    fromLanguage: 'en' | 'ar' | 'so',
    toLanguage: 'en' | 'ar' | 'so'
): Promise<BrandingResult> => {
    if (fromLanguage === toLanguage) return { ...content, language: toLanguage };
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const TRANSLATION_SYSTEM_INSTRUCTION = `Translate the provided personal branding text from ${fromLanguage} to ${toLanguage}. Maintain professional tone.`;

    const translateTextPart = async (text: string): Promise<string> => {
        if (!text || !text.trim()) return text;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: text,
            config: { systemInstruction: TRANSLATION_SYSTEM_INSTRUCTION, temperature: 0.3 }
        });
        return response.text?.trim() || text;
    };

    const translateProjectHighlights = async (highlights: ProjectHighlight[]) => 
      Promise.all(highlights.map(async (p) => ({ title: await translateTextPart(p.title), description: await translateTextPart(p.description) })));

    return {
        executiveSummary: await translateTextPart(content.executiveSummary),
        professionalBio: await translateTextPart(content.professionalBio),
        keyAchievements: await Promise.all(content.keyAchievements.map(point => translateTextPart(point))),
        coreExpertise: await Promise.all(content.coreExpertise.map(point => translateTextPart(point))),
        professionalPhilosophy: await translateTextPart(content.professionalPhilosophy),
        visionAndOutlook: await translateTextPart(content.visionAndOutlook),
        projectHighlights: await translateProjectHighlights(content.projectHighlights),
        language: toLanguage
    };
};

export const performFactCheck = async (text: string): Promise<FactCheckResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      // FIX: Updated model to a recommended model for search grounding.
      model: 'gemini-3-flash-preview',
      contents: `Fact check this text: \n\n${text}`,
      config: { systemInstruction: FACT_CHECK_SYSTEM_INSTRUCTION, tools: [{ googleSearch: {} }] }
    });

    const analysis = response.text || "No analysis generated.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = chunks.filter(c => c.web).map(c => ({ title: c.web!.title || "Web Source", uri: c.web!.uri || "#" }));
    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => (t.uri === v.uri)) === i);

    return { analysis, sources: uniqueSources };
  } catch (error: any) {
    console.error("Fact Check Error:", error);
    throw error;
  }
};