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
      const codeString =
        typeof msg.functionCode === "string" ? msg.functionCode.trim() : "";
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
        url.includes("chrome.google.com/webstore") ||
        url.startsWith("chrome://newtab") ||
        url.startsWith("chrome-search://");


      // Detect URLs inside code
      const urlMatch = codeString.match(/https?:\/\/[^\s"'()]+/i);
      const extractedUrl = urlMatch ? urlMatch[0] : null;

      // Auto-navigation
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

      // Inject JS
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
  return new Promise((resolve) => {
    chrome.history.search(
      { text: "", maxResults: limit, startTime: 0 },
      (results) =>
        resolve(
          results.map((item) => ({
            url: item.url,
            title: item.title,
            lastVisit: item.lastVisitTime,
            visitCount: item.visitCount
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
 * 3) SCAN_PAGE
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
                el.innerText.replace(/\s+/g, " ").trim().slice(0, 15000);

              const h1 = [...document.querySelectorAll("h1")].map((h) => h.innerText);
              const h2 = [...document.querySelectorAll("h2")].map((h) => h.innerText);
              const paragraphs = [...document.querySelectorAll("p")].map(
                (p) => p.innerText
              );
              const visibleText = cleanText(document.body);

              // Detect LeetCode problem
              const possibleSelectors = [
                '[data-cy="question-title"]',
                '.question-title',
                '.css-v3d350',
                '.question-content',
                '[data-cy="description-content"]',
                '.content__24i0J'
              ];
              let leetProblem = null;

              for (const sel of possibleSelectors) {
                const el = document.querySelector(sel);
                if (el) {
                  leetProblem = cleanText(el);
                  break;
                }
              }

              const codeBlocks = [...document.querySelectorAll("pre, code")].map((c) =>
                cleanText(c)
              );

              return {
                title: document.title,
                url: window.location.href,
                summaryText: visibleText.slice(0, 2000),
                headings: { h1, h2 },
                paragraphs,
                codeBlocks,
                leetProblemStatement: leetProblem,
                domSummary: {
                  links: document.querySelectorAll("a").length,
                  buttons: document.querySelectorAll("button").length,
                  inputs: document.querySelectorAll("input").length,
                  images: document.querySelectorAll("img").length
                }
              };
            }
          },
          (results) => {
            if (chrome.runtime.lastError) {
              sendResponse({ success: false, error: chrome.runtime.lastError.message });
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
 * 4) FILL_INPUT (MULTIPLE ELEMENTS)
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "FILL_INPUT") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) return sendResponse({ success: false, error: "No active tab." });

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          args: [msg.selectors],
          func: (selectors) => {
            const results = [];

            function setNativeValue(el, val) {
              const proto = Object.getPrototypeOf(el);
              const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
              setter.call(el, val);
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
            }

            selectors.forEach(({ selector, value }) => {
              let el = document.querySelector(selector);

              // nth-of-type fallback
              if (!el && selector.includes("nth-of-type") && selector.includes("input")) {
                const all = [...document.querySelectorAll("input[type='text']")];
                const match = selector.match(/nth-of-type\((\d+)\)/);
                if (match) el = all[parseInt(match[1]) - 1] || null;
              }

              if (!el) {
                results.push({ selector, success: false, error: "Not found" });
                return;
              }

              const tag = el.tagName.toLowerCase();
              const type = el.type;

              if (tag === "input") {
                if (["text", "email", "password", "number"].includes(type)) {
                  setNativeValue(el, value);
                } else if (type === "radio" || type === "checkbox") {
                  el.checked = type === "checkbox" ? Boolean(value) : true;
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                }
              } else if (tag === "textarea") {
                setNativeValue(el, value);
              } else if (tag === "select") {
                el.value = value;
                el.dispatchEvent(new Event("change", { bubbles: true }));
              }

              results.push({ selector, success: true });
            });

            return { success: true, results };
          }
        },
        (res) => sendResponse(res[0]?.result || { success: false })
      );
    })();

    return true; // important
  }
});


/************************************************************
 * 5) CLICK_BUTTON
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "CLICK_BUTTON") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) return sendResponse({ success: false, error: "No active tab." });

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          args: [msg.selectors],
          func: (selectors) => {
            const results = [];
            selectors.forEach(({ selector }) => {
              const el = document.querySelector(selector);
              if (!el) results.push({ selector, success: false, error: "Not found" });
              else {
                el.click();
                results.push({ selector, success: true });
              }
            });
            return { success: true, results };
          }
        },
        (res) => sendResponse(res[0]?.result || { success: false })
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
      if (!tab?.id) return sendResponse({ success: false, error: "No active tab." });

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          func: () => ({
            links: [...document.querySelectorAll("a")].map((a) => a.href),
            images: [...document.querySelectorAll("img")].map((img) => img.src),
            inputs: [...document.querySelectorAll("input")].map((i) => ({
              name: i.name,
              type: i.type,
              placeholder: i.placeholder
            }))
          })
        },
        (res) => sendResponse(res[0]?.result || { success: false })
      );
    })();

    return true;
  }
});

/************************************************************
 * 7) DOM_ACTION — Universal Handler
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "DOM_ACTION") {
    (async () => {
      const tab = await getActiveTab();
      if (!tab?.id) return sendResponse({ success: false, error: "No active tab." });

      chrome.scripting.executeScript(
        {
          target: { tabId: tab.id },
          args: [msg.actions],
          func: (actions) => {
            const results = [];

            function setNativeValue(el, val) {
              const proto = Object.getPrototypeOf(el);
              const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
              setter.call(el, val);
              el.dispatchEvent(new Event("input", { bubbles: true }));
              el.dispatchEvent(new Event("change", { bubbles: true }));
            }

            actions.forEach(({ type, selector, value }) => {
              let el = selector ? document.querySelector(selector) : null;

              if (type === "scroll") {
                window.scrollBy(0, Number(value || 300));
                results.push({ type, success: true });
                return;
              }

              if (!el && type !== "extract") {
                results.push({ selector, success: false, error: "Not found" });
                return;
              }

              if (type === "extract") {
                let url = null;

                // Direct image
                if (el.src) url = el.src;

                // srcset
                else if (el.srcset) url = el.srcset.split(" ")[0];

                // data attributes
                else if (el.dataset?.src) url = el.dataset.src;
                else if (el.dataset?.thumbnail) url = el.dataset.thumbnail;

                // video poster
                else if (el.poster) url = el.poster;

                // background-image: url(...)
                else {
                  const style = window.getComputedStyle(el).backgroundImage;
                  const match = style.match(/url\(["']?(.*?)["']?\)/);
                  if (match) url = match[1];
                }

                results.push({
                  selector,
                  success: true,
                  url,
                  text: el?.innerText || null,
                  value: el?.value || null
                });
                return;

              }

              if (type === "fill" || type === "modify") {
                const tag = el.tagName.toLowerCase();
                if (tag === "input" || tag === "textarea") {
                  setNativeValue(el, value);
                } else if (tag === "select") {
                  el.value = value;
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                }
                results.push({ selector, success: true });
                return;
              }

              if (type === "select") {
                if (el.type === "radio" || el.type === "checkbox") {
                  el.checked = el.type === "checkbox" ? Boolean(value) : true;
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                } else {
                  el.value = value;
                  el.dispatchEvent(new Event("change", { bubbles: true }));
                }
                results.push({ selector, success: true });
                return;
              }

              if (type === "click") {
                el.click();
                results.push({ selector, success: true });
                return;
              }

              if (type === "focus") {
                el.focus();
                results.push({ selector, success: true });
                return;
              }

              results.push({ selector, success: false, error: "Unknown action type" });
            });

            return { success: true, results };
          }
        },
        (res) => sendResponse(res[0]?.result || { success: false })
      );
    })();

    return true;
  }
});
