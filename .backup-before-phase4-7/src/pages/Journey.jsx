import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../lib/data'
import { today, addDays, diffDays, fmtDate, stages, weeklyAdherence, streak, shortName } from '../lib/plan'

// General habit guidance only. No promises about results.
const COPY = {
  start: ['Day one', 'Get the routine into your day. There is nothing to see yet, and that is normal.'],
  settle: ['Settling in', 'Keep going. If your scalp or skin reacts, check the pack label and ask a pharmacist or doctor.'],
  half: ['Halfway to the usual window', 'This is where many people drift away. Your consistency matters more than anything else right now.'],
  late: ['Nearly there', 'Look back at how consistent you have been. That is the part you control.'],
  judge: ['The usual review point', 'Decide with your own record: how steady were you, and how did your skin feel? A doctor can help you choose what comes next.'],
}

export default function Journey() {
  const { ready, active, checkins } = useData()
  const [sel, setSel] = useState(0)
  if (!ready) return <p className="p-6">Loading…</p>
  if (!active.length) return (
    <main className="px-5 pt-6 space-y-3">
      <h1 className="text-2xl font-bold">Your journey</h1>
      <p className="text-ink/70">Add a product to see what to expect, week by week.</p>
      <Link to="/routine" className="btn btn-primary block text-center">Set up my routine</Link>
    </main>
  )
  const p = active[Math.min(sel, active.length - 1)]
  const t0 = today(), days = Math.max(0, diffDays(p.started_on, t0)), wks = p.weeks_to_notice
  const st = stages(wks).map((s) => ({ ...s, on: addDays(p.started_on, s.week * 7), done: days >= s.week * 7 }))
  const cur = st.findIndex((s) => !s.done)
  const weeks = weeklyAdherence(checkins, p.started_on, t0)
  const tn = weeks.reduce((a, w) => a + w.n, 0), td = weeks.reduce((a, w) => a + w.days, 0)
  const fxDays = checkins.filter((c) => c.date >= p.started_on && c.effects?.some((e) => e !== 'none')).length

  return (
    <main className="px-5 pt-6 space-y-6">
      <h1 className="text-2xl font-bold">Your journey</h1>
      {active.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Product">
          {active.map((a, i) => <button key={a.id} aria-pressed={i === sel} onClick={() => setSel(i)} className={`px-3 py-1.5 rounded-full text-sm border ${i === sel ? 'bg-ink text-paper border-ink' : 'border-ink/25'}`}>{shortName(a)}</button>)}
        </div>
      )}

      <section className="rounded-2xl bg-white border border-ink/10 p-5 space-y-3">
        <div>
          <h2 className="font-bold">Your consistency</h2>
          <p className="text-sm text-ink/70">{td ? `You logged ${tn} of ${td} tracked days (${Math.round((100 * tn) / td)}%). Current streak: ${streak(checkins)}.` : 'Log your first check-in to start this chart.'}</p>
        </div>
        <div className="flex gap-1 h-28" aria-label="Check-ins logged per week">
          {weeks.map((w) => (
            <div key={w.week} className="flex-1 flex items-end" title={w.days ? `Week ${w.week}: ${w.n} of ${w.days} days` : `Week ${w.week}: not tracked here`}>
              <div className={`w-full rounded-sm ${w.days ? (w.n / w.days >= 0.8 ? 'bg-moss' : 'bg-amber') : 'bg-ink/10'}`} style={{ height: w.days ? `${Math.max(6, (100 * w.n) / w.days)}%` : '6%' }} />
            </div>
          ))}
        </div>
        <div className="flex gap-1 text-[10px] text-ink/50">{weeks.map((w) => <span key={w.week} className="flex-1 text-center">{w.week % 4 === 0 ? w.week : ''}</span>)}</div>
        <p className="text-xs text-ink/60">One bar per week since you started. Green: logged on most days. Amber: fewer. Grey: before you began tracking here, so we don't guess.</p>
      </section>

      <section>
        <h2 className="font-bold mb-1">What to expect, week by week</h2>
        <p className="text-sm text-ink/70 mb-4">People usually wait about {wks} weeks before judging {shortName(p).toLowerCase()}. Everyone is different. These checkpoints are about the routine, not a promise of results.</p>
        <ol className="relative border-l-2 border-ink/15 ml-3 space-y-6">
          {st.map((s, i) => (
            <li key={s.key} className="pl-6 relative" aria-current={i === cur ? 'step' : undefined}>
              <span className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 ${s.done ? 'bg-moss border-moss' : i === cur ? 'bg-amber border-amber' : 'bg-paper border-ink/30'}`} />
              <p className="text-xs text-ink/60">{s.week === 0 ? 'Start' : `Week ${s.week}`} · {fmtDate(s.on)}{i === cur ? ' · you are here' : ''}</p>
              <h3 className="font-bold">{COPY[s.key][0]}</h3>
              <p className="text-sm text-ink/70">{COPY[s.key][1]}</p>
            </li>
          ))}
        </ol>
      </section>

      {fxDays > 0 && <p className="rounded-xl bg-amber/20 p-4 text-sm">You noted a side effect on {fxDays} day{fxDays === 1 ? '' : 's'} since you started. If it keeps happening or gets worse, check the pack label and talk to a doctor or pharmacist.</p>}
      <p className="text-xs text-ink/50">This tracks a routine and is not medical advice.</p>
    </main>
  )
}