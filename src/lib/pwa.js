// Registers the service worker (production only) and captures the browser's "install" prompt.
let deferred = null
const subs = new Set()
export const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true
export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((f) => f()) })
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()) })
  if ('serviceWorker' in navigator && import.meta.env && import.meta.env.PROD) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}) })
  }
}
export const canPrompt = () => !!deferred
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f) }
export async function promptInstall() {
  if (!deferred) return false
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null; subs.forEach((f) => f())
  return outcome === 'accepted'
}
