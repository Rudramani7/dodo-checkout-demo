"use client";
import { useState, useEffect } from "react";
import { DodoCheckout } from "@dodo/checkout-sdk";

type LogEvent = { time: string; name: string; detail?: string };

function eventColor(name: string, detail?: string): string {
  if (name === "checkout.open") return "event--open";
  if (name === "checkout.success") return "event--success";
  if (name === "checkout.error") return "event--error";
  if (name === "checkout.close" && detail === "success") return "event--success";
  if (name === "checkout.close" && detail === "error") return "event--error";
  return "event--neutral";
}

export default function Page() {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [successSession, setSuccessSession] = useState<string | null>(null);

  useEffect(() => {
    if (!successSession) return;
    const timer = setTimeout(() => setSuccessSession(null), 3000);
    return () => clearTimeout(timer);
  }, [successSession]);

  function add(name: string, detail?: string) {
    setEvents((prev) => [{ time: new Date().toLocaleTimeString(), name, detail }, ...prev]);
  }

  function buy() {
    add("checkout.open");
    DodoCheckout.open({
      productId: "prod_123",
      checkoutUrl: "http://localhost:3001",
      onSuccess: ({ sessionId }) => {
        add("checkout.success", sessionId);
        setSuccessSession(sessionId);
      },
      onClose: ({ reason }) => add("checkout.close", reason),
      onError: ({ code, message }) => add("checkout.error", `${code}: ${message}`),
    });
  }

  return (
    <main className="wrap">
      {successSession && (
        <div className="toast animate-toast">
          <div className="toast-icon">✓</div>
          <div className="toast-body">
            <strong>Purchase Successful!</strong>
            <p>Thank you! Your Developer Pro subscription is now active.</p>
          </div>
          <button className="toast-close" onClick={() => setSuccessSession(null)} aria-label="Dismiss notification">×</button>
        </div>
      )}
      <nav className="nav">
        <div className="logo">dodo<span>.</span></div>
        <div className="pill">Merchant demo · Test mode</div>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <div className="eyebrow">Payments for modern builders</div>
          <h1>Make paying<br />feel simple.</h1>
          <p>
            Get instant access to our powerful developer APIs. Start building
            production-ready integrations in minutes with unlimited usage,
            dedicated support, and enterprise-grade reliability.
          </p>
          <button className="button" onClick={buy}>
            Buy Developer Pro →
          </button>
        </div>

        <aside className="panel">
          <div className="panel-top">
            <div className="eyebrow">Developer Pro</div>
            <h2>Everything you need to ship.</h2>
            <div className="price">$29<span className="muted"> / month</span></div>
            <p className="muted">Usage-ready billing for SaaS and AI products.</p>
          </div>

          <div className="log">
            <div className="log-header">
              <strong>SDK event log</strong>
              {events.length > 0 && (
                <button className="clear" onClick={() => setEvents([])}>
                  Clear
                </button>
              )}
            </div>
            {events.length === 0 ? (
              <p className="muted log-empty">Events appear here after you open checkout.</p>
            ) : (
              <div className="log-list">
                {events.map((e, i) => (
                  <div className={`event ${eventColor(e.name, e.detail)}`} key={i}>
                    <span className="event-time">{e.time}</span>
                    <span className="event-name">{e.name}</span>
                    {e.detail && <span className="event-detail">— {e.detail}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </section>

      <footer className="footer">
        © 2026 Modern Builders Inc. All rights reserved.
      </footer>
    </main>
  );
}