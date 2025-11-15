import React, { useState } from "react";

function Form() {
  const [task, setTask] = useState("");
  const [resp, setResp] = useState("");
  const [functionCode, setFunctionCode] = useState("");
  const [category, setCategory] = useState("");
  const [userData, setUserData] = useState({});
  const [loading, setLoading] = useState(false);

  const execute = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResp("");
    setFunctionCode("");

    try {
      // STEP 1️⃣: Identify the task
      const identifyRes = await fetch("http://localhost:3000/task/identifyTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });

      const identifyData = await identifyRes.json();
      if (!identifyData.success) throw new Error("Failed to identify task");

      console.log("✅ Identify Result:", identifyData);
      const detectedCategory = identifyData.category;
      setCategory(detectedCategory);

      if (detectedCategory=== "scanningBrowser") {
        
      }

      // STEP 2️⃣: Execute the task on server to generate function code
      const executeRes = await fetch("http://localhost:3000/task/executeTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, category: detectedCategory, userData }),
      });

      const executeData = await executeRes.json();
      if (!executeData.success) throw new Error("Failed to execute task");

      console.log("✅ Execute Result:", executeData);

      // STEP 3️⃣: Clean and extract code
      let code = executeData.functionCode || "";
      const output = executeData.output || "";

      code = code
        .replace(/```(json|javascript|js)?/g, "")
        .replace(/^{\s*"function":\s*"/, "")
        .replace(/"\s*}$/, "")
        .trim();

      // 🚫 Don't use new Function() — violates Chrome CSP
      setFunctionCode(code);
      setResp(output);

      // STEP 4️⃣: Send code to background to inject into the active tab
      if (code && typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(
          { type: "EXECUTE_TASK", functionCode: code }, // send raw string
          (bgResponse) => {
            if (chrome.runtime.lastError) {
              console.warn("chrome.runtime.lastError:", chrome.runtime.lastError.message);
              setResp((prev) => prev + `\n⚠️ Warning: ${chrome.runtime.lastError.message}`);
              setLoading(false);
              return;
            }

            if (!bgResponse) {
              console.warn("⚠️ No response from background script");
              setResp((prev) => prev + "\n⚠️ No response received from background.");
              setLoading(false);
              return;
            }

            console.log("📨 Background response:", bgResponse);
            if (bgResponse.success) {
              setResp((prev) => prev + `\n✅ ${bgResponse.message || "Executed successfully."}`);
            } else {
              setResp((prev) => prev + `\n❌ Error: ${bgResponse.error || "Unknown error occurred."}`);
            }

            setLoading(false);
          }
        );
        return;
      }

      // STEP 5️⃣: Fallback (for non-Chrome environments)
      if (code) {
        try {
          console.warn("chrome.runtime not available — running code in popup context as fallback.");
          // Only allow safe limited eval in development mode (optional)
          // eslint-disable-next-line no-new-func
          const fn = new Function("userData", code);
          await fn(userData);
          setResp((prev) => prev + "\n🧩 Executed code in popup fallback.");
        } catch (err) {
          console.error("Fallback execution error:", err);
          setResp((prev) => prev + `\n❌ Fallback execution error: ${err.message}`);
        }
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setResp("❌ Error: " + (err.message || err));
    } finally {
      if (!(typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage)) {
        setLoading(false);
      }
    }
  };

  return (
    <div className="p-6 flex flex-col items-center text-black min-w-[350px]">
      <form onSubmit={execute} className="flex flex-col gap-2 w-full max-w-md">
        <input
          type="text"
          placeholder="Enter your task (e.g., open facebook)"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          className="border p-2 rounded-md"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600"
        >
          {loading ? "Processing..." : "Execute"}
        </button>
      </form>

      {resp && (
        <div className="mt-4 bg-gray-100 p-3 rounded-md w-full max-w-md">
          <h3 className="font-bold mb-1">Output:</h3>
          <pre className="whitespace-pre-wrap text-sm">{resp}</pre>
        </div>
      )}

      {functionCode && (
        <div className="mt-4 bg-gray-200 p-3 rounded-md w-full max-w-md">
          <h3 className="font-bold mb-1">Generated Function:</h3>
          <pre className="whitespace-pre-wrap text-sm">{functionCode}</pre>
        </div>
      )}
    </div>
  );
}

export default Form;
