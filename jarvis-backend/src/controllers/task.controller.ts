// controllers/task.controller.ts
import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../utils/ApiError.js";
import dotenv from "dotenv";
import User from "../models/user.models.js";
import {decrypt} from "./user.controller.js"
import { error } from "console";

dotenv.config();

// ----------------------------------------------------
// SAFE GENERATE WITH RETRY
// ----------------------------------------------------
async function safeGenerate(prompt: string, GEMINI_API_KEY:string, retries = 3, baseDelay = 1500) {
  const ai = new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
});
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
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

    const GEMINI_API_KEY= req.user.gemini.apiKeyEncrypted
    if(!GEMINI_API_KEY){
      res.status(400).json({
      success: false,
      message: "Please Provide Gemini API key",
    });
      return;
    }
    const NEW_GEMINI_API_KEY=decrypt(GEMINI_API_KEY)

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

    const response = await safeGenerate(prompt, NEW_GEMINI_API_KEY);
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

    
    const GEMINI_API_KEY= req.user.gemini.apiKeyEncrypted
    if(!GEMINI_API_KEY){
      res.status(400).json({
      success: false,
      message: "Please Provide Gemini API key",
      error:"Please Provide Gemini API Key"
    });
      return;
    }
    const NEW_GEMINI_API_KEY=decrypt(GEMINI_API_KEY)

    const context = userData ? JSON.stringify(userData).slice(0, 3000) : "No context provided.";
    let prompt = "";

    // ------------------------------------------------------------------
    // CATEGORY-SPECIFIC PROMPTS (ALREADY UPDATED FOR MULTI-SELECTOR)
    // ------------------------------------------------------------------
    switch (category) {
      case "fillInput":
        prompt = `
User intent: "${task}"
Page data: ${context}

Use the page data to match the input fields the user wants to fill and to generate selectors.

Return JSON ONLY:
{
  "selectors": [
    {
      "selector": "<actual css selector from the page>",
      "value": "<text to type>"
    }
  ],
  "output": "<short explanation>"
}

Rules:
- Do NOT use placeholder selectors like input[type="<type>"].
- Only use REAL selectors present in page scan: id, name, placeholder, label-based.
- selectors MUST always be an array.
- If user gives explicit values → fill ONLY those fields.
- If user says "fill all" → fill every input with realistic values.
- If page scan finds multiple similar inputs → use correct nth-of-type.
`;
        break;

      case "clickButton":
        prompt = `
User intent: "${task}"
Page data: ${context}
Use the page data to find the button(s) or link(s) to click.

Return JSON ONLY:
{
  "selectors": [
    {
      "selector": "<button selector>"
    }
  ],
  "output": "<short explanation>"
}

Rules:
- selectors MUST be an array.
- Match button by text, role, type, aria-label.
`;
        break;

      case "domAction":
        prompt = `
You are an automation engine that converts user intent into structured DOM actions.

User intent: "${task}"
Page data: ${context}
Use the page data to determine the necessary DOM actions and selectors.

Return JSON ONLY in this format:

{
  "actions": [
    {
      "type": "<scroll | extract | select | modify | click | focus>",
      "selector": "<CSS selector or null>",
      "value": "<value based on the action type or null>"
    }
  ],
  "output": "<short natural explanation of what you did>"
}

### RULES ###

- ALWAYS return an "actions" array, even if it's a single action.
- Avoid ambiguous selectors — prefer specific, safe CSS selectors.
- If user’s request requires multiple operations, add multiple actions.
- "scroll": value = pixels to scroll (positive = down).
- "extract": selector required; value = null.
- "select":  
    • If radio → set checked = true  
    • If checkbox → checked = true/false  
    • If dropdown → value must match option value  
- "modify": change value of input/textarea/select.
- "click": click a button or link.
- "focus": focus an element.
- Output must be valid JSON, no comments, no explanations outside "output" field.
`;
        break;

      case "navigate":
        prompt = `
User intent: "${task}"
Return JSON:
{
  "functionCode": "window.location.href='https://...'",
  "output": "<short explanation>"
}`;
        break;

      case "genericJS":
        
        prompt = `
User intent: "${task}"
Return JSON:
{
  "functionCode": "<JS code>",
  "output": "<short explanation>"
}`;
        break;

      case "scanningPage":
        prompt = `
User wants to analyze current page.
Page data: ${context}
User intent: "${task}"
do the analysis and provide based on that.


Return JSON ONLY:
A)
{
  "functionCode": null,
  "output": "<final answer>"
}

OR

B)
{
  "functionCode": "<DOM only JS to extract or interact with page not any other code>",
  "output": "<what it does and all other code which dont do anything with the page should be in output as an explanation but not in functionCode>"
}`;
        break;

      case "scanningBrowser":
        prompt = `
Use ONLY provided browser data: ${context}
User intent: "${task}"
answer the user request based on the data provided with analysis being already done .


Return:
{
  "functionCode": null or "<JS>",
  "output": "<analysis>"
}`;
        break;

      case "textOnly":
        prompt = `
        User intent: "${task}"
Return:
{
  "functionCode": null,
  "output": "<answer>"
}`;
        break;

      default:
        prompt = `
User intent: "${task}"
Return JSON:
{
  "functionCode": null,
  "output": "Not doable"
}`;
    }

    prompt+="ALWAYS FOCUS ON SAFETY AND AVOIDING HARM. NEVER RETURN ANY DANGEROUS CODE.ALSO PRIORTIZE THE TASK MORE THAN ANY RANDOM EXTRA INFORMATION IN THE USER DATA TO BETTER UNDERSTAND THE USER INTENT AND DELIVER THE BEST RESULT."

    // ------------------------------------------------------------------
    // CALL GEMINI SAFELY
    // ------------------------------------------------------------------
    const response = await safeGenerate(prompt, NEW_GEMINI_API_KEY);
    const raw = cleanText(response);

    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { output: raw };
    }

    // ------------------------------------------------------------------
    // NORMALIZE FINAL RESULT (VERY IMPORTANT)
    // ------------------------------------------------------------------
    const result = {
      category,

      // Always arrays
      selectors: Array.isArray(parsed.selectors) ? parsed.selectors : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],

      // Navigation / JS execution
      functionCode:
        parsed.functionCode ||
        parsed.function ||
        null,

      output:
        parsed.output ||
        parsed.explanation ||
        parsed.text ||
        null,
    };

    console.log("✅ Normalized executeTask result:", result);

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
