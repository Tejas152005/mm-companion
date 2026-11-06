import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { SAMPLE } from '../lib/insights'
import { L } from '../lib/i18n'
import { SOURCES, REASONS } from '../lib/plan'

const card = 'rounded-2xl bg-white border border-ink/10 p-5 space-y-3'
const name = (list, k) => L((list.find((x) => x[0] === k) || [0, k])[1])

function Bars({ rows, label, fmt }) {
  const max = Math.max(...rows.map((r) => r.v), 0.0001)
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.l} className="text-sm">
          <div className="flex justify-between"><span>{label ? label(r) : r.l}</span><b>{fmt ? fmt(r.v) : r.v}</b></div>
          <div className="h-2 rounded-full bg-ink/10"><div className="h-2 rounded-full bg-moss" style={{ width: `${(100 * r.v) / max}%` }} /></div>
        </li>
      ))}
    </ul>
  )
}

export default function Dashboard() {
  const { demo } = useSession()
  const [data, setData] = useState(null), [sample, setSample] = useState(!!demo), [note, setNote] = useState('')
  useEffect(() => {
    if (demo || !supabase) { setData(SAMPLE); return }
    ;(async () => {
      const { data: d, error } = await supabase.rpc('brand_insights')
      if (error) { setNote(/not_allowed/.test(error.message) ? 'This view is only for the brand team. You can see sample data instead.' : 'We could not load the dashboard.'); setSample(true); setData(SAMPLE) }
      else setData(d)
    })()
  }, [demo])
  if (!data) return <p className="p-6">Loading…</p>
  const pct = (v) => `${Math.round(v * 100)}%`
  return (
    <main className="px-5 pt-6 space-y-5">
      <h1 className="text-2xl font-bold">{L('Brand view')}</h1>
      {sample && <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm">{L('Sample data, not real customers.')}</p>}
      {note && <p role="status" className="text-sm text-ink/70">{note}</p>}
      {!data.enough ? <p className="text-sm text-ink/70">{L('Only people who agreed to share anonymous trends are counted. Groups under 5 people are hidden.')} ({data.users})</p> : (
        <>
          <p className="text-sm text-ink/70">n = {data.users}. {L('Only people who agreed to share anonymous trends are counted. Groups under 5 people are hidden.')}</p>
          {data.sources?.length > 0 && <section className={card}><h2 className="font-bold">{L('Where customers buy')}</h2>
            <Bars rows={data.sources.map((s) => ({ l: s.k, v: s.n / data.sources.reduce((a, b) => a + b.n, 0) }))} label={(r) => name(SOURCES, r.l)} fmt={pct} /></section>}
          {data.reasons?.length > 0 && <section className={card}><h2 className="font-bold">{L('Why people stop')}</h2>
            <Bars rows={data.reasons.map((s) => ({ l: s.k, v: s.n }))} label={(r) => name(REASONS, r.l)} /></section>}
          {data.retention?.length > 0 && <section className={card}><h2 className="font-bold">{L('Still using it, by week')}</h2>
            <Bars rows={data.retention.filter((r) => r.pct != null).map((r) => ({ l: `W${r.week}`, v: r.pct }))} fmt={pct} /></section>}
          {data.early_effects && data.early_effects.pct != null && <section className={card}><h2 className="font-bold">{L('Skin or scalp notes in the first two weeks')}</h2>
            <p className="text-3xl font-bold">{pct(data.early_effects.pct)}</p><p className="text-xs text-ink/60">n = {data.early_effects.n}</p></section>}
          {data.noticed?.length > 0 && <section className={card}><h2 className="font-bold">{L('Noticed change, by week since start')}</h2>
            <Bars rows={data.noticed.map((r) => ({ l: `W${r.week}`, v: Number(r.avg) }))} fmt={(v) => v.toFixed(1) + ' / 5'} /></section>}
        </>
      )}
      <p className="text-xs text-ink/50">{L('This tracks a routine and is not medical advice. Concept app, not official Man Matters.')}</p>
    </main>
  )
}
