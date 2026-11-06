import { useState } from 'react'
import { useData } from '../lib/data'
import { today, diffDays, fmtDate, shortName, routineEvents, downloadIcs, SOURCES, REASONS } from '../lib/plan'

const field = 'w-full rounded-xl border border-ink/25 bg-white px-4 py-3 min-h-[48px]'
const chip = (on) => `px-4 py-2 rounded-full border min-h-[44px] text-sm ${on ? 'bg-moss text-paper border-moss' : 'border-ink/25 bg-white'}`

function ProductCard({ p }) {
  const { updateProduct } = useData()
  const base = { started_on: p.started_on, times_per_day: p.times_per_day, reminder_times: p.reminder_times, source: p.source }
  const [d, setD] = useState(base), [stopping, setStopping] = useState(false), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const dirty = JSON.stringify(d) !== JSON.stringify(base)
  const setTimes = (n) => setD({ ...d, times_per_day: n, reminder_times: d.reminder_times.slice(0, n) })
  const setTime = (i, v) => setD({ ...d, reminder_times: Array.from({ length: d.times_per_day }, (_, j) => (j === i ? v : d.reminder_times[j] || '')) })
  const save = async () => {
    if (!d.started_on || d.started_on > today()) return setMsg('Pick a start date that is today or earlier.')
    setBusy(true); setMsg('')
    const r = await updateProduct(p.id, { ...d, reminder_times: d.reminder_times.filter(Boolean).sort() })
    setBusy(false); setMsg(r.error ? 'We could not save that. Try again.' : 'Saved.')
  }
  const stop = async (reason) => {
    setBusy(true)
    const r = await updateProduct(p.id, { active: false, stopped_on: today(), stopped_reason: reason })
    setBusy(false)
    if (r.error) setMsg('We could not save that. Try again.')
  }
  return (
    <article className="rounded-2xl bg-white border border-ink/10 p-5 space-y-4">
      <div>
        <h2 className="font-bold">{shortName(p)}</h2>
        <p className="text-sm text-ink/60">Day {Math.max(0, diffDays(p.started_on, today()))} · {p.usage_note}</p>
      </div>
      <label className="block text-sm font-medium">Started on
        <input type="date" max={today()} value={d.started_on} onChange={(e) => setD({ ...d, started_on: e.target.value })} className={`${field} mt-1 font-normal`} />
      </label>
      <div>
        <p className="text-sm font-medium">Times a day, as per your pack label or doctor</p>
        <div className="flex gap-2 mt-1">{[1, 2].map((n) => <button key={n} aria-pressed={d.times_per_day === n} onClick={() => setTimes(n)} className={chip(d.times_per_day === n)}>{n === 1 ? 'Once' : 'Twice'}</button>)}</div>
      </div>
      <div>
        <p className="text-sm font-medium">Reminder time{d.times_per_day > 1 ? 's' : ''}</p>
        <div className="flex gap-2 mt-1">
          {Array.from({ length: d.times_per_day }, (_, i) => (
            <input key={i} type="time" aria-label={`Reminder ${i + 1}`} value={d.reminder_times[i] || ''} onChange={(e) => setTime(i, e.target.value)} className={field} />
          ))}
        </div>
        <button className="text-sm underline mt-2 disabled:opacity-40" disabled={!d.reminder_times.filter(Boolean).length}
          onClick={() => downloadIcs('man-matters-reminder.ics', routineEvents({ ...p, ...d }))}>Add this reminder to my phone's calendar</button>
        <p className="text-xs text-ink/50 mt-1">Opens your calendar app, repeats every day, and works even when this app is closed. Delete it from your calendar when you stop.</p>
      </div>
      <div>
        <p className="text-sm font-medium">Where did you buy it?</p>
        <div className="flex flex-wrap gap-2 mt-1">{SOURCES.map(([k, l]) => <button key={k} aria-pressed={d.source === k} onClick={() => setD({ ...d, source: d.source === k ? null : k })} className={chip(d.source === k)}>{l}</button>)}</div>
      </div>
      <button className="btn btn-primary disabled:opacity-50" disabled={!dirty || busy} onClick={save}>Save changes</button>
      {msg && <p role="status" className="text-sm text-moss">{msg}</p>}
      <div className="border-t border-ink/10 pt-3">
        {!stopping ? <button className="text-sm underline" onClick={() => setStopping(true)}>I've stopped or paused this</button> : (
          <div className="space-y-2">
            <p className="text-sm font-medium">What's the main reason? (Optional, and it helps the brand do better.)</p>
            <div className="flex flex-wrap gap-2">{REASONS.map(([k, l]) => <button key={k} disabled={busy} onClick={() => stop(k)} className={chip(false)}>{l}</button>)}</div>
            <p className="text-xs text-ink/50">Nothing is shared with the brand unless you allow anonymous trends in Settings.</p>
            <button className="text-sm underline" onClick={() => setStopping(false)}>Cancel</button>
          </div>
        )}
      </div>
    </article>
  )
}

export default function Routine() {
  const { ready, error, products, active, stopped, catalogue, addProduct, updateProduct } = useData()
  const [msg, setMsg] = useState('')
  if (!ready) return <p className="p-6">Loading…</p>
  const have = new Set(products.map((p) => p.product_id))
  const add = async (id) => { const r = await addProduct(id); setMsg(r.error ? 'We could not add that. Try again.' : '') }
  const restart = async (id) => { const r = await updateProduct(id, { active: true, stopped_on: null, stopped_reason: null }); setMsg(r.error ? 'We could not restart that. Try again.' : '') }
  return (
    <main className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-bold">Your routine</h1>
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</p>}
      {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
      {!active.length && <p className="text-ink/70">Nothing active yet. Add a product below to begin.</p>}
      {active.map((p) => <ProductCard key={p.id} p={p} />)}
      {catalogue.some((c) => !have.has(c.id)) && (
        <section className="space-y-2">
          <h2 className="font-bold">Add a product</h2>
          <div className="flex flex-wrap gap-2">{catalogue.filter((c) => !have.has(c.id)).map((c) => <button key={c.id} onClick={() => add(c.id)} className={chip(false)}>+ {c.name.replace(' (concept)', '')}</button>)}</div>
        </section>
      )}
      {stopped.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold">Stopped or paused</h2>
          {stopped.map((p) => (
            <div key={p.id} className="rounded-xl bg-white border border-ink/10 p-4 flex items-center justify-between gap-3">
              <p className="text-sm"><b>{shortName(p)}</b><br /><span className="text-ink/60">{p.stopped_on ? `Since ${fmtDate(p.stopped_on)}` : ''}{p.stopped_reason ? ` · ${REASONS.find((r) => r[0] === p.stopped_reason)?.[1]}` : ''}</span></p>
              <button className="text-sm underline shrink-0" onClick={() => restart(p.id)}>Restart</button>
            </div>
          ))}
        </section>
      )}
      <p className="text-xs text-ink/50">This tracks a routine and is not medical advice. Follow your pack label or your doctor.</p>
    </main>
  )
}