// content.js
// Detects double/triple click on a word, extracts surrounding sentence as
// context, asks the background worker for a contextual definition, and
// renders a draggable, minimizable popup panel on the right side of the page.

(function () {
  const PANEL_ID = "ctxdef-panel-root";
  const STAR_ICON =
    '<svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
  let panel = null;
  let isMinimized = false;
  let lastRequest = null; // { word, context } so reload can re-run it
  let lastResult = null; // { word, context, definition } — what a favorite save sends
  let dragState = null;

  function getSelectionWordAndContext() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const selectedText = selection.toString().trim();
    if (!selectedText) return null;

    // Find the block-level container to pull a sentence/paragraph from.
    let node = selection.anchorNode;
    let el = node && node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    let container = el;
    const blockTags = new Set([
      "P", "DIV", "LI", "TD", "TH", "ARTICLE", "SECTION", "BLOCKQUOTE", "SPAN"
    ]);
    let hops = 0;
    while (
      container &&
      hops < 6 &&
      container.innerText &&
      container.innerText.length < 4000 &&
      !(blockTags.has(container.tagName) && container.innerText.trim().length > selectedText.length)
    ) {
      container = container.parentElement;
      hops++;
    }
    if (!container) container = el;

    let fullText = (container && container.innerText) || selectedText;
    fullText = fullText.replace(/\s+/g, " ").trim();

    // Try to isolate just the sentence containing the selected text.
    let context = fullText;
    const idx = fullText.indexOf(selectedText);
    if (idx !== -1) {
      const before = fullText.slice(0, idx);
      const after = fullText.slice(idx + selectedText.length);
      const sentenceStart = Math.max(
        before.lastIndexOf(". "),
        before.lastIndexOf("! "),
        before.lastIndexOf("? "),
        before.lastIndexOf("\n")
      );
      const startPos = sentenceStart === -1 ? 0 : sentenceStart + 2;

      const enders = [". ", "! ", "? ", "\n"];
      let endPos = after.length;
      for (const ender of enders) {
        const p = after.indexOf(ender);
        if (p !== -1 && p < endPos) endPos = p + 1;
      }
      context = (before.slice(startPos) + selectedText + after.slice(0, endPos)).trim();
    }

    // Cap context length sent to the API.
    if (context.length > 600) {
      context = context.slice(0, 600) + "…";
    }

    return { word: selectedText, context };
  }

  function ensurePanel() {
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="ctxdef-header" id="ctxdef-drag-handle">
        <span class="ctxdef-title" id="ctxdef-word-title">Define</span>
        <div class="ctxdef-actions">
          <button class="ctxdef-btn ctxdef-star" id="ctxdef-save" title="Save to favorites">${STAR_ICON}</button>
          <button class="ctxdef-btn" id="ctxdef-reload" title="Reload">⟳</button>
          <button class="ctxdef-btn" id="ctxdef-minimize" title="Minimize">─</button>
          <button class="ctxdef-btn" id="ctxdef-close" title="Close">✕</button>
        </div>
      </div>
      <div class="ctxdef-body" id="ctxdef-body">
        <div class="ctxdef-empty">Double or triple click a word to see its meaning here.</div>
      </div>
    `;
    document.documentElement.appendChild(panel);

    panel.querySelector("#ctxdef-close").addEventListener("click", () => {
      panel.classList.add("ctxdef-hidden");
    });

    panel.querySelector("#ctxdef-minimize").addEventListener("click", () => {
      isMinimized = !isMinimized;
      panel.classList.toggle("ctxdef-minimized", isMinimized);
      panel.querySelector("#ctxdef-minimize").textContent = isMinimized ? "▢" : "─";
    });

    panel.querySelector("#ctxdef-reload").addEventListener("click", () => {
      if (lastRequest) {
        runDefinitionRequest(lastRequest.word, lastRequest.context);
      }
    });

    panel.querySelector("#ctxdef-save").addEventListener("click", () => {
      if (!lastResult) return;
      saveFavorite();
    });

    // Dragging via header.
    const handle = panel.querySelector("#ctxdef-drag-handle");
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest(".ctxdef-btn")) return;
      const rect = panel.getBoundingClientRect();
      dragState = {
        offsetX: e.clientX - rect.left,
        offsetY: e.clientY - rect.top
      };
      e.preventDefault();
    });
    document.addEventListener("mousemove", (e) => {
      if (!dragState) return;
      panel.style.right = "auto";
      panel.style.left = Math.max(0, e.clientX - dragState.offsetX) + "px";
      panel.style.top = Math.max(0, e.clientY - dragState.offsetY) + "px";
    });
    document.addEventListener("mouseup", () => {
      dragState = null;
    });

    return panel;
  }

  function setSaveButtonState(state) {
    const btn = panel.querySelector("#ctxdef-save");
    if (!btn) return;
    btn.classList.remove("ctxdef-star-saved");
    btn.disabled = false;
    if (state === "hidden") {
      btn.style.display = "none";
    } else if (state === "saved") {
      btn.style.display = "";
      btn.classList.add("ctxdef-star-saved");
      btn.title = "Saved to favorites";
      btn.disabled = true;
    } else if (state === "saving") {
      btn.style.display = "";
      btn.title = "Saving…";
      btn.disabled = true;
    } else {
      btn.style.display = "";
      btn.title = "Save to favorites";
    }
  }

  function saveFavorite() {
    setSaveButtonState("saving");
    chrome.runtime.sendMessage(
      {
        type: "SAVE_FAVORITE",
        word: lastResult.word,
        context: lastResult.context,
        definition: lastResult.definition,
        pageTitle: lastResult.pageTitle,
        pageUrl: lastResult.pageUrl
      },
      (response) => {
        if (chrome.runtime.lastError || !response || !response.ok) {
          setSaveButtonState("default");
          return;
        }
        setSaveButtonState("saved");
      }
    );
  }

  function setBodyLoading(word) {
    const body = panel.querySelector("#ctxdef-body");
    panel.querySelector("#ctxdef-word-title").textContent = word;
    setSaveButtonState("hidden");
    lastResult = null;
    body.innerHTML = `<div class="ctxdef-loading"><span class="ctxdef-spinner"></span> Looking up "${escapeHtml(
      word
    )}"…</div>`;
  }

  function setBodyResult(word, context, text, pageTitle, pageUrl) {
    const body = panel.querySelector("#ctxdef-body");
    panel.querySelector("#ctxdef-word-title").textContent = word;
    lastResult = { word, context, definition: text, pageTitle, pageUrl };
    setSaveButtonState("default");
    body.innerHTML = `<div class="ctxdef-definition">${escapeHtml(text).replace(/\n/g, "<br>")}</div>`;
  }

  function setBodyError(message, actionLabel) {
    setSaveButtonState("hidden");
    lastResult = null;
    const body = panel.querySelector("#ctxdef-body");
    body.innerHTML = `
      <div class="ctxdef-error">${escapeHtml(message)}</div>
      ${
        actionLabel
          ? `<button class="ctxdef-settings-btn" id="ctxdef-open-dashboard">${escapeHtml(actionLabel)}</button>`
          : ""
      }
    `;
    const btn = body.querySelector("#ctxdef-open-dashboard");
    if (btn) {
      btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
      });
    }
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function runDefinitionRequest(word, context) {
    ensurePanel();
    panel.classList.remove("ctxdef-hidden");
    if (isMinimized) {
      isMinimized = false;
      panel.classList.remove("ctxdef-minimized");
      panel.querySelector("#ctxdef-minimize").textContent = "─";
    }
    lastRequest = { word, context };
    setBodyLoading(word);

    chrome.runtime.sendMessage(
      {
        type: "DEFINE_WORD",
        word,
        context,
        pageTitle: document.title,
        pageUrl: location.href
      },
      (response) => {
        if (chrome.runtime.lastError) {
          setBodyError("Could not reach the extension background script.", null);
          return;
        }
        if (!response || !response.ok) {
          if (response && response.error === "not_logged_in") {
            setBodyError(
              "You're not logged in. Click the extension icon in the toolbar to log in.",
              "Open dashboard"
            );
          } else if (response && response.error === "limit_exceeded") {
            setBodyError(response.message || "Free limit reached.", "Open dashboard");
          } else if (response && response.message) {
            setBodyError(response.message, null);
          } else {
            setBodyError("Something went wrong fetching the definition.", null);
          }
          return;
        }
        setBodyResult(word, context, response.definition, document.title, location.href);
      }
    );
  }

  // detail === 2 -> double click, detail === 3 -> triple click
  document.addEventListener("mouseup", (e) => {
    if (e.detail < 2) return;
    if (e.target.closest(`#${PANEL_ID}`)) return; // ignore clicks inside our own panel

    // Allow the browser a tick to finalize the selection.
    setTimeout(() => {
      const result = getSelectionWordAndContext();
      // Generous enough for a full sentence (triple-click), not just a single word.
      if (!result || !result.word || result.word.length > 600) return;
      runDefinitionRequest(result.word, result.context);
    }, 10);
  });
})();
