import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Item, Category } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeItemWithAI = async (itemName: string, category: Category): Promise<any> => {
  try {
    const prompt = `
      Mein Hund heißt Fiffy. Ich füge ein neues Objekt zu seinem Inventar hinzu.
      Objektname: "${itemName}"
      Kategorie: "${category}"
      
      Bitte erstelle eine lustige, kurze Beschreibung aus der Sicht von Fiffy, schlage 3 relevante Tags vor und nenne einen kurzen "Fun Fact" oder Tipp zur Nutzung dieses Gegenstands für einen Hund.
    `;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        description: { type: Type.STRING, description: "Eine lustige Beschreibung aus Fiffys Sicht." },
        suggestedTags: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "3 Tags für das Objekt (z.B. 'Quietscht', 'Winter', 'Kauen')" 
        },
        funFact: { type: Type.STRING, description: "Ein kurzer Tipp oder lustiger Fakt." }
      },
      required: ["description", "suggestedTags", "funFact"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "Du bist ein fröhlicher, hundebegeisterter Assistent für Fiffy."
      }
    });

    if (response.text) {
      return JSON.parse(response.text);
    }
    throw new Error("Keine Antwort von Gemini erhalten.");
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      description: "Ein tolles Ding für Fiffy!",
      suggestedTags: ["Fiffy", category],
      funFact: "Fiffy wird es lieben!"
    };
  }
};

export const getFiffyAdvice = async (inventory: Item[], query: string): Promise<string> => {
  try {
    const inventoryString = inventory.map(i => `- ${i.name} (${i.category}, ${i.condition})`).join('\n');
    
    const prompt = `
      Hier ist Fiffys aktuelles Inventar:
      ${inventoryString}

      Fiffys Besitzer fragt: "${query}"

      Antworte als Fiffys persönlicher Assistent (Fiffy-Bot). Sei hilfreich, lustig und beziehe dich auf die Gegenstände im Inventar, wenn es passt. Halte dich kurz (max 100 Wörter).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || "Wuff! Ich bin mir gerade nicht sicher.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "Entschuldigung, meine Hunde-Antenne hat gerade keinen Empfang.";
  }
};