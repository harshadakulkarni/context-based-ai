import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Not yet on the Chrome Web Store, so there's no one-click install prompt —
// this downloads a zip and the user loads it manually via Developer mode.
// Swap back to a chromewebstore.google.com URL once published, and this
// whole download-and-manual-install flow can go away.
const EXTENSION_ZIP_URL = "/context-define-extension.zip";

const VISION_ITEMS = [
  {
    title: "PDF & eBook support",
    body: "Get definitions inside PDFs and eBooks, not just web pages.",
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    )
  },
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
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="landing-brand">
          <img src="/logo-icon.png" alt="" className="landing-brand-icon" />
          Sensus<span className="accent">Grow</span>
        </Link>
        <div className="landing-nav-links">
          {user ? (
            <Link to="/dashboard" className="landing-btn landing-btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="landing-btn landing-btn-ghost">Log in</Link>
              <Link to="/signup" className="landing-btn landing-btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </nav>

      <div className="landing-hero">
        <p className="landing-eyebrow">Contextual intelligence for your research flow</p>
        <h1>
          Understand any word, <span className="accent">without leaving the page.</span>
        </h1>
        <p className="landing-sub">
          Double or triple click any word on any webpage to get a plain-English
          definition fitted to the sentence it appears in. No dictionary tab-switching,
          no bringing your own API key.
        </p>
        <div className="landing-actions">
          <a className="landing-btn landing-btn-primary landing-btn-lg" href={EXTENSION_ZIP_URL} download>
            Download extension (.zip)
          </a>
          {!user && (
            <Link className="landing-btn landing-btn-ghost landing-btn-lg" to="/signup">
              Create a free account
            </Link>
          )}
        </div>

        <ol className="landing-steps">
          <li>Unzip the downloaded file.</li>
          <li>
            Open <code>chrome://extensions</code> in Chrome and turn on <strong>Developer mode</strong> (top right).
          </li>
          <li>
            Click <strong>Load unpacked</strong> and select the unzipped <code>context-define-extension</code> folder.
          </li>
          <li>Sign up or log in above, then double or triple click any word on any page.</li>
        </ol>
      </div>

      <div className="landing-vision">
        <p className="landing-eyebrow">Where we're headed</p>
        <h2>Beyond the dictionary lookup</h2>
        <p className="landing-vision-note">
          What's live today: double/triple-click definitions on any webpage, saved favorites with
          the source they came from, multiple definition languages, and Pro subscriptions. What
          follows is our roadmap, not a list of what's already shipped.
        </p>
        <div className="landing-vision-grid">
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
