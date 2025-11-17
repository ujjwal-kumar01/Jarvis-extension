console.log("🧠 Jarvis content script active on", window.location.href);

// Listen for messages coming from the extension (background → content)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // When popup/background wants the page to scan itself
  if (msg?.type === "DO_PAGE_SCAN") {
    try {
      // Send event into the page's own JavaScript context
      window.dispatchEvent(
        new CustomEvent("JARVIS_PAGE_SCAN", {
          detail: { command: "scan" }
        })
      );

      sendResponse({ success: true });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true; // async
  }
});

// Receive message BACK from injected script
window.addEventListener("JARVIS_PAGE_SCAN_RESULT", (event) => {
  const scanData = event.detail;
  console.log("📄 Page scan result from injected script:", scanData);

  // Forward this data BACK to background script
  chrome.runtime.sendMessage({
    type: "PAGE_SCAN_RESULT",
    data: scanData
  });
});
