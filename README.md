# Dodo Payments — Tiny Embeddable Checkout

A small TypeScript checkout assignment implementation featuring an embeddable checkout experience. This project demonstrates how to securely process payments within an iframe without exposing sensitive card information to the embedding website.

The project consists of three pieces:
- `packages/sdk`: A framework-independent, single-file checkout SDK.
- `apps/checkout`: An independently hosted secure checkout application.
- `apps/demo`: A sample merchant demo page demonstrating SDK integration.

## Installation

```bash
pnpm install
```

## Running the Project

```bash
pnpm dev
```

### Local URLs
- **Demo Website:** http://localhost:3000
- **Checkout Standalone Preview:** http://localhost:3001

### Live Deployments
- **Live Demo Store:** https://demo-flax-nu-76.vercel.app
- **Checkout Standalone Preview:** https://checkout-alpha-one.vercel.app

## How to Use the SDK

The SDK provides a simple API to open the checkout modal securely over your page.

```typescript
import { DodoCheckout } from "@dodo/checkout-sdk";

DodoCheckout.open({
  productId: "prod_123",
  checkoutUrl: "http://localhost:3001", // Optional: defaults to localhost:3001
  onSuccess: ({ sessionId }) => {
    console.log("Payment successful, session ID:", sessionId);
  },
  onClose: ({ reason }) => {
    // Reason can be 'user', 'success', or 'error'
    console.log("Checkout closed. Reason:", reason);
  },
  onError: ({ code, message }) => {
    console.error(`Error ${code}: ${message}`);
  },
});
```

You can programmatically close the checkout using:
```typescript
DodoCheckout.close();
```

## Architecture

1. **Demo Site**: The merchant application that embeds the SDK. It renders the main user interface and triggers the SDK checkout modal when the user initiates a purchase.
2. **SDK**: A lightweight script that creates an overlay and an iframe, injecting the checkout application. It manages the lifecycle of the checkout modal and acts as a bridge between the demo site and the checkout app.
3. **Checkout Iframe**: A standalone Next.js application that provides the payment UI. It runs isolated within an iframe.
4. **postMessage Communication**: Communication between the host page and the checkout app happens strictly over `window.postMessage`. A minimal protocol is established (`CHECKOUT_READY`, `INIT_CHECKOUT`, `PAYMENT_SUCCESS`, `PAYMENT_ERROR`, `CHECKOUT_CLOSED`, `HOST_CLOSE`) to orchestrate the flow.

## Security

- **Isolated Card Details:** The checkout application runs entirely in a separate iframe. Card numbers, expiries, and CVCs are entered directly into the checkout application and never sent to the parent merchant page.
- **Strict Validation:** The `postMessage` implementation strictly validates `event.origin` and `event.source` to ensure messages only come from trusted sources. The checkout app dynamically captures the trusted parent origin via the `INIT_CHECKOUT` message and communicates exclusively with that origin.
- **Minimal Data Crossing:** The only data allowed to cross the boundary back to the merchant are success session IDs, predefined error codes/messages, and close reasons. No customer input or sensitive payment information is transmitted.

## Test Cards

Use the following card numbers (with any future expiry and CVC) to test different behaviors:

- `4242 4242 4242 4242` — Payment succeeds.
- `4000 0000 0000 0002` — Payment declines (user is allowed to retry).
- `4000 0000 0000 0341` — First payment attempt fails temporarily; succeeding upon retry.

## Design Decisions

1. **Iframe vs Redirect:**
   We chose an iframe approach over a full-page redirect because the merchant page remains visible in the background, creating a more seamless and integrated user experience without needing complex return-URL management.
2. **Parent/Checkout Communication:**
   We chose `postMessage` with strict origin/source validation instead of relying on a backend. Because the checkout is hosted separately and card details must remain isolated on the client side, `postMessage` offers a secure bridge for lifecycle events while keeping the iframe sandbox boundaries intact. 

## What would be explored next

- Real payment provider integration (e.g. Stripe, Adyen).
- Backend-created checkout sessions to avoid tampering with product details or prices.
- Webhook verification for secure fulfillment.
- Better localization and internationalization.
- Analytics and observability tools for tracking drop-off rates.
- Strict CSP (Content Security Policy) and security headers.
- Production hosting and custom domain configuration.
