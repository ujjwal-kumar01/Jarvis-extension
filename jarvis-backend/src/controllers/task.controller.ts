// import type { Request, Response } from "express";
// import OpenAI from "openai";
// import { ApiError } from "../utils/ApiError.js";

// const openai = new OpenAI({
//   apiKey:`${process.env.OPENAI_API_KEY}`,
// });

// // ---------------- SAFE GENERATE WITH RETRY ----------------
// async function safeGenerate(prompt: string, retries = 5, baseDelay = 1000) {
//   for (let attempt = 1; attempt <= retries; attempt++) {
//     try {
//       const completion = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [{ role: "user", content: prompt }],
//         temperature: 0.3,
//       });
//       const content =
//         completion?.choices?.[0]?.message?.content ??
//         // fallback for other response shapes (e.g., older SDKs or different API responses)
//         (completion?.choices?.[0] as any)?.text ??
//         "";
//       if (!content) {
//         throw new Error("OpenAI returned an empty or unexpected response shape.");
//       }
//       return content;
//     } catch (error: any) {
//       const code = error?.status || error?.response?.status;
//       const msg = error?.message || JSON.stringify(error);

//       if (code === 429 || code === 503 || msg.includes("rate") || msg.includes("overloaded")) {
//         const delay = baseDelay * Math.pow(2, attempt - 1); // exponential backoff
//         console.warn(
//           `⚠️ OpenAI rate limit or overload. Retrying in ${delay}ms (Attempt ${attempt}/${retries})`
//         );
//         await new Promise((res) => setTimeout(res, delay));
//         continue;
//       }

//       console.error("❌ OpenAI fatal error:", msg);
//       throw error;
//     }
//   }

//   throw new Error("OpenAI service overloaded after multiple retries.");
// }

// // ---------------- CLEANUP FUNCTION ----------------
// function cleanText(raw: string): string {
//   return raw.replace(/```json|```/g, "").trim();
// }

// // ---------------- IDENTIFY TASK ----------------
// export const identifyTask = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { task } = req.body;
//     if (!task || !task.trim()) throw new ApiError(400, "Task description is required");

//     const prompt = `
// You are a task classification agent.
// A user will give a natural language command.
// You must output a JSON object with two fields:
// {
//   "category": "<one of scanningBrowser | simpleDoingTask | scanningPage | simplePrintingTask | notDoableTask>",
//   "explanation": "<brief reason why it falls into this category>"
// }

// Rules:
// - "scanningBrowser" → tasks involving analyzing browser history or tabs.
// - "simpleDoingTask" → simple actions (e.g., open YouTube, download images, navigate to a link).
// - "scanningPage" → reading or extracting data from the current webpage.
// - "simplePrintingTask" → tasks that only require displaying or summarizing info.
// - "notDoableTask" → anything unclear or not possible for a browser assistant.

// Now classify this task: "${task}"
// `;

//     const response = await safeGenerate(prompt);
//     const text = cleanText(response || "");

//     let aiResult = { category: "notDoableTask", explanation: "Unable to determine." };
//     try {
//       aiResult = JSON.parse(text);
//     } catch {
//       const match = text.match(
//         /"category":\s*"([^"]+)".*"explanation":\s*"([^"]+)"/s
//       );
//       if (match)
//         aiResult = {
//           category: match[1] || "notDoableTask",
//           explanation: match[2] || "Unable to determine.",
//         };
//     }

//     const validCategories = [
//       "scanningBrowser",
//       "simpleDoingTask",
//       "scanningPage",
//       "simplePrintingTask",
//       "notDoableTask",
//     ];
//     if (!validCategories.includes(aiResult.category))
//       aiResult.category = "notDoableTask";

//     res.status(200).json({
//       success: true,
//       task,
//       category: aiResult.category,
//       explanation: aiResult.explanation,
//     });
//   } catch (error: any) {
//     console.error("identifyTask error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to identify task",
//       error: error.message || error,
//     });
//   }
// };

// // ---------------- EXECUTE TASK ----------------
// export const executeTask = async (req: Request, res: Response): Promise<void> => {
//   try {
//     const { task, category, userData } = req.body;
//     if (!task || !category) throw new ApiError(400, "Task and category are required");

//     const contextData = userData
//       ? JSON.stringify(userData).slice(0, 5000)
//       : "No context provided.";

//     let prompt = "";
//     switch (category) {
//       case "scanningBrowser":
//         prompt = `
// Command: "${task}"
// Data: ${contextData}
// Return JSON:
// {
//   "function": "JS code that processes this data",
//   "output": "Summary or insights"
// }`;
//         break;

//       case "scanningPage":
//         prompt = `
// Command: "${task}"
// Page Data: ${contextData}
// Return JSON:
// {
//   "function": "JS code that extracts/reads page data",
//   "output": "Summary or extracted content"
// }`;
//         break;

//       case "simpleDoingTask":
//         prompt = `
// Command: "${task}"
// Context: ${contextData}
// Return JSON:
// {
//   "function": "JS code to perform the requested browser action",
//   "output": "Message to display to the user"
// }`;
//         break;

//       case "simplePrintingTask":
//         prompt = `
// Command: "${task}"
// Return JSON:
// {
//   "function": null,
//   "output": "Direct textual response"
// }`;
//         break;

//       default:
//         prompt = `
// Command: "${task}"
// Return JSON:
// {
//   "function": null,
//   "output": "Sorry, this task cannot be executed."
// }`;
//         break;
//     }

//     const response = await safeGenerate(prompt);
//     const text = cleanText(response || "");

//     let parsedOutput;
//     try {
//       parsedOutput = JSON.parse(text);
//     } catch {
//       parsedOutput = { function: null, output: text || "No output." };
//     }

//     res.status(200).json({
//       success: true,
//       category,
//       functionCode: parsedOutput.function,
//       output: parsedOutput.output,
//     });
//   } catch (error: any) {
//     console.error("executeTask error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to execute task",
//       error: error.message || error,
//     });
//   }
// };
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

      default:
        prompt = `
User said: "${task}"

Return:
{
  "function": null,
  "output": "Sorry, this task cannot be executed by this Chrome assistant."
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
