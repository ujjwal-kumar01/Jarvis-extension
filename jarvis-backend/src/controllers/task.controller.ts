// controllers/task.controller.ts
import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../utils/ApiError.js";
import dotenv from "dotenv";

dotenv.config();

// ----------------------------------------------------
// Initialize Gemini Client
// ----------------------------------------------------
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// ----------------------------------------------------
// SAFE GENERATE WITH RETRY
// ----------------------------------------------------
async function safeGenerate(prompt: string, retries = 5, baseDelay = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const text =
        response?.candidates?.[0]?.content?.parts?.[0]?.text ||
        (response as any).text ||
        "";

      if (!text) throw new Error("Empty Gemini response");
      return text;
    } catch (error: any) {
      const msg = error?.message || JSON.stringify(error);

      // Retry on common transient errors
      if (
        msg.includes("overloaded") ||
        msg.includes("quota") ||
        msg.includes("503") ||
        msg.includes("429")
      ) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.warn(
          `⚠️ Gemini rate limit or transient error. Retrying in ${delay}ms (Attempt ${attempt}/${retries})`
        );
        await new Promise((res) => setTimeout(res, delay));
        continue;
      }

      console.error("❌ Gemini fatal error:", msg);
      throw error;
    }
  }

  throw new Error("Gemini overloaded after multiple retries.");
}

// ----------------------------------------------------
// CLEAN TEXT (strip codeblocks)
function cleanText(raw: string): string {
  return raw.replace(/```json|```javascript|```js|```/g, "").trim();
}

// ----------------------------------------------------
// IDENTIFY TASK
// - returns one of:
//   fillInput, clickButton, domAction, navigate, genericJS,
//   scanningPage, scanningBrowser, textOnly, notDoable
// ----------------------------------------------------
export const identifyTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { task } = req.body;
    if (!task || !task.trim()) throw new ApiError(400, "Task description is required");

    const prompt = `
You are a task classification agent for a Chrome extension.
Classify the user's natural language request into EXACTLY one of these categories:

{
  "category": "<fillInput | clickButton | domAction | navigate | genericJS | scanningPage | scanningBrowser | textOnly | notDoable>",
  "explanation": "<brief reason>"
}

DEFINITIONS:
- fillInput: user wants to type/fill a value into an input field (e.g., "type my email", "enter password").
- clickButton: user wants to click a button or link (e.g., "click login", "press submit").
- domAction: non-click/fill DOM actions like scroll, extract elements, highlight, select dropdown (e.g., "scroll to bottom", "extract all links").
- navigate: open or navigate to a URL or site (e.g., "open YouTube", "go to gmail").
- genericJS: run arbitrary JavaScript not tied to a specific element (e.g., "change background color", "run this script").
- scanningPage: analyze or summarize the current page content (e.g., "summarize this page", "what's on this page?").
- scanningBrowser: use browser history/tabs/bookmarks data (e.g., "show last visited sites", "filter history").
- textOnly: return plain text answer / no action (e.g., "who is the CEO of X").
- notDoable: unsafe, impossible, or unclear for the browser automation.

Classify this task (only output JSON):

Task: "${task}"
`;

    const response = await safeGenerate(prompt);
    const text = cleanText(response);

    let aiResult: { category: string; explanation: string } = { category: "notDoable", explanation: "Unable to determine." };
    try {
      aiResult = JSON.parse(text);
      if (typeof aiResult.category !== "string") aiResult.category = "notDoable";
      if (typeof aiResult.explanation !== "string") aiResult.explanation = "Unable to determine.";
    } catch {
      const match = text.match(/"category":\s*"([^"]+)".*"explanation":\s*"([^"]+)"/s);
      if (match) {
        aiResult = { category: match[1] || "notDoable", explanation: match[2] || "Unable to determine." };
      }
    }

    const valid = [
      "fillInput",
      "clickButton",
      "domAction",
      "navigate",
      "genericJS",
      "scanningPage",
      "scanningBrowser",
      "textOnly",
      "notDoable",
    ];
    if (!valid.includes(aiResult.category)) aiResult.category = "notDoable";

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

// ----------------------------------------------------
// EXECUTE TASK
// - Returns structured JSON matching the frontend's expected payload
// ----------------------------------------------------
export const executeTask = async (req: Request, res: Response): Promise<void> => {
  try {
    const { task, category, userData } = req.body;
    if (!task || !category) throw new ApiError(400, "Task and category required");

    // short context derived from userData (history or page scan)
    const context = userData ? JSON.stringify(userData).slice(0, 3000) : "No context provided.";

    let prompt = "";

    // Build category-specific prompt that instructs model to return structured JSON
    switch (category) {
      case "fillInput":
        prompt = `
User intent: "${task}"

Return JSON ONLY:

{
  "selector": "<css selector of input element to fill>",
  "value": "<string value to type into the input (or empty string)>",
  "output": "<short explanation>"
}

Rules:
- If the user specified the exact value, use it.
- If the input type is obvious (email/password/search), prefer input[type="..."] selectors.
- Avoid overly generic selectors unless necessary.
- Do NOT include any extra keys.
`;
        break;

      case "clickButton":
        prompt = `
User intent: "${task}"

Return JSON ONLY:

{
  "selector": "<css selector of the button/link to click>",
  "output": "<short explanation>"
}

Rules:
- Prefer button text based selectors or button[type='submit'].
- If ambiguous, pick a reasonable generic selector like "button" or "a".
`;
        break;

      case "domAction":
        prompt = `
User intent: "${task}"

Return JSON ONLY:

{
  "action": {
    "type": "<scroll | extract | select | modify | custom>",
    "value": <number|string|object|array (depends on action)>
  },
  "output": "<short explanation>"
}

Examples:
- Scroll 500px: { "action": { "type": "scroll", "value": 500 }, "output": "Scrolls down 500 pixels" }
- Extract links: { "action": { "type": "extract", "value": "links" }, "output": "Extracts all hrefs" }
- Select dropdown: { "action": { "type": "select", "value": { "selector": "select#id", "option": "text or value" } }, "output": "Selects option" }
`;
        break;

      case "navigate":
        prompt = `
User intent: "${task}"

Return JSON ONLY:

{
  "functionCode": "<JS code to navigate, e.g. window.open('https://...') or window.location.href='...'>",
  "output": "<short explanation>"
}

Rules:
- If user asked to open a known site, put explicit URL.
- Only return navigation JS code.
`;
        break;

      case "genericJS":
        prompt = `
User intent: "${task}"

Return JSON ONLY:

{
  "functionCode": "<JavaScript code to execute in page context>",
  "output": "<short explanation>"
}

Rules:
- Code must use DOM APIs if needed and be runnable via eval.
- Do NOT include chrome.* APIs.
- Avoid async unless necessary.
`;
        break;

      case "scanningPage":
        // For scanningPage we expect the page-scan to have been provided client-side as userData,
        // but keep a variant where model can also provide JS to extract more if necessary.
        prompt = `
User wants to analyze the current webpage and then do the Task: "${task}"
if it says answer the question you see what question is there and then answer it.

You are provided the page data (if available) as context:
${context}

Return JSON ONLY. Choose one of the two response shapes:

A) If analysis only then do what task requests based on page content:
{
  "functionCode": null,
  "output": "<answer based on task and page content>"
}

B) If a JS function is useful for deeper extraction in page context:
{
  "functionCode": "<pure JS (DOM APIs) to run in page context>",
  "output": "<short explanation>"
}

Rules:
- If returning functionCode, it MUST be a DOM-only JS string (no chrome APIs, no backticks).
- Output should be a clear human-readable summary or explanation.
`;
        break;

      case "scanningBrowser":
        prompt = `
User wants a browser-level analysis: "${task}"

You are given userData (history/tabs) as context:
${context}

Return JSON ONLY.

If the task is informational (analysis/filtering) return:
{
  "functionCode": null,
  "output": "<analysis strictly derived from provided userData>"
}

If the task requires an action (e.g., "open last visited site") return:
{
  "functionCode": "<JS that performs the action (e.g., window.open('...'))>",
  "output": "<short explanation>"
}

RULES:
- DO NOT invent URLs or timestamps.
- USE ONLY the provided userData for analysis.
- Do NOT call any chrome.* APIs in returned functionCode.
`;
        break;

      case "textOnly":
        prompt = `
User asked: "${task}"

Return JSON ONLY:

{
  "functionCode": null,
  "output": "<plain text answer>"
}
`;
        break;

      case "notDoable":
        prompt = `
User asked: "${task}"

Return JSON ONLY:

{
  "functionCode": null,
  "output": "<brief explanation why it's not doable or safe>"
}
`;
        break;

      default:
        // Fallback: try to produce a generic JS or explanation
        prompt = `
User asked: "${task}"

Return JSON ONLY. Preferred keys:
- functionCode (string) OR selector/value/action depending on task,
- output (string).

Example:
{ "functionCode": "document.body.style.background='red'", "output": "Changes background to red" }
`;
        break;
    }

    // Call the LLM
    const response = await safeGenerate(prompt);
    const raw = cleanText(response);

    // Try to parse JSON robustly; if parsing fails, attempt to salvage useful info
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fallback: try to extract keys using regex
      parsed = { functionCode: null, selector: undefined, value: undefined, action: undefined, output: raw };
      try {
        const selMatch = raw.match(/"selector"\s*:\s*"([^"]+)"/);
        if (selMatch) parsed.selector = selMatch[1];
        const valueMatch = raw.match(/"value"\s*:\s*"([^"]+)"/);
        if (valueMatch) parsed.value = valueMatch[1];
        const actionMatch = raw.match(/"action"\s*:\s*({[\s\S]*})/);
        if (actionMatch) {
          const actionStr = actionMatch[1];
          if (typeof actionStr === "string" && actionStr.length > 0) {
            try {
              parsed.action = JSON.parse(actionStr);
            } catch {
              parsed.action = actionStr;
            }
          } else {
            parsed.action = actionStr;
          }
        }
      } catch (e) {
        // ignore salvage errors
      }
    }

    // Normalize returned shape
    const result = {
      category,
      selector: parsed.selector,
      value: parsed.value,
      action: parsed.action,
      functionCode: parsed.functionCode || parsed.function || parsed?.functionCode || null,
      output: parsed.output || parsed?.text || parsed?.explanation || (typeof parsed === "string" ? parsed : null),
    };

    console.log("✅ executeTask parsed result:", result);

    res.status(200).json({
      success: true,
      ...result,
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
