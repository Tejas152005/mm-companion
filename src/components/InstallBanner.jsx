import { useEffect, useState } from 'react'
import { L } from '../lib/i18n'
import { canPrompt, isIos, isStandalone, promptInstall, subscribe } from '../lib/pwa'

const KEY = 'mmc_install_dismissed'
export default function InstallBanner() {
  const [, tick] = useState(0)
  const [hidden, setHidden] = useState(() => { try { return !!localStorage.getItem(KEY) } catch { return false } })
  useEffect(() => subscribe(() => tick((n) => n + 1)), [])
  if (hidden || isStandalone() || !(canPrompt() || isIos())) return null
  const dismiss = () => { setHidden(true); try { localStorage.setItem(KEY, '1') } catch {} }
  return (
    <div role="region" aria-label={L('Install the app')} className="mx-4 mt-4 rounded-2xl bg-ink text-paper px-4 py-3 text-sm flex items-center justify-between gap-3">
      <p>{canPrompt() ? L('Add it to your home screen to open it like an app.') : L('On iPhone: tap Share, then Add to Home Screen.')}</p>
      <span className="flex gap-3 shrink-0 items-center">
        {canPrompt() && <button className="bg-amber text-ink rounded-lg px-3 py-1.5 font-medium" onClick={promptInstall}>{L('Install')}</button>}
        <button className="underline" onClick={dismiss}>{L('Not now')}</button>
      </span>
    </div>
  )
}
