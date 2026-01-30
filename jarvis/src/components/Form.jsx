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

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (res) => {
      setIsLoggedIn(!!res?.loggedIn);
    });
  }, []);



  const execute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResp("");
    setFunctionCode("");
    setCategory("");

    try {
      /****************************************
       * STEP 1 — IDENTIFY TASK CATEGORY
       ****************************************/
      appendLog("🔍 Identifying task category...");

      const identifyRes = await fetch(
        "http://localhost:8000/task/identifyTask",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task }),
          credentials: "include"
        }
      );

      const identifyData = await identifyRes.json();
      if (!identifyData.success)
        throw new Error("Failed to identify category");

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
        credentials: "include",
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
    <div className="min-w-[360px] p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="rounded-2xl shadow-xl border border-white/10 bg-white/10 backdrop-blur-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-cyan-500 to-blue-600">
          <h1 className="text-lg font-semibold tracking-wide">
            🤖 Jarvis Assistant
          </h1>
          <p className="text-xs text-white/80">
            Natural language → Browser automation
          </p>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {!isLoggedIn ? (
            <div className="text-center text-sm text-red-400">
              Please login to continue.
            </div>
          ) : (
            <form onSubmit={execute} className="space-y-3">
            <input
              type="text"
              placeholder="What should I do for you?"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full rounded-xl px-4 py-2 text-sm bg-slate-900/80 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-gray-400"
            />

            <button
              disabled={loading}
              className={`w-full rounded-xl py-2 text-sm font-medium transition-all
                ${loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:opacity-90"
                }`}
            >
              {loading ? "Processing..." : "Execute Task"}
            </button>
          </form>
          )}

          {category && (
            <div className="text-xs text-cyan-300">
              <b>Detected Category:</b> {category}
            </div>
          )}

          {/* Logs */}
          <div className="bg-black/70 rounded-xl border border-white/10">
            <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">
              🧾 Execution Log
            </div>
            <div
              ref={logRef}
              className="h-48 overflow-auto p-3 text-xs font-mono text-green-400 whitespace-pre-wrap"
            >
              {resp || "Waiting for instructions..."}
            </div>
          </div>

          {/* Generated Code */}
          {functionCode && (
            <div className="bg-slate-900 rounded-xl border border-white/10">
              <div className="px-3 py-2 text-xs text-gray-400 border-b border-white/10">
                ⚙ Generated Function
              </div>
              <pre className="p-3 text-xs text-purple-300 overflow-auto whitespace-pre-wrap font-mono">
                {functionCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Form;
