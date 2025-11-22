import React, { useState } from "react";

function Form() {
  const [task, setTask] = useState("");
  const [resp, setResp] = useState("");
  const [functionCode, setFunctionCode] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const execute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResp("");
    setFunctionCode("");

    try {
      /****************************************
       * STEP 1 — IDENTIFY TASK CATEGORY
       ****************************************/
      const identifyRes = await fetch("http://localhost:3000/task/identifyTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });

      const identifyData = await identifyRes.json();
      if (!identifyData.success) throw new Error("Failed to identify category");

      const detectedCategory = identifyData.category;
      setCategory(detectedCategory);

      let finalUserData = {};

      /****************************************
       * STEP 2 — PAGE / BROWSER SCAN
       ****************************************/

      if (detectedCategory === "scanningBrowser") {
        const response = await chrome.runtime.sendMessage({
          type: "SCAN_BROWSER_HISTORY",
        });

        if (!response?.success) {
          setResp("❌ History scan failed: " + response?.error);
          setLoading(false);
          return;
        }

        finalUserData = response.history.slice(0, 300);
      }

      else if (
        detectedCategory === "scanningPage" ||
        detectedCategory === "fillInput" ||
        detectedCategory === "clickButton" ||
        detectedCategory === "domAction"
      ) {
        const response = await chrome.runtime.sendMessage({
          type: "SCAN_PAGE",
        });

        if (!response?.success) {
          setResp("❌ Page scan failed: " + response?.error);
          setLoading(false);
          return;
        }

        finalUserData = response.data;
      }

      /****************************************
       * STEP 3 — REQUEST EXECUTABLE CODE
       ****************************************/
      const execRes = await fetch("http://localhost:3000/task/executeTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          category: detectedCategory,
          userData: finalUserData,
        }),
      });

      const execData = await execRes.json();
      if (!execData.success) throw new Error("Execution failed");

      // Clean up JS code formatting
      const code = (execData.functionCode || "")
        .replace(/```(js|javascript|json)?/g, "")
        .replace(/```/g, "")
        .trim();

      setFunctionCode(code);
      setResp(execData.output || "");

      /****************************************
       * STEP 4 — SEND INSTRUCTION TO BACKGROUND
       ****************************************/
      let messagePayload = null;

      switch (detectedCategory) {
        case "fillInput":
          messagePayload = {
            type: "FILL_INPUT",
            selectors: execData.selectors.map((item) => ({
              selector: item.selector,
              value: item.value,
            })),
          };
          break;

        case "clickButton":
          messagePayload = {
            type: "CLICK_BUTTON",
            selectors: execData.selectors.map((s) => ({
              selector: typeof s === "string" ? s : s.selector,
            })),
          };
          break;

        case "domAction":
          messagePayload = {
            type: "DOM_ACTION",
            actions: execData.actions.map((a) => ({
              type: a.type,
              selector: a.selector || null,
              value: a.value || null,
            })),
          };
          break;

        case "scanningPage":
          messagePayload = null;
          break;

        default:
          messagePayload = {
            type: "EXECUTE_TASK",
            functionCode: code,
          };
      }

      if (messagePayload) {
        const res = chrome.runtime.sendMessage(messagePayload, (bgResponse) => {
          if (!bgResponse) {
            setResp((p) => p + "\n⚠ No background response.");
          } else if (bgResponse.success) {
            const first = bgResponse.results?.[0];
            const url = first?.url || null;

            setResp((p) =>
              p +
              `\n✅ Extraction Complete\n` +
              (url ? `Image URL: ${url}` : "⚠ No URL found")
            );

          } else {
            setResp((p) => p + `\n❌ ${bgResponse.error}`);
          }
          setLoading(false);
        });

      } else {
        setLoading(false);
      }

    } catch (err) {
      setResp("❌ Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-6 flex flex-col items-center text-black min-w-[350px]">
      <form onSubmit={execute} className="flex flex-col gap-2 w-full max-w-md">
        <input
          type="text"
          placeholder="Enter your task"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="border p-2 rounded-md"
        />

        <button className="bg-blue-500 text-white p-2 rounded-md">
          {loading ? "Processing..." : "Execute"}
        </button>
      </form>

      {resp && (
        <div className="mt-4 bg-gray-100 p-3 rounded-md w-full">
          <pre className="text-sm whitespace-pre-wrap">{resp}</pre>
        </div>
      )}

      {functionCode && (
        <div className="mt-4 bg-gray-200 p-3 rounded-md w-full">
          <pre className="text-sm whitespace-pre-wrap">{functionCode}</pre>
        </div>
      )}
    </div>
  );
}

export default Form;
