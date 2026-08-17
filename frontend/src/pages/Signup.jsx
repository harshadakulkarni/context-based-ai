import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Signup() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    try {
      await register(email, password);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 700);
    } catch (err) {
      setError(err.message || "Something went wrong creating your account. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="page-center">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Create your account</h1>
        <p className="sub">You'll use this same login inside the browser extension.</p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-success">Account created! Taking you to your dashboard…</div>}

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
  );
}
