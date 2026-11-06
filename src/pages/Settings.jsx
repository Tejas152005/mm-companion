import { useState } from 'react'
import { useSession } from '../lib/session'
import { useData } from '../lib/data'
import { LANGS } from '../lib/i18n'
import { resetDemoData } from '../lib/demo'
import { PURPOSES, fmtDate, iso } from '../lib/plan'
import { L } from '../lib/i18n'

export default function Settings() {
  const { demo, lang, setLang, signOut } = useSession()
  const { ready, consent, consentAt, setConsentFor, exportData, deleteCheckins, deleteAccount } = useData()
  const [msg, setMsg] = useState(''), [confirm, setConfirm] = useState(''), [busy, setBusy] = useState(false)
  if (!ready) return <p className="p-6">Loading…</p>
  const fail = 'That did not work. Check your connection and try again.'
  const run = async (fn, ok) => { setBusy(true); setMsg(''); const r = await fn(); setBusy(false); setMsg(r.error ? fail : ok || ''); return r }
  const btn = 'btn btn-ghost disabled:opacity-50'
  return (
    <main className="px-5 pt-6 space-y-6">
      <h1 className="text-2xl font-bold">{L("Settings")}</h1>

      <section className="space-y-2">
        <h2 className="font-bold">{L("Language")}</h2>
        <div className="flex gap-2" role="group" aria-label="Language">
          {Object.entries(LANGS).map(([k, v]) => <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={`px-3 py-1.5 rounded-full text-sm border ${lang === k ? 'bg-ink text-paper border-ink' : 'border-ink/25'}`}>{v}</button>)}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">{L("Your choices")}</h2>
        <p className="text-sm text-ink/70">{L("Change your mind any time. Each change is saved as a new dated record, so there is a clear history of what you agreed to and when.")}</p>
        {PURPOSES.map(([p, label, req, why]) => (
          <label key={p} className="flex gap-3 items-start rounded-xl bg-white border border-ink/15 p-3">
            <input type="checkbox" className="h-5 w-5 mt-1" disabled={req || busy} checked={!!consent[p]} onChange={(e) => run(() => setConsentFor(p, e.target.checked))} />
            <span><span className="font-medium block">{L(label)}{req && ' (' + L('required') + ')'}</span><span className="text-sm text-ink/70">{L(why)}</span>
              {consentAt[p] && <span className="text-xs text-ink/50 block mt-1">Last changed {fmtDate(iso(new Date(consentAt[p])))}</span>}</span>
          </label>
        ))}
        <p className="text-xs text-ink/50">Turning off "Store my check-ins" stops new check-ins being saved to your account. They stay on this device instead. Use "Delete my check-ins" below to remove what's already saved.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">{L("Your data")}</h2>
        <button className={btn} disabled={busy} onClick={() => run(exportData, 'Downloaded.')}>{L("Download my data (JSON)")}</button>
        <button className={btn} disabled={busy} onClick={() => run(deleteCheckins, 'Your check-ins were deleted.')}>{L("Delete my check-ins")}</button>
        {demo ? (
          <button className={btn} onClick={() => { resetDemoData(); window.location.reload() }}>{L("Reset demo data")}</button>
        ) : confirm === 'account' ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
            <p className="text-sm">This permanently deletes your account, routine, check-ins and consent history. It can't be undone.</p>
            <button className="btn bg-red-700 text-white disabled:opacity-50" disabled={busy} onClick={() => run(deleteAccount)}>{L("Yes, delete everything")}</button>
            <button className="btn btn-ghost" onClick={() => setConfirm('')}>{L("Cancel")}</button>
          </div>
        ) : (
          <button className={`${btn} !text-red-700 !border-red-300`} onClick={() => setConfirm('account')}>{L("Delete my account and all data")}</button>
        )}
        {msg && <p role="status" className="text-sm text-moss">{msg}</p>}
      </section>

      <button className="btn btn-primary" onClick={signOut}>{demo ? L('Exit demo') : L('Sign out')}</button>
      <p className="text-xs text-ink/50">{L("Concept app, not official Man Matters. It tracks a routine and does not give medical advice.")}</p>
    </main>
  )
}