"use client";
import { useEffect, useState, useRef } from "react";

type State = "loading" | "ready" | "processing" | "success" | "error";

const CARDS: Record<string, { ok?: boolean; decline?: boolean; retry?: boolean }> = {
  "4242424242424242": { ok: true },
  "4000000000000002": { decline: true },
  "4000000000000341": { retry: true },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const session = () => `sess_${Math.random().toString(36).slice(2, 10)}`;

function validateExpiry(value: string): boolean {
  const clean = value.replace(/\s/g, "");
  const match = clean.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = parseInt(match[1], 10);
  const year = parseInt(match[2], 10) + 2000;
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const expDate = new Date(year, month - 1);
  return expDate >= new Date(now.getFullYear(), now.getMonth());
}

function validateCVC(value: string): boolean {
  return /^\d{3,4}$/.test(value.trim());
}

export default function Page() {
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [isStandalone, setIsStandalone] = useState(false);

  const parentOriginRef = useRef<string>("*");
  const isProcessing = state === "processing";

  const productId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("productId") || "prod_123"
      : "prod_123";

  // Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isStandalone && !isProcessing) {
        window.parent.postMessage(
          { type: "CHECKOUT_CLOSED", reason: "user" },
          parentOriginRef.current
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isStandalone, isProcessing]);

  // SDK handshake
  useEffect(() => {
    if (window === window.parent) {
      setIsStandalone(true);
      setState("ready");
      return;
    }

    const handler = (e: MessageEvent) => {
      if (e.source !== window.parent) return;
      if (e.data?.type === "INIT_CHECKOUT") {
        parentOriginRef.current = e.origin;
        setState("ready");
      }
      if (e.data?.type === "HOST_CLOSE" && !isProcessing) {
        window.parent.postMessage({ type: "CHECKOUT_CLOSED", reason: "user" }, e.origin);
      }
    };

    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "CHECKOUT_READY" }, "*");
    return () => window.removeEventListener("message", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showError(msg: string) {
    setError(msg);
    setErrorKey((k) => k + 1); // re-trigger animation on repeated errors
  }

  async function pay() {
    if (!email || !/^\S+@\S+\.\S+$/.test(email))
      return showError("Enter a valid email address.");

    const normalized = card.replace(/\s/g, "");
    if (!CARDS[normalized])
      return showError("Use one of the test card numbers shown below.");

    if (!validateExpiry(expiry))
      return showError("Enter a valid expiry date (MM / YY).");

    if (!validateCVC(cvc))
      return showError("Enter a valid 3 or 4-digit CVC.");

    setError("");
    setState("processing");
    await wait(1500);

    const result = CARDS[normalized];

    if (result.ok || (result.retry && attempt > 0)) {
      setState("success");
      if (!isStandalone) {
        window.parent.postMessage(
          { type: "PAYMENT_SUCCESS", sessionId: session() },
          parentOriginRef.current
        );
      }
      return;
    }

    if (result.retry) {
      setAttempt(1);
      setState("error");
      showError("Payment failed temporarily. Please try again.");
      return;
    }

    setState("error");
    const msg = result.decline
      ? "Your card was declined. Please try a different card."
      : "Payment could not be completed. Please try again.";
    showError(msg);

    if (!isStandalone) {
      window.parent.postMessage(
        {
          type: "PAYMENT_ERROR",
          code: result.decline ? "CARD_DECLINED" : "PAYMENT_FAILED",
          message: result.decline
            ? "Your card was declined."
            : "Payment could not be completed.",
        },
        parentOriginRef.current
      );
    }
  }

  function handleClose() {
    if (!isStandalone && !isProcessing) {
      window.parent.postMessage(
        { type: "CHECKOUT_CLOSED", reason: "user" },
        parentOriginRef.current
      );
    }
  }

  function reset() {
    setState("ready");
    setEmail("");
    setCard("");
    setExpiry("");
    setCvc("");
    setError("");
    setAttempt(0);
  }

  if (state === "loading") {
    return (
      <main className="checkout">
        <div className="card">
          <div className="content center">
            <div className="spinner large" aria-label="Loading" />
            <p className="muted" style={{ marginTop: 16 }}>Preparing secure checkout…</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout">
      <section className="card animate-in">
        <header className="top">
          <div className="brand">dodo<span>.</span></div>
          {isStandalone ? (
            <div className="badge">Standalone preview</div>
          ) : (
            <button
              className="close"
              aria-label="Close checkout"
              onClick={handleClose}
              disabled={isProcessing}
            >
              ×
            </button>
          )}
        </header>

        <div className="content">
          {state === "success" ? (
            <div className="success animate-in">
              <div className="success-circle">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M7 16l6 6 12-12" stroke="#10130f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="title" style={{ marginTop: 20 }}>Payment successful</h1>
              <p className="muted">Thanks for your purchase. A confirmation is on its way.</p>
              {isStandalone && (
                <button className="pay" style={{ marginTop: 28 }} onClick={reset}>
                  Start over
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="eyebrow">Secure checkout</div>
              <h1 className="title">Complete your purchase</h1>
              <p className="muted">Simple billing for modern digital products.</p>

              <div className="product">
                <div>
                  <strong>Developer Pro</strong>
                  <div className="muted" style={{ marginTop: 2 }}>Monthly subscription · {productId}</div>
                </div>
                <div className="price">$29.00</div>
              </div>

              <label htmlFor="email" className="label">Email address</label>
              <input
                id="email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isProcessing}
                autoComplete="email"
              />

              <label htmlFor="card" className="label">Card number</label>
              <input
                id="card"
                className="input"
                value={card}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length > 16) return;
                  setCard(val.match(/.{1,4}/g)?.join(" ") || val);
                }}
                placeholder="4242 4242 4242 4242"
                inputMode="numeric"
                disabled={isProcessing}
                autoComplete="cc-number"
              />

              <div className="row">
                <div>
                  <label htmlFor="expiry" className="label">Expiry</label>
                  <input
                    id="expiry"
                    className="input"
                    value={expiry}
                    onChange={(e) => {
                      const input = e.target.value;
                      if (expiry.endsWith(" / ") && input.length < expiry.length) {
                        setExpiry(input.replace(" / ", ""));
                        return;
                      }
                      let val = input.replace(/\D/g, "");
                      if (val.length > 4) val = val.slice(0, 4);
                      if (val.length >= 3) {
                        setExpiry(`${val.slice(0, 2)} / ${val.slice(2)}`);
                      } else if (val.length === 2 && input.length > expiry.length) {
                        setExpiry(`${val} / `);
                      } else {
                        setExpiry(val);
                      }
                    }}
                    placeholder="MM / YY"
                    disabled={isProcessing}
                    autoComplete="cc-exp"
                  />
                </div>
                <div>
                  <label htmlFor="cvc" className="label">CVC</label>
                  <input
                    id="cvc"
                    className="input"
                    value={cvc}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      if (val.length <= 4) setCvc(val);
                    }}
                    placeholder="123"
                    inputMode="numeric"
                    disabled={isProcessing}
                    autoComplete="cc-csc"
                  />
                </div>
              </div>

              {error && (
                <div key={errorKey} className="error animate-error" role="alert" aria-live="assertive">
                  ⚠ {error}
                </div>
              )}

              <button
                className={`pay${isProcessing ? " pay--loading" : ""}${state === "error" ? " pay--retry" : ""}`}
                disabled={isProcessing}
                onClick={pay}
              >
                {isProcessing ? (
                  <span className="btn-row">
                    <span className="spinner" aria-hidden="true" />
                    Processing…
                  </span>
                ) : state === "error" ? (
                  "Try again →"
                ) : (
                  "Pay $29.00"
                )}
              </button>

              <p className="secure">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4, verticalAlign: "middle" }}>
                  <rect x="1" y="5" width="10" height="7" rx="1.5" stroke="#8a9384" strokeWidth="1.2" />
                  <path d="M3.5 5V3.5a2.5 2.5 0 015 0V5" stroke="#8a9384" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                Your card details never leave this secure checkout.
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}