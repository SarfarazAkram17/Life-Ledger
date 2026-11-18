import axios from "axios";

// Older versions kept the login token in localStorage, where any injected script
// could read it. The session is now an httpOnly cookie; remove the old copy.
try {
  localStorage.removeItem("ll_token");
} catch {
  // Storage can be unavailable (private mode); nothing to clean up then.
}

/** Fired when the server says the PIN must be entered before data can be used. */
export const PIN_REQUIRED_EVENT = "ll:pin-required";
/** Fired when the login session is missing or has expired. */
export const SESSION_EXPIRED_EVENT = "ll:session-expired";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  // Sends the httpOnly session cookie. The token itself is never visible to JavaScript.
  withCredentials: true,
});

// Surface the server's { error } message as a plain Error so callers can show err.message.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status: number | undefined = error.response?.status;
    const code: string | undefined = error.response?.data?.code;

    if (status === 423 && code === "PIN_REQUIRED") {
      window.dispatchEvent(new Event(PIN_REQUIRED_EVENT));
    } else if (status === 401 && code === "SESSION_EXPIRED") {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    const message = error.response?.data?.error ?? error.message ?? "Request failed";
    return Promise.reject(Object.assign(new Error(message), { status, code }));
  },
);
