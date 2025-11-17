/************************************************************
 * HELPER: Get Active Tab (SAFE)
 ************************************************************/
async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs.length > 0 ? tabs[0] : null;
}

/************************************************************
 * 1) EXECUTE_TASK → Run generated JS inside the active tab
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== "EXECUTE_TASK") return;

  (async () => {
    try {
      const codeString = typeof msg.functionCode === "string" ? msg.functionCode.trim() : "";
      const taskHint = (msg.task || "").toLowerCase();

      const tab = await getActiveTab();
      if (!tab || !tab.id) {
        sendResponse({ success: false, error: "No active tab found." });
        return;
      }

      const tabUrl = tab.url || "";
      const isRestrictedPage = (url = "") =>
        !url ||
        url.startsWith("chrome://") ||
        url.startsWith("edge://") ||
        url.startsWith("about:") ||
        url.startsWith("view-source:") ||
        url.includes("chrome.google.com/webstore");

      // Detect URLs in code
      const urlMatch = codeString.match(/https?:\/\/[^\s"'()]+/i);
      const extractedUrl = urlMatch ? urlMatch[0] : null;

      // Auto-navigation fast-path
      if (
        extractedUrl &&
        (codeString.includes("window.location") ||
          codeString.includes("window.open") ||
          taskHint.startsWith("open "))
      ) {
        if (isRestrictedPage(tabUrl)) {
          await chrome.tabs.create({ url: extractedUrl });
        } else {
          await chrome.tabs.update(tab.id, { url: extractedUrl });
        }

        sendResponse({ success: true, message: `Navigated to ${extractedUrl}` });
        return;
      }

      // Inject code normally
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        world: "MAIN",
        func: (code) => {
          try {
            (0, eval)(code);
          } catch (err) {
            window.__jarvis_last_injection_error = err.message;
          }
        },
        args: [codeString],
      });

      sendResponse({ success: true, message: "Executed code in tab." });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});

/************************************************************
 * 2) SCAN_BROWSER_HISTORY
 ************************************************************/
async function getBrowserHistory(limit = 300) {
  return new Promise((resolve, reject) => {
    chrome.history.search(
      { text: "", maxResults: limit, startTime: 0 },
      (results) =>
        resolve(
          results.map((item) => ({
            url: item.url,
            title: item.title,
            lastVisit: item.lastVisitTime,
            visitCount: item.visitCount,
          }))
        )
    );
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SCAN_BROWSER_HISTORY") {
    (async () => {
      try {
        const data = await getBrowserHistory(300);
        sendResponse({ success: true, history: data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});

/************************************************************
 * 3) SCAN_PAGE (FULLY FIXED)
 ************************************************************/
/************************************************************
 * SMART SCAN_PAGE (AI-Optimized)
 ************************************************************/
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_PAGE") {
    (async () => {
      try {
        const tab = await getActiveTab();
        if (!tab?.id) {
          sendResponse({ success: false, error: "No active tab available." });
          return;
        }

        chrome.scripting.executeScript(
          {
            target: { tabId: tab.id },
            func: () => {
              const cleanText = (el) =>
                el.innerText
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 15000); // Limit for safety

              // General semantic extraction
              const h1 = [...document.querySelectorAll("h1")].map(h => h.innerText);
              const h2 = [...document.querySelectorAll("h2")].map(h => h.innerText);
              const paragraphs = [...document.querySelectorAll("p")].map(p => p.innerText);

              // Extract visible text from body (cleaned)
              const visibleText = cleanText(document.body);

              // Try LeetCode problem detection
              let leetProblem = null;
              const possibleSelectors = [
                '[data-cy="question-title"]',
                '.question-title',
                '.css-v3d350',
                '.question-content',
                '[data-cy="description-content"]',
                '.content__24i0J'
              ];

              for (const sel of possibleSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                  leetProblem = cleanText(el);
                  break;
                }
              }

              // Extract code blocks if available
              const codeBlocks = [...document.querySelectorAll("pre, code")].map(c =>
                cleanText(c)
              );

              return {
                title: document.title,
                url: window.location.href,

                summaryText: visibleText.slice(0, 2000), // summary-safe
                headings: { h1, h2 },
                paragraphs,

                codeBlocks,

                leetProblemStatement: leetProblem,

                // Useful DOM summary
                domSummary: {
                  links: document.querySelectorAll("a").length,
                  buttons: document.querySelectorAll("button").length,
                  inputs: document.querySelectorAll("input").length,
                  images: document.querySelectorAll("img").length,
                }
              };
            },
          },
          (results) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message,
              });
              return;
            }

            sendResponse({ success: true, data: results[0].result });
          }
        );
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();

    return true;
  }
});


/************************************************************
 * 4) FILL_INPUT (FIXED)
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FILL_INPUT") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) {
        sendResponse({ success: false, error: "No active tab." });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          args: [msg.selector, msg.value],
          func: (selector, value) => {
            const el = document.querySelector(selector);
            if (!el) return { success: false, error: "Input not found" };
            el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return { success: true };
          },
        },
        (result) => sendResponse(result[0].result)
      );
    })();
    return true;
  }
});

/************************************************************
 * 5) CLICK_BUTTON (FIXED)
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CLICK_BUTTON") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) {
        sendResponse({ success: false, error: "No active tab." });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          args: [msg.selector],
          func: (selector) => {
            const btn = document.querySelector(selector);
            if (!btn) return { success: false, error: "Button not found" };
            btn.click();
            return { success: true };
          },
        },
        (result) => sendResponse(result[0].result)
      );
    })();
    return true;
  }
});

/************************************************************
 * 6) EXTRACT_PAGE_DATA
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "EXTRACT_PAGE_DATA") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) {
        sendResponse({ success: false, error: "No active tab." });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => ({
            links: [...document.querySelectorAll("a")].map((a) => a.href),
            images: [...document.querySelectorAll("img")].map((img) => img.src),
            inputs: [...document.querySelectorAll("input")].map((i) => ({
              name: i.name,
              type: i.type,
              placeholder: i.placeholder,
            })),
          }),
        },
        (result) => sendResponse(result[0].result)
      );
    })();
    return true;
  }
});

/************************************************************
 * 7) DOM_ACTION
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "DOM_ACTION") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) {
        sendResponse({ success: false, error: "No active tab." });
        return;
      }

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          args: [msg.action],
          func: (action) => {
            const { type, selector, value } = action;

            const el = document.querySelector(selector);
            if (!el) return { success: false, error: "Element not found" };

            if (type === "fill") {
              el.value = value;
              el.dispatchEvent(new Event("input", { bubbles: true }));
              return { success: true };
            }

            if (type === "click") {
              el.click();
              return { success: true };
            }

            if (type === "focus") {
              el.focus();
              return { success: true };
            }

            return { success: false, error: "Unknown action" };
          },
        },
        (result) => sendResponse(result[0].result)
      );
    })();
    return true;
  }
});
