import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useData } from '../lib/data'
import { t } from '../lib/i18n'
import { today, addDays, diffDays, fmtDate, streak, refill, shortName } from '../lib/plan'
import { L } from '../lib/i18n'

const EFFECTS = [['itch', 'Itchy'], ['dry', L('Dry or tight')], ['red', 'Redness'], ['none', 'Nothing']]
const R = 92, C = 2 * Math.PI * R
const two = (n) => String(n).padStart(2, '0')

export default function Home() {
  const { demo, profile, lang, signOut } = useSession()
  const { ready, error, active, checkins, canStore, points, logDay } = useData()
  const [sel, setSel] = useState(0), [fx, setFx] = useState([]), [busy, setBusy] = useState(false), [msg, setMsg] = useState('')
  const [, tick] = useState(0)
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 60000); return () => clearInterval(i) }, []) // keeps "due now" fresh
  if (!ready) return <p className="p-6">Loading…</p>

  const name = demo?.display_name || profile?.display_name || ''
  const p = active[Math.min(sel, active.length - 1)]
  const now = new Date(), hhmm = `${two(now.getHours())}:${two(now.getMinutes())}`
  const t0 = today(), y = addDays(t0, -1)
  const done = checkins.some((c) => c.date === t0)
  const missedY = !!p && diffDays(p.started_on, y) >= 0 && !checkins.some((c) => c.date === y)
  const dueNow = done ? [] : active.filter((a) => a.reminder_times.slice(0, a.times_per_day).some((x) => x <= hhmm))
  const soon = active.map((a) => ({ a, r: refill(a) })).filter((x) => x.r && x.r.daysLeft <= 7).sort((m, n) => m.r.daysLeft - n.r.daysLeft)[0]
  const days = p ? Math.max(0, diffDays(p.started_on, t0)) : 0
  const wks = p?.weeks_to_notice || 16, week = Math.min(wks, Math.floor(days / 7)), pct = Math.min(1, days / (wks * 7))

  const log = async (date, effects) => {
    setBusy(true); setMsg('')
    const r = await logDay(date, effects)
    setBusy(false)
    if (r.error) setMsg(L('We could not save that. Check your connection and try again.')); else setFx([])
  }

  return (
    <main className="px-5 pt-6 space-y-5">
      <header className="flex justify-between items-center">
        <h1 className="text-xl font-bold">{t(lang, 'hello')}, {name}</h1>
        <span className="flex gap-4 text-sm"><Link to="/dashboard" className="underline">{L("Brand view")}</Link><Link to="/settings" className="underline">{L("Settings")}</Link></span>
      </header>
      {demo && (
        <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm flex justify-between gap-3">
          <span>{L("Demo Mode. Sample data on this device only.")}</span>
          <button onClick={signOut} className="underline shrink-0">{t(lang, 'signOut')}</button>
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm">{error}</p>}

      {dueNow.length > 0 && (
        <p role="status" className="rounded-xl bg-moss text-paper px-4 py-3 text-sm">
          Reminder: time for {dueNow.map(shortName).join(' and ')}. Tap the check-in below when you're done.
        </p>
      )}

      {!p ? (
        <section className="rounded-3xl bg-ink text-paper p-6 space-y-3">
          <h2 className="text-xl font-bold">{L("Start your routine")}</h2>
          <p className="text-paper/70 text-sm">Add the product you use, and when you started it. Your progress window begins from that day.</p>
          <Link to="/routine" className="btn bg-amber text-ink block text-center">{L("Set up my routine")}</Link>
        </section>
      ) : (
        <section className="rounded-3xl bg-ink text-paper p-6 relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle at 80% 0%, rgba(232,161,58,.28), transparent 55%)' }}>
          {active.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-4" role="group" aria-label="Product">
              {active.map((a, i) => (
                <button key={a.id} aria-pressed={i === sel} onClick={() => setSel(i)} className={`px-3 py-1.5 rounded-full text-xs border ${i === sel ? 'bg-amber text-ink border-amber' : 'border-paper/30'}`}>{shortName(a)}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-5">
            <svg viewBox="0 0 220 220" className="w-40 h-40 -rotate-90 shrink-0" role="img" aria-label={`Week ${week} of ${wks}`}>
              <circle cx="110" cy="110" r={R} fill="none" stroke="rgba(246,248,245,.12)" strokeWidth="14" />
              <circle cx="110" cy="110" r={R} fill="none" stroke="#E8A13A" strokeWidth="14" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s' }} />
              {Array.from({ length: wks }).map((_, i) => { const a = (i / wks) * 2 * Math.PI; return <line key={i} x1={110 + 114 * Math.cos(a)} y1={110 + 114 * Math.sin(a)} x2={110 + 120 * Math.cos(a)} y2={110 + 120 * Math.sin(a)} stroke={i < week ? '#E8A13A' : 'rgba(246,248,245,.3)'} strokeWidth="3" /> })}
            </svg>
            <div>
              <p className="text-5xl font-bold leading-none">{week}<span className="text-xl text-paper/60">/{wks}</span></p>
              <p className="text-paper/70 mt-2 text-sm">weeks in. Day {days}. {days >= wks * 7 ? "You're past the usual window, so it's a good time for an honest review." : `People usually wait about ${wks} weeks before judging results.`}</p>
            </div>
          </div>
          <div className="flex gap-6 mt-5 text-sm"><p><b className="text-xl">{streak(checkins)}</b> day streak</p><p><Link to="/rewards" className="underline">{L("Rewards")}</Link></p></div>
        </section>
      )}

      {soon && (
        <Link to="/refill" className="block rounded-2xl bg-amber/20 px-4 py-3 text-sm">
          {soon.r.daysLeft < 0
            ? `Your ${shortName(soon.a)} pack should have run out ${-soon.r.daysLeft} day${soon.r.daysLeft === -1 ? '' : 's'} ago. Reorder now to avoid a gap.`
            : `Your ${shortName(soon.a)} pack lasts about ${soon.r.daysLeft} more day${soon.r.daysLeft === 1 ? '' : 's'}. Reorder by ${fmtDate(soon.r.reorderBy)} to avoid a gap.`}
          <span className="underline ml-1">{L("Refill planner")}</span>
        </Link>
      )}

      {p && (
        <section className="rounded-2xl bg-white border border-ink/10 p-5 space-y-3">
          {done ? <p className="font-medium text-moss">{L("Logged for today. See you tomorrow.")}</p> : <>
            <h2 className="font-bold">{L("Today's check-in")}</h2>
            <p className="text-sm text-ink/70">{L("Anything on your scalp or skin? Tap what applies.")}</p>
            <div className="flex flex-wrap gap-2">{EFFECTS.map(([k, l]) => <button key={k} aria-pressed={fx.includes(k)} onClick={() => setFx(fx.includes(k) ? fx.filter((x) => x !== k) : [...fx, k])} className={`px-4 py-2 rounded-full border min-h-[44px] ${fx.includes(k) ? 'bg-moss text-paper border-moss' : 'border-ink/25'}`}>{L(l)}</button>)}</div>
            {(fx.includes('itch') || fx.includes('red')) && <p className="text-sm rounded-lg bg-amber/20 p-3">{L("If this keeps happening or gets worse, check the pack label and talk to a doctor or pharmacist.")}</p>}
            <button className="btn btn-primary disabled:opacity-50" disabled={busy} onClick={() => log(t0, fx)}>{L("I used it today (+10 points)")}</button>
          </>}
          {missedY && <button className="text-sm underline block" disabled={busy} onClick={() => log(y, [])}>{L("Forgot to log yesterday? Add it")}</button>}
          {msg && <p role="alert" className="text-sm text-red-700">{msg}</p>}
          {!canStore && <p className="text-xs text-ink/60">Your check-ins are saved on this device only. <Link to="/settings" className="underline">Allow storing them</Link> to keep them across devices.</p>}
        </section>
      )}

      <div className="flex gap-1 h-10 items-end" aria-label="Last 28 days">
        {Array.from({ length: 28 }).map((_, i) => {
          const s = addDays(t0, -(27 - i)), c = checkins.find((x) => x.date === s)
          return <div key={i} title={s} className={`flex-1 rounded-sm ${c ? (c.effects?.some((e) => e !== 'none') ? 'bg-amber h-full' : 'bg-moss h-full') : 'bg-ink/10 h-3'}`} />
        })}
      </div>
      <p className="text-xs text-ink/50">{L("Green: used. Amber: used with a side effect noted. This tracks a routine and is not medical advice.")}</p>
    </main>
  )
}