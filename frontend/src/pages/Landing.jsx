import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// Not yet on the Chrome Web Store, so there's no one-click install prompt —
// this downloads a zip and the user loads it manually via Developer mode.
// Swap back to a chromewebstore.google.com URL once published, and this
// whole download-and-manual-install flow can go away.
const EXTENSION_ZIP_URL = "/context-define-extension.zip";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="nav-brand">
          <img src="/logo-icon.png" alt="" className="nav-logo" />
          SensusGrow
        </Link>
        <div className="nav-links">
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
        <h1>Understand any word, in context, without leaving the page.</h1>
        <p>
          Double or triple click any word on any webpage to get a plain-English
          definition fitted to the sentence it appears in. No dictionary tab-switching,
          no bringing your own API key.
        </p>
        <div className="hero-actions">
          <a className="btn btn-primary" href={EXTENSION_ZIP_URL} download>Download extension (.zip)</a>
          {!user && <Link className="btn btn-ghost" to="/signup">Create a free account</Link>}
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
        </ol>
      </div>

      <div className="vision">
        <h2>Where we're headed</h2>
        <p className="vision-note">
          What's live today: double/triple-click definitions on any webpage, saved favorites,
          multiple definition languages, and Pro subscriptions. The graphic below is our product
          vision, not a feature list of what's shipped — PDF/eBook support, direct ChatGPT/AI-platform
          integration, and a Chrome Web Store listing (installs are a manual zip download for now)
          are on the roadmap, not available yet.
        </p>
        <img src="/vision-banner.webp" alt="SensusGrow product vision overview" className="vision-banner" />
      </div>
    </div>
  );
}
