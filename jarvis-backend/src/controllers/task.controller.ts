
import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../utils/ApiError.js";
import dotenv from "dotenv";

dotenv.config();

// ✅ Initialize Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ---------------- SAFE GENERATE WITH RETRY ----------------
async function safeGenerate(prompt: string, retries = 5, baseDelay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text =
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        response.text ||
        "";

      if (!text) throw new Error("Empty Gemini response");
      return text;
    } catch (error: any) {
      const msg = error?.message || JSON.stringify(error);

      // Retry on transient API errors
      if (
        msg.includes("overloaded") ||
        msg.includes("quota") ||
        msg.includes("503") ||
        msg.includes("429")
      ) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(
          `⚠️ Gemini rate limit. Retrying in ${delay}ms (Attempt ${attempt}/${retries})`
        );
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      console.error("❌ Gemini fatal error:", msg);
      throw error;
    }
  }
  throw new Error("Gemini service overloaded after multiple retries.");
}

// ---------------- CLEANUP FUNCTION ----------------
function cleanText(raw: string): string {
  return raw.replace(/```json|```javascript|```js|```/g, "").trim();
}

// ---------------- IDENTIFY TASK ----------------
export const identifyTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { task } = req.body;
    if (!task || !task.trim()) throw new ApiError(400, "Task description is required");

    const prompt = `
You are a task classification agent for a Chrome extension.
You must classify a user’s natural language task into one of these categories:

{
  "category": "<one of scanningBrowser | simpleDoingTask | scanningPage | simplePrintingTask | notDoableTask>",
  "explanation": "<brief reason>"
}

Rules:
- "scanningBrowser": analyzing tabs, browsing history, or browser-level data.
- "simpleDoingTask": performing actions (open website, download file, play song, click buttons, etc.).
- "scanningPage": reading or summarizing webpage content.
- "simplePrintingTask": just replying with text or information.
- "notDoableTask": unclear or impossible for browser automation.

Now classify this task: "${task}"
`;

    const response = await safeGenerate(prompt);
    const text = cleanText(response);

    let aiResult = { category: "notDoableTask", explanation: "Unable to determine." };
    try {
      aiResult = JSON.parse(text);
    } catch {
      const match = text.match(
        /"category":\s*"([^"]+)".*"explanation":\s*"([^"]+)"/s
      );
      if (match)
        aiResult = {
          category: match[1] || "notDoableTask",
          explanation: match[2] || "Unable to determine.",
        };
    }

    const valid = [
      "scanningBrowser",
      "simpleDoingTask",
      "scanningPage",
      "simplePrintingTask",
      "notDoableTask",
    ];
    if (!valid.includes(aiResult.category)) aiResult.category = "notDoableTask";

    res.status(200).json({
      success: true,
      task,
      category: aiResult.category,
      explanation: aiResult.explanation,
    });
  } catch (error: any) {
    console.error("identifyTask error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to identify task",
      error: error.message || error,
    });
  }
};

// ---------------- EXECUTE TASK ----------------
export const executeTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { task, category, userData } = req.body;
    if (!task || !category)
      throw new ApiError(400, "Task and category are required");

    const context = userData
      ? JSON.stringify(userData).slice(0, 3000)
      : "No context provided.";

    let prompt = "";

    switch (category) {
      case "simpleDoingTask":
        prompt = `
You are an AI assistant that generates JavaScript code for a Chrome extension to automate browser tasks.

User said: "${task}"

Return valid JSON:
{
  "function": "<JavaScript code to perform this browser action>",
  "output": "<short explanation>"
}

Guidelines:
- The JS code must be safe to run in the browser (no Node.js).
- You can use: window.open("https://...", "_blank"), window.location.href = "...", or DOM APIs.
- For downloading: use fetch() + link.click() pattern.
- For Spotify or YouTube: open direct links that can autoplay.
- Always return *only* JSON.

Example:
{
  "function": "window.open('https://open.spotify.com/search/song', '_blank');",
  "output": "Opening the song on Spotify"
}
`;
        break;

      case "scanningPage":
        prompt = `
User wants to analyze webpage content: "${task}"

Return JSON:
{
  "function": "<JS code that reads DOM elements>",
  "output": "<summary of what it does>"
}

Example:
{
  "function": "const links = [...document.querySelectorAll('a')].map(a => a.href); console.log(links);",
  "output": "Extracting all links from the current page"
}
`;
        break;

      case "simplePrintingTask":
        prompt = `
User said: "${task}"

Return:
{
  "function": null,
  "output": "<answer or information in text form>"
}
`;
        break;

      case "scanningBrowser":
        prompt = `
User wants to perform a browser-level analysis: "${task}"

You are given browser history data as JSON: 
${context}

IMPORTANT RULES (MUST FOLLOW):
1. You MUST NOT invent or fabricate any URLs, titles, timestamps, or websites.
2. You MUST use ONLY the provided userData array.
3. If the user asks for “last visited website”, “last 5 websites”, summaries, filtering, or categorizing:
   → return only pre-analyzed output using userData.
4. DO NOT generate code that scans browser history (chrome.history or document).
5. You may only return code that performs an action AFTER analysis.
   Example: opening last visited site, navigating to a URL.
6. For questions that only need information (not an action):
   → set "function" to null.

Your response MUST be JSON like:

---

FOR ANALYSIS INFORMATION (NO ACTION):
{
  "function": null,
  "output": "<analysis using ONLY userData>"
}

---

FOR ACTION BASED ON HISTORY:
{
  "function": "<JS that performs the action using analysis>",
  "output": "<short explanation>"
}

---

Process the task STRICTLY using userData and do not add any entries that aren't in userData.
`;
        break;

      default:
        prompt = `
User said: "${task}"

Return:
{
  "function": <JavaScript code to perform this browser action>,
  "output": "<answer or information in text form>"
}
`;
        break;
    }

    const response = await safeGenerate(prompt);
    const text = cleanText(response);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { function: null, output: text || "No valid JSON." };
    }

    console.log("✅ Parsed Output:", parsed);

    res.status(200).json({
      success: true,
      category,
      functionCode: parsed.function,
      output: parsed.output,
    });
  } catch (error: any) {
    console.error("executeTask error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to execute task",
      error: error.message || error,
    });
  }
};
