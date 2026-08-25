import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

// Not yet on the Chrome Web Store, so there's no one-click install prompt —
// this downloads a zip and the user loads it manually via Developer mode.
// Swap back to a chromewebstore.google.com URL once published, and this
// whole download-and-manual-install flow can go away.
const EXTENSION_ZIP_URL = "/context-define-extension.zip";

const VISION_ITEMS = [
  {
    title: "Works inside AI chats",
    body: "Look up a word inside ChatGPT and other AI platforms, the same way you do on any article.",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    )
  },
  {
    title: "One-click install",
    body: "A real Chrome Web Store listing — no more manual zip downloads and Developer mode.",
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    )
  }
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="nav-brand">
          <img src="/logo-icon.png" alt="" className="nav-logo" />
          Sensus<span className="accent">Grow</span>
        </Link>
        <div className="nav-links">
          <ThemeToggle />
          {user ? (
            <Link to="/dashboard" className="btn btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </nav>

      <div className="hero">
        <p className="eyebrow">Contextual intelligence for your research flow</p>
        <h1>
          Understand any word, <span className="accent">without leaving the page.</span>
        </h1>
        <p className="sub">
          Double or triple click any word on any webpage to get a plain-English
          definition fitted to the sentence it appears in. No dictionary tab-switching,
          no bringing your own API key.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary btn-lg" href={EXTENSION_ZIP_URL} download>
            Download extension (.zip)
          </a>
          {!user && (
            <Link className="btn btn-ghost btn-lg" to="/signup">
              Create a free account
            </Link>
          )}
        </div>

        <ol className="install-steps">
          <li>Unzip the downloaded file.</li>
          <li>
            Open <code>chrome://extensions</code> in Chrome and turn on <strong>Developer mode</strong> (top right).
          </li>
          <li>
            Click <strong>Load unpacked</strong> and select the unzipped <code>context-define-extension</code> folder.
          </li>
          <li>Sign up or log in above, then double or triple click any word on any page.</li>
          <li>
            For PDFs: Chrome blocks every extension, ours included, from reading its own built-in PDF
            viewer — so use <strong>"Open a PDF…"</strong> in the extension popup instead, which opens the
            file in our own viewer where lookups work the same way.
          </li>
        </ol>
      </div>

      <div className="vision">
        <p className="eyebrow">Where we're headed</p>
        <h2>Beyond the dictionary lookup</h2>
        <p className="vision-note">
          What's live today: double/triple-click definitions on any webpage, PDF support via the
          extension's own viewer, saved favorites with the source they came from, multiple
          definition languages, and Pro subscriptions. What follows is our roadmap, not a list of
          what's already shipped.
        </p>
        <div className="vision-grid">
          {VISION_ITEMS.map((item) => (
            <div className="vision-card" key={item.title}>
              <div className="vision-card-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
