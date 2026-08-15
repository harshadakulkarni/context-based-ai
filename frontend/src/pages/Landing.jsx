import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const CHROME_STORE_URL = import.meta.env.VITE_CHROME_STORE_URL || "#";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="nav-brand">Context Define</Link>
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
          <a className="btn btn-primary" href={CHROME_STORE_URL}>Add to Chrome</a>
          {!user && <Link className="btn btn-ghost" to="/signup">Create a free account</Link>}
        </div>
      </div>
    </div>
  );
}
