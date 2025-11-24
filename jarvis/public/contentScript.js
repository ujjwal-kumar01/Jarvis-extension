console.log("🧠 Jarvis content script active on", window.location.href);

// Listen for messages coming from background → content
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  /** ─────────────────────────────────────────────
   *  1. PAGE SCAN REQUEST (Side Panel sends SCAN_PAGE)
   *  ───────────────────────────────────────────── */
  if (msg?.type === "SCAN_PAGE") {
    try {
      // Notify the injected script to perform the scan
      window.dispatchEvent(
        new CustomEvent("JARVIS_PAGE_SCAN", {
          detail: { command: "scan" }
        })
      );

      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }

  return false;
});


// Listen for results coming from injected script → content script
window.addEventListener("JARVIS_PAGE_SCAN_RESULT", (event) => {
  const scanData = event.detail;

  console.log("📄 Page scan result:", scanData);

  // Forward data to background.js
  chrome.runtime.sendMessage({
    type: "PAGE_SCAN_RESULT",
    data: scanData
  });
});
