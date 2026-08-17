import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [slow, setSlow] = useState(false);

  function validate() {
    if (!email.trim()) return "Enter your email.";
    if (!password) return "Enter your password.";
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
      await login(email, password);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 700);
    } catch (err) {
      setError(err.message || "Something went wrong logging you in. Please try again.");
      setSubmitting(false);
    } finally {
      clearTimeout(slowTimer);
      setSlow(false);
    }
  }

  return (
    <div className="page-center">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Log in</h1>
        <p className="sub">Use the same account in the browser extension and here.</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">Logged in! Taking you to your dashboard…</div>}
        {slow && <div className="auth-hint">Waking up the server — this can take up to a minute on the first request in a while.</div>}

        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label htmlFor="password">Password</label>
        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {success ? "Logged in" : submitting ? "Logging in…" : "Log in"}
        </button>

        <div className="auth-switch">
          Don't have an account? <Link to="/signup">Sign up</Link>
        </div>
      </form>
    </div>
  );
}
