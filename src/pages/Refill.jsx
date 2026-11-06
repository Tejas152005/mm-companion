import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useData } from '../lib/data'
import { today, fmtDate, inr, refill, shortName, reorderEvents, downloadIcs, LEAD_DAYS } from '../lib/plan'
import { L } from '../lib/i18n'

const field = 'w-full rounded-xl border border-ink/25 bg-white px-4 py-3 min-h-[48px]'

function PackCard({ p }) {
  const { updateProduct } = useData()
  const [days, setDays] = useState(p.pack_days ?? ''), [price, setPrice] = useState(p.pack_price_inr ?? ''), [msg, setMsg] = useState('')
  const nDays = days === '' ? null : Number(days), nPrice = price === '' ? null : Number(price)
  const valid = nDays !== null && nDays >= 1 && nDays <= 365 && nPrice !== null && nPrice >= 0 && nPrice <= 100000
  const r = valid ? refill({ ...p, pack_days: nDays, pack_price_inr: nPrice }) : null // live preview while typing
  const dirty = nDays !== p.pack_days || nPrice !== p.pack_price_inr
  const save = async () => {
    const res = await updateProduct(p.id, { pack_days: nDays, pack_price_inr: nPrice })
    setMsg(res.error ? 'We could not save that. Try again.' : L('Saved.'))
  }
  const newPack = async () => { const res = await updateProduct(p.id, { pack_started_on: today() }); setMsg(res.error ? 'We could not save that. Try again.' : 'Marked. Your countdown restarted today.') }
  return (
    <article className="rounded-2xl bg-white border border-ink/10 p-5 space-y-4">
      <h2 className="font-bold">{shortName(p)}</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">One pack lasts me (days)
          <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ''))} className={`${field} mt-1 font-normal`} /></label>
        <label className="text-sm font-medium">Price I paid (₹)
          <input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} className={`${field} mt-1 font-normal`} /></label>
      </div>
      <p className="text-xs text-ink/50">Your pack label gives a guide, but how long a pack lasts depends on how you use it. These numbers stay as you enter them. We don't look up prices.</p>
      <button className="btn btn-primary disabled:opacity-50" disabled={!valid || !dirty} onClick={save}>{L("Save")}</button>
      {r && (
        <div className="space-y-3 border-t border-ink/10 pt-4">
          <div className="rounded-xl bg-mist p-4">
            <p className="text-sm text-ink/70">{r.daysLeft < 0 ? 'Should have run out' : 'Runs out on'}</p>
            <p className="text-xl font-bold">{fmtDate(r.runsOn)}</p>
            <p className="text-sm">{r.daysLeft < 0 ? `${-r.daysLeft} day${r.daysLeft === -1 ? '' : 's'} ago. Reorder now to avoid a gap.` : `${r.daysLeft} day${r.daysLeft === 1 ? '' : 's'} left. Reorder by ${fmtDate(r.reorderBy)} (we assume about ${LEAD_DAYS} days for delivery).`}</p>
          </div>
          <p className="text-sm">About <b>{inr(r.perDay)}</b> a day, or <b>{inr(r.perMonth)}</b> a month.</p>
          <p className="text-sm text-ink/70">To reach the usual {p.weeks_to_notice}-week mark: <b>{inr(r.windowCost)}</b> in total. Spent so far, as an estimate: <b>{inr(r.spent)}</b>. Still to come: <b>{inr(r.remaining)}</b>.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <button className="underline" onClick={newPack}>{L("I started a new pack today")}</button>
            <button className="underline" onClick={() => downloadIcs('man-matters-reorder.ics', reorderEvents(p, r))}>{L("Add reorder reminder to calendar")}</button>
            <Link to="/offers" className="underline">{L("See concept offers")}</Link>
          </div>
        </div>
      )}
      {msg && <p role="status" className="text-sm text-moss">{msg}</p>}
    </article>
  )
}

export default function Refill() {
  const { demo } = useSession()
  const { ready, active } = useData()
  if (!ready) return <p className="p-6">Loading…</p>
  const monthly = active.map((p) => refill(p)).filter(Boolean).reduce((a, r) => a + r.perMonth, 0)
  return (
    <main className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-bold">{L("Refill and cost")}</h1>
      {demo && <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm">Demo Mode: the price here is a made-up sample, not a real Man Matters price.</p>}
      {!active.length && <p className="text-ink/70">Add a product in Setup first, then come back to plan refills.</p>}
      {monthly > 0 && (
        <section className="rounded-3xl bg-ink text-paper p-5">
          <p className="text-paper/70 text-sm">{L("Your routine costs about")}</p>
          <p className="text-4xl font-bold">{inr(monthly)}<span className="text-lg text-paper/60"> a month</span></p>
        </section>
      )}
      {active.map((p) => <PackCard key={p.id} p={p} />)}
      <p className="text-xs text-ink/50">Estimates only, based on what you enter. Concept app, not official Man Matters.</p>
    </main>
  )
}