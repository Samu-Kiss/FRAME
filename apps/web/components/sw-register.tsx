"use client"

import { useEffect } from "react"

// Registers the service worker so FRAME is installable and has an offline
// shell (v2.0 PWA). No-op during dev HMR churn is fine — the SW is idempotent.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("[pwa] service worker registration failed:", err)
      })
    }
    if (document.readyState === "complete") onLoad()
    else window.addEventListener("load", onLoad, { once: true })
    return () => window.removeEventListener("load", onLoad)
  }, [])
  return null
}
