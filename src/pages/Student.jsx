import { useRef, useState } from 'react'
import { useRewards } from '../lib/rewards'
import { L } from '../lib/i18n'
import { fmtDate } from '../lib/plan'

const card = 'rounded-2xl bg-white border border-ink/10 p-5 space-y-4'

export default function Student() {
  const rw = useRewards()
  const [college, setCollege] = useState(''), [agree, setAgree] = useState(false), [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState('')
  const input = useRef(null)
  if (!rw.loaded) return <p className="p-6">Loading…</p>
  const s = rw.stu
  const canSubmit = college.trim().length >= 2 && agree && (rw.isDemo || file) && !busy
  const submit = async () => {
    setBusy(true); setMsg('')
    const r = await rw.submitStudent(college.trim(), file)
    setBusy(false)
    setMsg(r.error ? (r.error === 'format' ? 'We could not read that photo. Try a JPEG or PNG.' : L('We could not save that. Check your connection and try again.')) : '')
  }
  const cancel = async () => { setBusy(true); const r = await rw.withdrawStudent(); setBusy(false); setMsg(r.error ? L('We could not save that. Check your connection and try again.') : '') }
  return (
    <main className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-bold">{L('Student verification')}</h1>
      <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm">{L('Concept offers. Illustrative only, not real Man Matters discounts.')}</p>

      {s ? (
        <section className={card}>
          <p className="text-sm text-ink/60">{s.college}</p>
          <p className="text-xl font-bold">{s.status === 'approved' ? L('Approved') : s.status === 'pending' ? L('Pending review') : L('Not approved')}</p>
          {s.status === 'approved' && s.valid_until && <p className="text-sm">{fmtDate(s.valid_until)}</p>}
          {s.status === 'pending' && rw.isDemo && <button className="btn btn-ghost" onClick={rw.demoApprove}>{L('Demo: simulate approval')}</button>}
          {s.status !== 'approved' && <button className="btn btn-ghost disabled:opacity-50" disabled={busy} onClick={cancel}>{L('Cancel and delete my ID photo')}</button>}
          {s.status === 'approved' && <button className="text-sm underline" disabled={busy} onClick={cancel}>{L('Cancel and delete my ID photo')}</button>}
        </section>
      ) : (
        <section className={card}>
          <label className="block text-sm font-medium">{L('College name')}
            <input value={college} maxLength={120} onChange={(e) => setCollege(e.target.value)} className="w-full rounded-xl border border-ink/25 bg-white px-4 py-3 min-h-[48px] mt-1 font-normal" /></label>
          <div>
            <p className="text-sm font-medium">{L('Photo of your student ID')}{rw.isDemo ? ' (demo: optional)' : ''}</p>
            <p className="text-xs text-ink/60 mt-1">{L('Cover your ID number and address. We only need your name, college and photo to be visible.')}</p>
            <input ref={input} type="file" accept="image/*" className="hidden" aria-label={L('Photo of your student ID')} onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button className="btn btn-ghost mt-2" onClick={() => input.current?.click()}>{file ? file.name : L('Photo of your student ID')}</button>
          </div>
          <label className="flex gap-3 items-start text-sm"><input type="checkbox" className="h-5 w-5 mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>{L('I agree to share this photo for a one-time student check. It is deleted once approved or if I cancel.')}</span></label>
          <button className="btn btn-primary disabled:opacity-50" disabled={!canSubmit} onClick={submit}>{L('Submit for review')}</button>
        </section>
      )}
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
      <p className="text-xs text-ink/60">{L('A person checks IDs by hand in this concept app. There is no automatic ID reading.')}</p>
    </main>
  )
}
