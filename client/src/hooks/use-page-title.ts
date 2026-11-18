import { useEffect } from "react";

const APP_NAME = "LifeLedger";

/** Sets the browser tab title to "<title> · LifeLedger" (or just the app name). */
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
  }, [title]);
}
