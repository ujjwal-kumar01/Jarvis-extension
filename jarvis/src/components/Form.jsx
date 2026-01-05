import React, { useState, useRef, useEffect } from "react";

function Form() {
  const [task, setTask] = useState("");
  const [resp, setResp] = useState("");
  const [functionCode, setFunctionCode] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);

  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [resp, functionCode]);

  const appendLog = (msg) => {
    setResp((prev) => prev + "\n" + msg);
  };

  const execute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResp("");
    setFunctionCode("");

    try {
      /****************************************
       * STEP 1 — IDENTIFY TASK CATEGORY
       ****************************************/
      appendLog("🔍 Identifying task category...");

      const identifyRes = await fetch("http://localhost:8000/task/identifyTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });

      const identifyData = await identifyRes.json();
      if (!identifyData.success) throw new Error("Failed to identify category");

      const detectedCategory = identifyData.category;
      setCategory(detectedCategory);
      appendLog(`📌 Category detected: ${detectedCategory}`);

      let finalUserData = {};

      /****************************************
       * STEP 2 — SCAN PAGE / HISTORY IF NEEDED
       ****************************************/
      if (detectedCategory === "scanningBrowser") {
        appendLog("🧭 Scanning browser history...");

        const response = await chrome.runtime.sendMessage({
          type: "SCAN_BROWSER_HISTORY",
        });

        if (!response?.success) throw new Error("History scan failed");
        finalUserData = response.history.slice(0, 300);

        appendLog(`📚 History items scanned: ${finalUserData.length}`);
      }

      if (
        detectedCategory === "scanningPage" ||
        detectedCategory === "fillInput" ||
        detectedCategory === "clickButton" ||
        detectedCategory === "domAction"
      ) {
        appendLog("🔎 Scanning current page...");

        const response = await chrome.runtime.sendMessage({
          type: "SCAN_PAGE",
        });

        if (!response?.success) throw new Error("Page scan failed");
        finalUserData = response.data;

        appendLog("📄 Page scan successful.");
      }

      /****************************************
       * STEP 3 — REQUEST EXECUTABLE CODE
       ****************************************/
      appendLog("⚙ Requesting executable instructions...");

      const execRes = await fetch("http://localhost:8000/task/executeTask", {
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

      const code = (execData.functionCode || "")
        .replace(/```(js|javascript|json)?/g, "")
        .replace(/```/g, "")
        .trim();

        
      setResp(execData.output || "");
      setFunctionCode(code);
      appendLog("📦 Function code generated.");

      /****************************************
       * STEP 4 — SEND ACTION TO BACKGROUND
       ****************************************/
      appendLog("🚀 Executing instructions on the active tab...");

      let messagePayload = null;

      switch (detectedCategory) {
        case "fillInput":
          if (!execData.selectors?.length)
            throw new Error("No selectors returned for filling input.");

          messagePayload = {
            type: "FILL_INPUT",
            selectors: execData.selectors.map((item) => ({
              selector: item.selector,
              value: item.value,
            })),
          };
          break;

        case "clickButton":
          if (!execData.selectors?.length)
            throw new Error("No selectors returned for clicking.");

          messagePayload = {
            type: "CLICK_BUTTON",
            selectors: execData.selectors.map((s) => ({
              selector: typeof s === "string" ? s : s.selector,
            })),
          };
          break;

        case "domAction":
          if (!execData.actions?.length)
            throw new Error("No actions returned for DOM manipulation.");

          messagePayload = {
            type: "DOM_ACTION",
            actions: execData.actions,
          };
          break;

        case "scanningPage":
        case "scanningBrowser":
          messagePayload = null;
          break;

        default:
          messagePayload = {
            type: "EXECUTE_TASK",
            functionCode: code,
          };
      }

      if (messagePayload) {
        const bgResponse = await chrome.runtime.sendMessage(messagePayload);

        if (!bgResponse) {
          appendLog("⚠ No background response received.");
        } else if (bgResponse.success) {
          appendLog("✅ Action executed successfully.");

          if (bgResponse.results?.[0]?.url) {
            appendLog(`📸 Extracted URL: ${bgResponse.results[0].url}`);
          }
        } else {
          appendLog(`❌ Background error: ${bgResponse.error}`);
        }
      }

      appendLog("🎉 Task completed.");
      setLoading(false);
    } catch (err) {
      appendLog("❌ Error: " + err.message);
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

      {category && (
        <p className="mt-2 text-sm text-gray-600 w-full text-left">
          <b>Category:</b> {category}
        </p>
      )}

      <div
        ref={logRef}
        className="mt-4 bg-gray-100 p-3 rounded-md w-full h-60 overflow-auto"
      >
        <pre className="text-sm whitespace-pre-wrap">{resp}</pre>
      </div>

      {functionCode && (
        <div className="mt-4 bg-gray-200 p-3 rounded-md w-full">
          <pre className="text-sm whitespace-pre-wrap">{functionCode}</pre>
        </div>
      )}
    </div>
  );
}

export default Form;
