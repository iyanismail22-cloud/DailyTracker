import { GoogleGenAI, Type } from "@google/genai";
import { Task, HealthEntry, FinanceEntry, DailyInsight } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSmartSchedule(tasks: Partial<Task>[], userContext: string = "") {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tasks to schedule: ${JSON.stringify(tasks)}. Additional context: ${userContext}`,
    config: {
      systemInstruction: `You are a productivity expert. Organize tasks into a logical daily schedule. 
      Consider priority and categories. Return the scheduled tasks in JSON format.`,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            startTime: { type: Type.STRING, description: "HH:mm format" },
            endTime: { type: Type.STRING, description: "HH:mm format" },
            isImportant: { type: Type.BOOLEAN },
            category: { type: Type.STRING }
          },
          required: ["title", "startTime", "endTime"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("AI Schedule Parsing Error:", e);
    return tasks;
  }
}

export async function generateDailyRecap(
  tasks: Task[], 
  health: HealthEntry, 
  finances: FinanceEntry[]
): Promise<DailyInsight> {
  const prompt = `
    Analyze this daily data:
    Tasks: ${JSON.stringify(tasks.filter(t => t.isCompleted))}
    Health: ${JSON.stringify(health)}
    Finances: ${JSON.stringify(finances)}
    
    Create a highly motivational and personalized daily recap in Indonesian.
    Include some smart suggestions for tomorrow and a sentiment score (1-10) based on the journal and mood factors.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          recap: { type: Type.STRING, description: "Short motivational paragraph in Indonesian" },
          suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          sentimentScore: { type: Type.NUMBER },
          date: { type: Type.STRING }
        },
        required: ["recap", "suggestions", "sentimentScore"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("AI Recap Parsing Error:", e);
    return {
      recap: "Hari yang produktif! Tetap semangat untuk esok hari.",
      suggestions: ["Coba tidur lebih awal malam ini."],
      sentimentScore: 7,
      date: new Date().toISOString()
    };
  }
}

export async function analyzeJournalSentiment(journalText: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: journalText,
    config: {
      systemInstruction: "Analyze the sentiment of this journal entry. Focus on emotional state and triggers.",
    }
  });
  return response.text;
}
