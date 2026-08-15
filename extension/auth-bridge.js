// auth-bridge.js
// Runs only on the dashboard's own origin (see manifest.json matches).
// Mirrors the website's login into the extension's chrome.storage.local so
// logging in on the dashboard also logs the extension in, without a
// separate popup login. Reads the site's localStorage directly (allowed,
// since this content script executes in that page's origin) and verifies
// the token against the backend using the PAGE's origin — which is already
// on the backend's CORS allow-list — rather than the extension's own
// privileged origin.
const TOKEN_KEY = "cd_token";

let lastSynced = null;

async function syncFromWebsite() {
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    if (lastSynced !== null) {
      lastSynced = null;
      chrome.runtime.sendMessage({ type: "SYNC_AUTH", token: null });
    }
    return;
  }

  if (token === lastSynced) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) return; // stale/expired site token — leave extension state as-is

    const me = await response.json();
    lastSynced = token;
    chrome.runtime.sendMessage({ type: "SYNC_AUTH", token, email: me.email });
  } catch {
    // Backend unreachable — leave extension state as-is, try again on next event.
  }
}

window.addEventListener("cd-auth-changed", syncFromWebsite);
syncFromWebsite();
