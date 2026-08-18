const API_URL     = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const ENABLED     = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "true";
const ENV         = process.env.NEXT_PUBLIC_ENV ?? "dev";
const SESSION_KEY = "vitals-session-id";

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
