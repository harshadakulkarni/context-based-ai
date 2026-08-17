import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client";

function hostnameOf(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function Favorites() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    api
      .getFavorites()
      .then(setFavorites)
      .catch((err) => setError(err.message || "Could not load your favorites."));
  }, []);

  function handleLogout() {
    logout();
    navigate("/");
  }

  async function handleRemove(id) {
    setRemovingId(id);
    try {
      await api.deleteFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      setError(err.message || "Could not remove that favorite.");
    } finally {
      setRemovingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!favorites) return null;
    const q = query.trim().toLowerCase();
    if (!q) return favorites;
    return favorites.filter(
      (f) =>
        f.term?.toLowerCase().includes(q) ||
        f.definition?.toLowerCase().includes(q) ||
        f.pageTitle?.toLowerCase().includes(q)
    );
  }, [favorites, query]);

  const groups = useMemo(() => {
    if (!filtered) return [];
    const byKey = new Map();
    for (const fav of filtered) {
      const key = fav.pageUrl || fav.pageTitle || "unknown";
      if (!byKey.has(key)) {
        byKey.set(key, {
          pageUrl: fav.pageUrl,
          pageTitle: fav.pageTitle || fav.pageUrl || "Unknown source",
          items: []
        });
      }
      byKey.get(key).items.push(fav);
    }
    return Array.from(byKey.values());
  }, [filtered]);

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="nav-brand">Context Define</Link>
        <div className="nav-links">
          <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
          <button className="btn btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <div className="favorites-page">
        <div className="favorites-head">
          <div>
            <h1>Favorites</h1>
            <p className="sub">
              {favorites ? `${favorites.length} saved · grouped by where you found them` : "Loading…"}
            </p>
          </div>
          {favorites && favorites.length > 0 && (
            <input
              className="favorites-search"
              type="text"
              placeholder="Search your favorites…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          )}
        </div>

        {error && <p className="auth-error">{error}</p>}

        {favorites && favorites.length === 0 && (
          <div className="card">
            <p>
              Nothing saved yet. On any page, double or triple click a word or sentence, then click the star in the
              definition panel to save it here.
            </p>
          </div>
        )}

        {groups.map((group) => (
          <div className="source-group" key={group.pageUrl || group.pageTitle}>
            <div className="source-group-head">
              <span className="source-title">{group.pageTitle}</span>
              {group.pageUrl && <span className="source-url">{hostnameOf(group.pageUrl)}</span>}
              <span className="count">{group.items.length} saved</span>
            </div>

            {group.items.map((fav) => (
              <div className="fav-card" key={fav.id}>
                <div className="fav-star" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </div>
                <div className="fav-main">
                  <div className="fav-term-row">
                    <span className="fav-term">{fav.term}</span>
                    {fav.language && fav.language !== "English" && <span className="fav-lang">{fav.language}</span>}
                  </div>
                  <p className="fav-def">{fav.definition}</p>
                  {fav.context && fav.context !== fav.term && <p className="fav-quote">"{fav.context}"</p>}
                  <div className="fav-meta">
                    <span>Saved {formatDate(fav.createdAt)}</span>
                    {fav.pageUrl && (
                      <a href={fav.pageUrl} target="_blank" rel="noreferrer">
                        Open source
                      </a>
                    )}
                  </div>
                </div>
                <button
                  className="fav-remove"
                  disabled={removingId === fav.id}
                  onClick={() => handleRemove(fav.id)}
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
