import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import ThemeToggle from "../components/ThemeToggle.jsx";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);

  function validate() {
    if (!email.trim()) return "Enter your email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
    if (!password) return "Enter a password.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setSuccess(false);
      return;
    }
    setError("");
    setSubmitting(true);
    setSlow(false);
    const slowTimer = setTimeout(() => setSlow(true), 4000);
    try {
      await register(email, password);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 700);
    } catch (err) {
      setError(err.message || "Something went wrong creating your account. Please try again.");
      setSubmitting(false);
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
    }
  }

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="nav-brand">
          <img src="/logo-icon.png" alt="" className="nav-logo" />
          Sensus<span className="accent">Grow</span>
        </Link>
        <div className="nav-links">
          <ThemeToggle />
        </div>
      </nav>

      <div className="page-center" style={{ minHeight: "calc(100vh - 69px)" }}>
        <form className="auth-card" onSubmit={handleSubmit} noValidate>
          <h1>Create your account</h1>
          <p className="sub">You'll use this same login inside the browser extension.</p>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">Account created! Taking you to your dashboard…</div>}
          {slow && (
            <div className="auth-hint">
              Waking up the server — this can take up to a minute on the first request in a while.
            </div>
          )}

          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {success ? "Account created" : submitting ? "Creating account…" : "Sign up"}
          </button>

          <div className="auth-switch">
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
