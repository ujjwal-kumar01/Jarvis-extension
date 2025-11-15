// contentScript.js
console.log("🧠 Jarvis content script active on", window.location.href);

// Example listener for page-scope messages (optional)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "DO_PAGE_SCAN") {
    try {
      const headings = [...document.querySelectorAll("h1,h2")].map(h => h.innerText);
      sendResponse({ success: true, headings });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true;
  }
});
