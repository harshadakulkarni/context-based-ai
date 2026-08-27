// background.js
// Talks to our own backend (not OpenAI directly). The backend holds the
// OpenAI key and enforces per-user usage limits; the extension only ever
// sees a JWT obtained by logging in via the popup.

importScripts("config.js");

async function getToken() {
  const data = await chrome.storage.local.get(["token"]);
  return data.token || null;
}

async function getLanguage() {
  const data = await chrome.storage.local.get(["language"]);
  return data.language || "English";
}

async function fetchDefinition(word, context, pageTitle, pageUrl, detailed) {
  const token = await getToken();

  if (!token) {
    return { ok: false, error: "not_logged_in" };
  }

  const language = await getLanguage();

  try {
    const response = await fetch(`${API_BASE_URL}/api/define`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ word, context, pageTitle, pageUrl, language, detailed: !!detailed })
    });

    if (response.status === 401) {
      await chrome.storage.local.remove(["token", "email"]);
      return { ok: false, error: "not_logged_in" };
    }

    if (response.status === 429) {
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: "limit_exceeded", message: body.message || "Free limit reached." };
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: "api_error", message: body.message || `Server error (${response.status})` };
    }

    return await response.json();
  } catch (err) {
    return { ok: false, error: "network_error", message: String(err) };
  }
}

async function saveFavorite(word, context, definition, pageTitle, pageUrl) {
  const token = await getToken();
  if (!token) {
    return { ok: false, error: "not_logged_in" };
  }

  const language = await getLanguage();

  try {
    const response = await fetch(`${API_BASE_URL}/api/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ term: word, context, definition, language, pageTitle, pageUrl })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      return { ok: false, error: "api_error", message: body.message || `Server error (${response.status})` };
    }

    return { ok: true, favorite: await response.json() };
  } catch (err) {
    return { ok: false, error: "network_error", message: String(err) };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "DEFINE_WORD") {
    fetchDefinition(message.word, message.context, message.pageTitle, message.pageUrl, message.detailed).then(
      sendResponse
    );
    return true; // keep the message channel open for async sendResponse
  }

  if (message && message.type === "SAVE_FAVORITE") {
    saveFavorite(message.word, message.context, message.definition, message.pageTitle, message.pageUrl).then(
      sendResponse
    );
    return true; // keep the message channel open for async sendResponse
  }

  if (message && message.type === "OPEN_DASHBOARD") {
    chrome.tabs.create({ url: DASHBOARD_URL });
  }

  if (message && message.type === "SYNC_AUTH") {
    if (message.token) {
      chrome.storage.local.set({ token: message.token, email: message.email || null });
    } else {
      chrome.storage.local.remove(["token", "email"]);
    }
  }
});
