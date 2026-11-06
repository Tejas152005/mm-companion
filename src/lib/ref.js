// Remembers a referral code from a link like https://your-app/?ref=MMABC123 until the person signs in and claims it.
try {
  const code = new URLSearchParams(window.location.search).get('ref')
  if (code && /^[A-Za-z0-9]{4,12}$/.test(code)) localStorage.setItem('mmc_ref', code.toUpperCase())
} catch {}
export const pendingRef = () => { try { return localStorage.getItem('mmc_ref') || '' } catch { return '' } }
export const clearRef = () => { try { localStorage.removeItem('mmc_ref') } catch {} }
