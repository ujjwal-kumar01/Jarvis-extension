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
      if (res?.loggedIn) {
        setIsLoggedIn(res?.loggedIn);
      }
    });
  }, [isLoggedIn]);

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
        throw new Error(`Failed to identify category : ${identifyData.message}`);

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
        console.log(response)
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

  const [time, setTime] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-GB", { hour12: false })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);


  const [typedLog, setTypedLog] = useState("");
  const typingSpeed = 15;

  useEffect(() => {
    if (!resp) return;

    let i = 0;
    setTypedLog("");

    const typer = setInterval(() => {
      setTypedLog((prev) => prev + resp.charAt(i));
      i++;
      if (i >= resp.length) clearInterval(typer);
    }, typingSpeed);

    return () => clearInterval(typer);
  }, [resp]);

  const logout = async () => {
    try {
      await fetch('http://localhost:8000/user/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Error logging out:', error)
    } finally {
      setIsLoggedIn(false);
      useEffect(() => {
        chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (res) => {
          setIsLoggedIn(!!res?.loggedIn);
        });
      }, [setIsLoggedIn]);
      setResp("");
      setFunctionCode("");
      setCategory("");
    }
  }


  return (
    <div className="min-h-screen bg-[#020d14] text-cyan-400 flex items-center justify-center p-4 font-mono">

      <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-xl shadow-[0_0_60px_rgba(0,255,255,0.2)] overflow-hidden">

        {/* HEADER */}
        <div className="flex justify-between items-center px-5 py-3 border-b border-cyan-500/20 text-xs tracking-widest">
          <div>
            <div className="text-cyan-300 font-bold tracking-[4px]">
              JARVIS OS
            </div>
            <div className="text-[10px] text-cyan-600">
              MARK I // AI SUBSYSTEM
            </div>
          </div>

          <div className="text-cyan-400 text-sm">
            {time}
          </div>
        </div>

        {/* SYSTEM READY */}
        <div className="text-center py-5">
          <h2 className="text-xl tracking-[6px] text-cyan-300">
            SYSTEM READY
          </h2>
          <div className="w-24 h-[1px] bg-cyan-500 mx-auto mt-2 opacity-50"></div>
        </div>

        {/* AI CORE */}
        <div className="flex justify-center mb-6">
          <div className="relative w-40 h-40 rounded-full border border-cyan-500/30 flex items-center justify-center">

            <div className="absolute w-full h-full rounded-full border border-cyan-400/20 animate-spin-slow"></div>

            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-cyan-500/30 to-transparent flex items-center justify-center shadow-[0_0_40px_rgba(0,255,255,0.5)]">

              {/* Voice Waveform */}
              <div className="flex gap-[3px] items-end h-8">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="w-[3px] bg-cyan-400 animate-wave"
                    style={{
                      animationDelay: `${i * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>

            </div>
          </div>
        </div>

        {/* COMMAND INPUT FIELD */}
        <div className="px-5 space-y-4">

          {!isLoggedIn ? (
            <div className="text-center text-sm text-red-400">
              ACCESS DENIED — LOGIN REQUIRED
            </div>
          ) : (
            <form onSubmit={execute} className="space-y-3">
              <input
                type="text"
                placeholder="Type your command..."
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="w-full bg-black/70 border border-cyan-500/30 rounded px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 placeholder:text-cyan-700"
              />

              <button
                disabled={loading}
                className={`w-full py-2 text-sm tracking-widest rounded ${loading
                    ? "bg-gray-700 cursor-not-allowed"
                    : "bg-cyan-600 hover:bg-cyan-500 shadow-[0_0_20px_rgba(0,255,255,0.5)]"
                  }`}
              >
                {loading ? "PROCESSING..." : "EXECUTE"}
              </button>
            </form>
          )}

          {category && (
            <div className="text-xs text-cyan-500 tracking-wider">
              DETECTED MODULE: {category.toUpperCase()}
            </div>
          )}

          {/* TERMINAL LOG */}
          <div className="bg-black/80 border border-cyan-500/20 rounded mt-4">
            <div className="px-3 py-2 text-xs border-b border-cyan-500/20 text-cyan-600 tracking-wider">
              LIVE TERMINAL
            </div>

            <div className="h-40 overflow-auto p-3 text-xs text-green-400 whitespace-pre-wrap">
              {typedLog || "Listening for command..."}
              <span className="animate-pulse">▍</span>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        {isLoggedIn ? (
          <div className="px-5 py-4 border-t border-cyan-500/20 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              LINK ESTABLISHED
            </div>

            <button onClick={logout} className="w-8 h-8 rounded-full border border-red-500 text-red-500 hover:bg-red-500/20">
              ⏻
            </button>
          </div>
        ) :(
          <div className="px-5 py-4 border-t border-cyan-500/20 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
              LINK NOT ESTABLISHED
            </div>
          </div>
        )}

      </div>
    </div>
  );

}

export default Form;
