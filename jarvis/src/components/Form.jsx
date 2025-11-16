import React, { useState } from "react";

function Form() {
  const [task, setTask] = useState("");
  const [resp, setResp] = useState("");
  const [functionCode, setFunctionCode] = useState("");
  const [category, setCategory] = useState("");
  const [userData, setUserData] = useState([]);
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

      // 🟦 Hold the final userdata here
      let finalUserData = userData;

      if (detectedCategory === "scanningBrowser") {
        const browserHistoryResponse = await chrome.runtime.sendMessage({
          type: "SCAN_BROWSER_HISTORY"
        });

        if (!browserHistoryResponse.success) {
          setResp("❌ Failed to scan browser history: " + browserHistoryResponse.error);
          return;
        }

        finalUserData = browserHistoryResponse.history;

        // keep max 200 entries
        finalUserData = Array.isArray(finalUserData)
          ? finalUserData.slice(0, 200)
          : [];

        setUserData(finalUserData);  // ❗ store array, not string

        console.log("🧾 Browser History:", finalUserData);
      }


      // STEP 2️⃣: Execute the task using userdata
      const executeRes = await fetch("http://localhost:3000/task/executeTask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task,
          category: detectedCategory,
          userData: finalUserData,        // ✔ Correct value
        }),
      });

      const executeData = await executeRes.json();
      if (!executeData.success) throw new Error("Failed to execute task");

      console.log("✅ Execute Result:", executeData);

      // STEP 3️⃣: Extract function code
      let code = (executeData.functionCode || "")
        .replace(/```(json|javascript|js)?/g, "")
        .replace(/^{\s*"function":\s*"/, "")
        .replace(/"\s*}$/, "")
        .trim();

      setFunctionCode(code);
      setResp(executeData.output || "");
      setUserData([]) // Clear userData after use

      // STEP 4️⃣: Send code to background
      if (code && chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          { type: "EXECUTE_TASK", functionCode: code },
          (bgResponse) => {
            if (chrome.runtime.lastError) {
              setResp((prev) => prev + `\n⚠️ ${chrome.runtime.lastError.message}`);
              setLoading(false);
              return;
            }

            if (!bgResponse) {
              setResp((prev) => prev + "\n⚠️ No background response.");
              setLoading(false);
              return;
            }

            if (bgResponse.success) {
              setResp((prev) => prev + `\n✅ ${bgResponse.message}`);
            } else {
              setResp((prev) => prev + `\n❌ Error: ${bgResponse.error}`);
            }

            setLoading(false);
          }
        );
        
        return;
      }

      // STEP 5️⃣: Fallback for non-Chrome environments
      if (code) {
        try {
          const fn = new Function("userData", code);
          await fn(finalUserData);
          setResp((prev) => prev + "\n🧩 Executed fallback.");
        } catch (err) {
          setResp((prev) => prev + `\n❌ Fallback execution error: ${err.message}`);
        }
      }
    } catch (err) {
      console.error("❌ Error:", err);
      setResp("❌ Error: " + (err.message || err));
    } finally {
      if (!chrome?.runtime?.sendMessage) setLoading(false);
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
        <button className="bg-blue-500 text-white rounded-md p-2 hover:bg-blue-600">
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
