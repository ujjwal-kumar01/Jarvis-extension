chrome.action.onClicked.addListener(async (tab) => {
  await chrome.sidePanel.open({ tabId: tab.id });
});

/************************************************************
 * HELPER: Get Active Tab (SAFE)
 ************************************************************/
async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] || null;
}

/************************************************************
 * MESSAGE ROUTER (UNIFIED)
 ************************************************************/
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const handlers = {
    EXECUTE_TASK: handleExecuteTask,
    SCAN_BROWSER_HISTORY: handleScanHistory,
    SCAN_PAGE: handleScanPage,
    FILL_INPUT: handleFillInput,
    CLICK_BUTTON: handleClickButton,
    EXTRACT_PAGE_DATA: handleExtractPageData,
    DOM_ACTION: handleDomAction
  };

  const handler = handlers[msg.type];
  if (handler) {
    handler(msg, sender, sendResponse);
    return true; // Important: keep message channel open for async responses
  }
});

/************************************************************
 * 1) EXECUTE_TASK → Run generated JS inside the active tab
 ************************************************************/
async function handleExecuteTask(msg, sender, sendResponse) {
  try {
    const codeString = typeof msg.functionCode === "string" ? msg.functionCode.trim() : "";
    const taskHint = (msg.task || "").toLowerCase();

    const tab = await getActiveTab();
    if (!tab?.id) return sendResponse({ success: false, error: "No active tab found." });

    const tabUrl = tab.url || "";
    const isRestrictedPage = (url) =>
      !url ||
      url.startsWith("chrome://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:") ||
      url.startsWith("view-source:") ||
      url.startsWith("chrome://newtab") ||
      url.startsWith("chrome-search://") ||
      url.includes("chrome.google.com/webstore");

    const urlMatch = codeString.match(/https?:\/\/[^\s"'()]+/i);
    const extractedUrl = urlMatch ? urlMatch[0] : null;

    // Auto navigation
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

      return sendResponse({ success: true, message: `Navigated to ${extractedUrl}` });
    }

    // Execute JS in page
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
      args: [codeString]
    });

    sendResponse({ success: true, message: "Executed code in tab." });
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

/************************************************************
 * 2) SCAN_BROWSER_HISTORY
 ************************************************************/
async function handleScanHistory(msg, sender, sendResponse) {
  try {
    chrome.history.search(
      { text: "", maxResults: 300, startTime: 0 },
      (results) => {
        sendResponse({
          success: true,
          history: results.map((item) => ({
            url: item.url,
            title: item.title,
            lastVisit: item.lastVisitTime,
            visitCount: item.visitCount
          }))
        });
      }
    );
  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}

/************************************************************
 * 3) SCAN_PAGE → Extract headings, text, LC problem
 ************************************************************/
async function handleScanPage(msg, sender, sendResponse) {
  const tab = await getActiveTab();
  if (!tab?.id) return sendResponse({ success: false, error: "No active tab." });

  chrome.scripting.executeScript(
    {
      target: { tabId: tab.id },
      func: () => {
        const cleanText = (el) =>
          el.innerText.replace(/\s+/g, " ").trim().slice(0, 15000);

        const h1 = [...document.querySelectorAll("h1")].map((h) => h.innerText);
        const h2 = [...document.querySelectorAll("h2")].map((h) => h.innerText);
        const paragraphs = [...document.querySelectorAll("p")].map((p) => p.innerText);
        const visibleText = cleanText(document.body);

        const possibleSelectors = [
          '[data-cy="question-title"]',
          '.question-title',
          '.css-v3d350',
          '.question-content',
          '[data-cy="description-content"]',
          '.content__24i0J'
        ];
        let problem = null;

        for (const sel of possibleSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            problem = cleanText(el);
            break;
          }
        }

        const codeBlocks = [...document.querySelectorAll("pre, code")].map((c) =>
          cleanText(c)
        );

        return {
          title: document.title,
          url: location.href,
          summaryText: visibleText.slice(0, 2000),
          headings: { h1, h2 },
          paragraphs,
          codeBlocks,
          leetProblemStatement: problem,
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
}

/************************************************************
 * 4) FILL_INPUT (multiple elements)
 ************************************************************/
async function handleFillInput(msg, sender, sendResponse) {
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
    (res) => sendResponse(res[0]?.result)
  );
}

/************************************************************
 * 5) CLICK_BUTTON
 ************************************************************/
async function handleClickButton(msg, sender, sendResponse) {
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
    (res) => sendResponse(res[0]?.result)
  );
}

/************************************************************
 * 6) EXTRACT_PAGE_DATA
 ************************************************************/
async function handleExtractPageData(msg, sender, sendResponse) {
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
    (res) => sendResponse(res[0]?.result)
  );
}

/************************************************************
 * 7) DOM_ACTION — Universal Action Handler
 ************************************************************/
async function handleDomAction(msg, sender, sendResponse) {
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

            if (el?.src) url = el.src;
            else if (el?.srcset) url = el.srcset.split(" ")[0];
            else if (el?.dataset?.src) url = el.dataset.src;
            else if (el?.dataset?.thumbnail) url = el.dataset.thumbnail;
            else if (el?.poster) url = el.poster;
            else {
              const style = getComputedStyle(el);
              const match = style.backgroundImage.match(/url\(["']?(.*?)["']?\)/);
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
    (res) => sendResponse(res[0]?.result)
  );
}
