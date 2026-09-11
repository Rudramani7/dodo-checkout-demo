export type CloseReason = "user" | "success" | "error";

export interface DodoCheckoutOptions {
  productId: string;
  checkoutUrl?: string;
  onSuccess?: (data: { sessionId: string }) => void;
  onClose?: (data: { reason: CloseReason }) => void;
  onError?: (data: { code: string; message: string }) => void;
}

type CheckoutMessage =
  | { type: "CHECKOUT_READY" }
  | { type: "PAYMENT_SUCCESS"; sessionId: string }
  | { type: "PAYMENT_ERROR"; code: string; message: string }
  | { type: "CHECKOUT_CLOSED"; reason: CloseReason };

const DEFAULT_CHECKOUT_URL = "http://localhost:3001";

let overlay: HTMLDivElement | null = null;
let iframe: HTMLIFrameElement | null = null;
let currentOptions: DodoCheckoutOptions | null = null;
let listener: ((event: MessageEvent) => void) | null = null;
let escapeListener: ((event: KeyboardEvent) => void) | null = null;
let initTimeout: ReturnType<typeof setTimeout> | null = null;

function closeOverlay() {
  if (initTimeout) {
    clearTimeout(initTimeout);
    initTimeout = null;
  }
  if (escapeListener) {
    window.removeEventListener("keydown", escapeListener);
    escapeListener = null;
  }
  if (listener) {
    window.removeEventListener("message", listener);
    listener = null;
  }
  overlay?.remove();
  overlay = null;
  iframe = null;
  currentOptions = null;
}

export const DodoCheckout = {
  open(options: DodoCheckoutOptions) {
    if (overlay) {
      options.onError?.({
        code: "CHECKOUT_ALREADY_OPEN",
        message: "A checkout is already open."
      });
      return;
    }

    if (!options.productId?.trim()) {
      options.onError?.({
        code: "INVALID_PRODUCT_ID",
        message: "A productId is required."
      });
      return;
    }

    currentOptions = options;
    const checkoutOrigin = new URL(
      options.checkoutUrl || DEFAULT_CHECKOUT_URL,
      window.location.href
    ).origin;

    overlay = document.createElement("div");
    overlay.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483647",
      "display:flex", "align-items:center", "justify-content:center",
      "padding:20px", "background:rgba(7,10,15,.64)",
      "backdrop-filter:blur(8px)"
    ].join(";");

    iframe = document.createElement("iframe");
    iframe.title = "Dodo checkout";
    iframe.setAttribute("allow", "payment");
    iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin");
    iframe.style.cssText = [
      "width:min(100%, 460px)", "height:min(720px, 94vh)",
      "border:0", "border-radius:20px", "background:#fff",
      "box-shadow:0 30px 100px rgba(0,0,0,.35)"
    ].join(";");
    iframe.src = `${options.checkoutUrl || DEFAULT_CHECKOUT_URL}?productId=${encodeURIComponent(options.productId)}`;

    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    let isReady = false;

    initTimeout = setTimeout(() => {
      if (!isReady) {
        options.onError?.({ code: "TIMEOUT", message: "Checkout failed to load in time." });
        options.onClose?.({ reason: "error" });
        closeOverlay();
      }
    }, 10000);

    escapeListener = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        iframe?.contentWindow?.postMessage({ type: "HOST_CLOSE" }, checkoutOrigin);
      }
    };
    window.addEventListener("keydown", escapeListener);

    listener = (event: MessageEvent) => {
      if (event.source !== iframe?.contentWindow || event.origin !== checkoutOrigin) return;
      const message = event.data as CheckoutMessage;
      if (!message?.type) return;

      if (message.type === "CHECKOUT_READY") {
        if (!isReady) {
          isReady = true;
          if (initTimeout) {
            clearTimeout(initTimeout);
            initTimeout = null;
          }
        }
        iframe?.contentWindow?.postMessage(
          { type: "INIT_CHECKOUT", productId: options.productId },
          checkoutOrigin
        );
      }
      if (message.type === "PAYMENT_SUCCESS") {
        options.onSuccess?.({ sessionId: message.sessionId });
        options.onClose?.({ reason: "success" });
        closeOverlay();
      }
      if (message.type === "PAYMENT_ERROR") {
        options.onError?.({ code: message.code, message: message.message });
      }
      if (message.type === "CHECKOUT_CLOSED") {
        options.onClose?.({ reason: message.reason });
        closeOverlay();
      }
    };

    window.addEventListener("message", listener);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        iframe?.contentWindow?.postMessage({ type: "HOST_CLOSE" }, checkoutOrigin);
      }
    });
  },

  close() {
    if (!iframe || !currentOptions) return;
    const checkoutOrigin = new URL(
      currentOptions.checkoutUrl || DEFAULT_CHECKOUT_URL,
      window.location.href
    ).origin;
    iframe.contentWindow?.postMessage({ type: "HOST_CLOSE" }, checkoutOrigin);
  }
};
