import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useData } from '../lib/data'
import { useRewards } from '../lib/rewards'
import { L, Lf } from '../lib/i18n'
import { today, fmtDate, inr, downloadIcs } from '../lib/plan'
import { FESTIVALS, OFFERS, HOLI_STEPS, festivalState, bestOffer, isOpen, priceAfter, windowOf, holiEvents } from '../lib/offers'

const card = 'rounded-2xl bg-white border border-ink/10 p-5 space-y-3'
const DOTS = ['#E2457B', '#F2B705', '#2F80ED', '#3BA55D', '#9B51E0'] // gulal colours

function HoliMode({ f }) {
  const key = 'mmc_holi_' + f.id
  const [done, setDone] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || {} } catch { return {} } })
  const flip = (id) => { const n = { ...done, [id]: !done[id] }; setDone(n); try { localStorage.setItem(key, JSON.stringify(n)) } catch {} }
  return (
    <section className="rounded-3xl bg-ink text-paper p-6 space-y-4" style={{ backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(232,161,58,.3), transparent 55%)' }}>
      <div className="flex gap-1.5" aria-hidden="true">{DOTS.map((c) => <span key={c} className="h-3 w-3 rounded-full" style={{ background: c }} />)}</div>
      <div>
        <p className="text-amber text-sm font-medium">{Lf('Holi is on {date}.', { date: fmtDate(f.date) })}</p>
        <h2 className="text-2xl font-bold">{L('Holi hair-care mode')}</h2>
        <p className="text-paper/70 text-sm mt-1">{L('Get ready, step by step')}</p>
      </div>
      {Object.entries(HOLI_STEPS).map(([phase, steps]) => (
        <div key={phase}>
          <h3 className="font-bold text-sm mb-2">{L(phase)}</h3>
          <ul className="space-y-2">
            {steps.map((s, i) => {
              const id = phase + i
              return (
                <li key={id}>
                  <label className="flex gap-3 items-start text-sm">
                    <input type="checkbox" className="h-5 w-5 mt-0.5 shrink-0" checked={!!done[id]} onChange={() => flip(id)} />
                    <span className={done[id] ? 'text-paper/50 line-through' : ''}>{L(s)}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
      <button className="btn bg-amber text-ink" onClick={() => downloadIcs('holi-reminders.ics', holiEvents(f))}>{L('Add Holi reminders to my calendar')}</button>
      <p className="text-xs text-paper/60">{L('This tracks a routine and is not medical advice.')}</p>
    </section>
  )
}

export default function Offers() {
  const { demo } = useSession()
  const { ready, active, consent, setConsentFor } = useData()
  const rw = useRewards()
  const [preview, setPreview] = useState(false), [busy, setBusy] = useState(false)
  if (!ready || !rw.loaded) return <p className="p-6">Loading…</p>

  const st = festivalState(today(), preview ? 'holi' : null)
  const fest = st.active
  const ctx = { festival: fest ? fest.key : null, student: rw.studentOk }
  const best = bestOffer(OFFERS, ctx)
  const priced = active.find((p) => p.pack_price_inr != null)
  const allowed = demo || consent.offers_marketing

  return (
    <main className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-bold">{L('Offers')}</h1>
      <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm">{L('Concept offers. Illustrative only, not real Man Matters discounts.')}</p>

      {!allowed ? (
        <section className={card}>
          <p className="text-sm">{L('To see offers, allow us to show them to you. You can turn this off in Settings.')}</p>
          <button className="btn btn-primary disabled:opacity-50" disabled={busy} onClick={async () => { setBusy(true); await setConsentFor('offers_marketing', true); setBusy(false) }}>{L('Allow offers')}</button>
        </section>
      ) : (
        <>
          {fest && fest.key === 'holi' && <HoliMode f={fest} />}
          {fest && fest.key !== 'holi' && (
            <section className="rounded-3xl bg-ink text-paper p-6">
              <p className="text-amber text-sm font-medium">{fmtDate(fest.date)}</p>
              <h2 className="text-2xl font-bold">{L(fest.name)}</h2>
            </section>
          )}
          {!fest && st.next && (
            <section className={card}>
              <p className="text-sm">{Lf('Next: {name} on {date}', { name: L(st.next.name), date: fmtDate(st.next.date) })}</p>
              <p className="text-xs text-ink/60">{fmtDate(windowOf(st.next).from)}</p>
            </section>
          )}

          {best && (
            <section className="rounded-2xl bg-moss text-paper p-5 space-y-1">
              <p className="text-sm text-paper/70">{L('Best offer for you right now')}</p>
              <p className="text-xl font-bold">{L(best.title)}: {best.pct}%</p>
              {priced
                ? <p className="text-sm">{Lf("On your pack price of {price}, you'd pay about {after} (concept).", { price: inr(priced.pack_price_inr), after: inr(priceAfter(priced.pack_price_inr, best.pct)) })}</p>
                : <p className="text-sm text-paper/80">{L('Add your pack price in Refill & cost to see what an offer would save.')}</p>}
              <p className="text-xs text-paper/70">{L("One offer applies at a time. Offers don't stack.")}</p>
            </section>
          )}

          <ul className="space-y-3">
            {OFFERS.map((o) => {
              const open = isOpen(o, ctx), on = best && best.id === o.id
              return (
                <li key={o.id} className={`${card} ${open ? '' : 'opacity-60'}`}>
                  <div className="flex justify-between gap-3 items-start">
                    <div>
                      <span className="text-xs rounded-full bg-amber/30 px-2 py-0.5">{L('Concept offer')}</span>
                      <h3 className="font-bold mt-1">{L(o.title)}</h3>
                      <p className="text-sm text-ink/70">{L(o.note)}</p>
                    </div>
                    <p className="text-2xl font-bold shrink-0">{o.pct}%</p>
                  </div>
                  <p className="text-xs text-ink/60">{on ? L('Applied') : open ? '' : o.requires === 'student' ? '' : L('Not available right now')}</p>
                  {o.requires === 'student' && !rw.studentOk && <Link to="/student" className="btn btn-ghost block text-center">{L('Verify student status')}</Link>}
                </li>
              )
            })}
          </ul>

          <Link to="/rewards" className="btn btn-ghost block text-center">{L('Rewards and referrals')}</Link>
          {!(fest && fest.key === 'holi') && (
            <button className="text-sm underline" onClick={() => setPreview(true)}>{L('Preview Holi mode (for reviewers)')}</button>
          )}
          {preview && <button className="text-sm underline block" onClick={() => setPreview(false)}>{L('Back to normal view')}</button>}
        </>
      )}
      <p className="text-xs text-ink/50">{L('This tracks a routine and is not medical advice. Concept app, not official Man Matters.')}</p>
    </main>
  )
}
