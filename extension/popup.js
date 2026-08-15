const loggedOutView = document.getElementById("logged-out-view");
const loggedInView = document.getElementById("logged-in-view");
const loginError = document.getElementById("login-error");

async function render() {
  const { token, email } = await chrome.storage.local.get(["token", "email"]);
  if (token) {
    loggedOutView.classList.add("hidden");
    loggedInView.classList.remove("hidden");
    document.getElementById("logged-in-email").textContent = `Logged in as ${email || "your account"}`;
  } else {
    loggedOutView.classList.remove("hidden");
    loggedInView.classList.add("hidden");
  }
}

document.getElementById("login-btn").addEventListener("click", async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  loginError.classList.add("hidden");

  if (!email || !password) {
    loginError.textContent = "Enter your email and password.";
    loginError.classList.remove("hidden");
    return;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();

    if (!response.ok) {
      loginError.textContent = data.message || "Login failed.";
      loginError.classList.remove("hidden");
      return;
    }

    await chrome.storage.local.set({ token: data.token, email: data.email });
    render();
  } catch (err) {
    loginError.textContent = "Could not reach the server.";
    loginError.classList.remove("hidden");
  }
});

document.getElementById("signup-link").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: `${DASHBOARD_URL}/signup` });
});

document.getElementById("dashboard-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: `${DASHBOARD_URL}/dashboard` });
});

document.getElementById("logout-btn").addEventListener("click", async () => {
  await chrome.storage.local.remove(["token", "email"]);
  render();
});

render();
