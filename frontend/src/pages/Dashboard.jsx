import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api/client";

export default function Dashboard() {
  const { user, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingStatus, setBillingStatus] = useState(null);
  const [billingError, setBillingError] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    api.usage().then(setUsage).catch(() => {});
    return () => clearInterval(pollRef.current);
  }, []);

  // Razorpay's hosted payment page doesn't reliably redirect back here, so instead of
  // depending on that, poll for the webhook-confirmed plan change after the user acts
  // on the payment page in the tab we opened for them.
  function pollForPlanChange(targetPlan, statusWhilePolling) {
    setBillingStatus(statusWhilePolling);
    clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts += 1;
      try {
        const [freshUsage] = await Promise.all([api.usage(), refresh()]);
        setUsage(freshUsage);
        if (freshUsage.plan === targetPlan) {
          clearInterval(pollRef.current);
          setBillingStatus(null);
          return;
        }
      } catch {
        // transient failure — retry on the next tick
      }
      if (attempts >= 40) {
        clearInterval(pollRef.current);
        setBillingStatus("timeout");
      }
    }, 3000);
  }

  function handleLogout() {
    logout();
    navigate("/");
  }

  async function handleUpgrade() {
    setBillingError(null);
    setBillingBusy(true);
    try {
      const { url } = await api.createSubscription();
      window.open(url, "_blank", "noopener");
      pollForPlanChange("PRO", "waiting-for-payment");
    } catch (err) {
      setBillingError(err.message || "Could not start subscription.");
    } finally {
      setBillingBusy(false);
    }
  }

  async function handleCancel() {
    setBillingError(null);
    setBillingBusy(true);
    try {
      await api.cancelSubscription();
      pollForPlanChange("FREE", "waiting-for-cancellation");
    } catch (err) {
      setBillingError(err.message || "Could not cancel subscription.");
    } finally {
      setBillingBusy(false);
    }
  }

  const plan = usage?.plan ?? user?.plan ?? "FREE";
  const isPro = plan === "PRO";
  const used = usage?.used ?? user?.usageCount ?? 0;
  const limit = usage?.limit ?? user?.usageLimit ?? 1;
  const pct = isPro ? 100 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <div>
      <nav className="nav">
        <Link to="/" className="nav-brand">Context Define</Link>
        <div className="nav-links">
          <button className="btn btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
      </nav>

      <div className="dashboard">
        <div className="card">
          <h2>Account</h2>
          <p>{user?.email}</p>
          <p>Plan: {isPro ? "Pro" : "Free"}</p>
        </div>

        <div className="card">
          <h2>Usage</h2>
          {isPro ? (
            <p>Unlimited lookups</p>
          ) : (
            <>
              <p>{used} / {limit} free lookups used</p>
              <div className="usage-bar">
                <div className="usage-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
          <button className="btn btn-ghost" style={{ marginTop: 12 }} onClick={() => api.usage().then(setUsage)}>
            Refresh
          </button>
        </div>

        <div className="card">
          <h2>Billing</h2>
          {billingError && <p className="auth-error">{billingError}</p>}
          {billingStatus === "waiting-for-payment" && (
            <p>Waiting for payment confirmation — complete it in the tab that just opened.</p>
          )}
          {billingStatus === "waiting-for-cancellation" && <p>Cancelling…</p>}
          {billingStatus === "timeout" && (
            <p className="auth-error">Still not confirmed — click Refresh above in a moment, or check your email for the receipt.</p>
          )}
          {isPro ? (
            <button className="btn btn-ghost" disabled={billingBusy} onClick={handleCancel}>
              Cancel subscription
            </button>
          ) : (
            <button className="btn btn-primary" disabled={billingBusy} onClick={handleUpgrade}>
              Upgrade to Pro
            </button>
          )}
        </div>

        <div className="card">
          <h2>Extension</h2>
          <p>Log in with this same email/password inside the extension popup to start looking up words on any page.</p>
        </div>
      </div>
    </div>
  );
}
