// background.js

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "EXECUTE_TASK") return;

  (async () => {
    try {
      // Ensure functionCode is a string
      const codeString = typeof msg.functionCode === "string" ? msg.functionCode.trim() : "";
      const taskHint = (msg.task || "").toString().toLowerCase();

      // get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) {
        sendResponse({ success: false, error: "No active tab found." });
        return;
      }

      const tabUrl = tab.url || "";
      console.log("⚙️ Executing in tab:", tab.id, "→", tabUrl);

      // Helper to detect restricted pages
      const isRestrictedPage = (url = "") =>
        !url || url.startsWith("chrome://") || url.startsWith("edge://") ||
        url.startsWith("about:") || url.startsWith("view-source:") ||
        url.includes("chrome.google.com/webstore");

      // ---- 1) Fast-path: navigation-only code (more reliable done by background) ----
      // Match: window.location = 'https://...' OR window.open('https://...')
      const navMatch = codeString.match(/window\.(?:location(?:\.href|\.assign)?\s*=\s*|open\()\s*['"`](https?:\/\/[^'"`]+)\s*['"`]/i);
      // Simpler robust nav check: look for explicit URL in codeString
      const urlMatch = codeString.match(/https?:\/\/[^\s'")]+/i);
      const extractedUrl = urlMatch ? urlMatch[0] : null;

      if (extractedUrl && (codeString.includes("window.location") || codeString.includes("window.open") || taskHint.startsWith("open "))) {
        // If current tab is restricted, open a new tab instead.
        if (isRestrictedPage(tabUrl)) {
          await chrome.tabs.create({ url: extractedUrl });
          sendResponse({ success: true, message: `Opened new tab: ${extractedUrl}` });
          return;
        } else {
          // navigate the current tab
          await chrome.tabs.update(tab.id, { url: extractedUrl });
          sendResponse({ success: true, message: `Navigated to ${extractedUrl}` });
          return;
        }
      }

      // ---- 2) Fast-path: if codeString is empty but msg.url exists, open it ----
      if (!codeString && msg?.url) {
        const u = msg.url;
        if (isRestrictedPage(tabUrl)) {
          await chrome.tabs.create({ url: u });
        } else {
          await chrome.tabs.update(tab.id, { url: u });
        }
        sendResponse({ success: true, message: `Opened ${u}` });
        return;
      }

      // ---- 3) Generic injection: pass the code as a string argument (strings are serializable) ----
      // Try to inject and run in page's MAIN world. This avoids passing functions/DOM nodes across "args".
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          world: "MAIN",
          func: (code) => {
            try {
              // Indirect eval to run the passed string in page context.
              // Note: some pages' CSP might still block eval. If that happens, fallback to background handling.
              (0, eval)(code);
              console.log("✅ Jarvis: injected code executed.");
            } catch (err) {
              console.error("❌ Jarvis injection error (page):", err);
              // store error for debugging
              window.__jarvis_last_injection_error = err && err.message ? err.message : String(err);
            }
          },
          args: [codeString],
        });

        sendResponse({ success: true, message: "Injected code executed (attempted) in tab." });
      } catch (injectErr) {
        // injection failed (possibly page CSP or chrome runtime error)
        console.error("❌ scripting.executeScript failed:", injectErr);

        // fallback: open a new tab with a data page that runs the code (less ideal)
        if (extractedUrl) {
          await chrome.tabs.create({ url: extractedUrl });
          sendResponse({ success: true, message: `Fallback: opened ${extractedUrl}` });
          return;
        }

        sendResponse({ success: false, error: injectErr?.message || String(injectErr) });
      }
    } catch (error) {
      console.error("❌ Error executing code:", error);
      sendResponse({ success: false, error: (error && error.message) || String(error) });
    }
  })();

  // keep message channel open for async sendResponse
  return true;
});
