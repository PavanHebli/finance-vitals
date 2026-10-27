const API_URL     = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ENABLED     = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
const ENV         = process.env.NEXT_PUBLIC_ENV ?? "dev";
const SESSION_KEY = "vitals-session-id";
const IGNORE_KEY  = "vitals-ignore";
const ACQ_KEY     = "vitals-acquisition-sent";

// Open any page with ?ignore=1 to stop counting your own visits on this
// browser, and ?ignore=0 to count them again.
function updateIgnoreSwitch(): void {
  const value = new URLSearchParams(window.location.search).get("ignore");
  if (value === "1") localStorage.setItem(IGNORE_KEY, "1");
  if (value === "0") localStorage.removeItem(IGNORE_KEY);
}

function isIgnored(): boolean {
  return localStorage.getItem(IGNORE_KEY) === "1";
}

// Crawlers and link-preview bots load pages without a person behind them.
function isBot(): boolean {
  if (navigator.webdriver) return true;
  return /bot|crawl|spider|slurp|preview|headless|facebookexternalhit/i.test(navigator.userAgent);
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "mobile";
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  return "desktop";
}

function fire(path: string, body: object): void {
  if (!ENABLED) return;
  if (typeof window === "undefined") return;
  if (isIgnored() || isBot()) return;
  const sessionId = getSessionId();
  if (!sessionId) return;
  fetch(`${API_URL}/analytics/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => {});
}

export const analytics = {
  init(isReturning: boolean): void {
    updateIgnoreSwitch();
    fire("session", {
      session_id: getSessionId(),
      data: {
        device:       getDevice(),
        is_returning: isReturning,
        visited_home: true,
        env:          ENV,
      },
    });
  },

  // Where this visit came from. Sent once per browser session, from the first
  // page load, because the UTM tags are gone after the first navigation.
  // Only the referring site's name is kept, never its full address.
  trackAcquisition(): void {
    if (sessionStorage.getItem(ACQ_KEY)) return;
    sessionStorage.setItem(ACQ_KEY, "1");

    const params = new URLSearchParams(window.location.search);
    let referrer = "";
    try {
      referrer = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {}

    fire("event", {
      session_id: getSessionId(),
      event: "session_started",
      properties: {
        utm_source:   params.get("utm_source"),
        utm_medium:   params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        referrer,
        landing_path: window.location.pathname,
        env:          ENV,
      },
    });
  },

  updateSession(data: Record<string, unknown>): void {
    fire("session", {
      session_id: getSessionId(),
      data: { ...data, env: ENV },
    });
  },

  track(event: string, properties: Record<string, unknown> = {}): void {
    fire("event", {
      session_id: getSessionId(),
      event,
      properties: { ...properties, env: ENV },
    });
  },
};
