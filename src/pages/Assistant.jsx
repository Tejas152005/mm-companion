import { useRef, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { useData } from '../lib/data'
import { L } from '../lib/i18n'
import { today, diffDays, shortName } from '../lib/plan'

// Demo Mode answers are pre-written, so a reviewer can never hit a broken or abusable server call.
const CANNED = [
  ['When will I see results?', 'Many people wait about 12 to 16 weeks before judging. Your pack label is the guide for your product. Until then, your consistency is the part you can track.'],
  ['My scalp feels dry. What should I do?', 'Check your pack label. Dryness is worth asking a pharmacist or doctor about, especially if it lasts or gets worse. Note it in your daily check-in so you have a record to show them.'],
  ['I missed a few days. Should I double up?', "Don't double up unless your pack label or doctor says so. Pick your usual routine back up, and set a reminder so tomorrow is easier."],
  ['Is it worth carrying on?', "That's your call. The Journey tab shows how steady you've been. The usual review point is a good moment to check in with a doctor or pharmacist."],
  ['How do I reorder on time?', "Open Routine, then Refill & cost, and enter how long a pack lasts. We'll show a reorder-by date and can add it to your calendar."],
]
const ERR = { limit: 'You have reached today\'s limit for questions. Please try again tomorrow.', consent: 'The assistant is switched off in your Settings.', auth: 'Please sign in again.' }

export default function Assistant() {
  const { demo, lang } = useSession()
  const { ready, active, checkins, consent, setConsentFor } = useData()
  const [msgs, setMsgs] = useState([]), [text, setText] = useState(''), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const end = useRef(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [msgs, busy])
  if (!ready) return <p className="p-6">Loading…</p>

  const context = () => {
    const t0 = today(), last14 = checkins.filter((c) => diffDays(c.date, t0) < 14 && c.applied).length
    const fx = checkins.filter((c) => c.effects?.some((e) => e !== 'none')).length
    return active.map((p) => `${shortName(p)}: day ${Math.max(0, diffDays(p.started_on, t0))}, ${p.times_per_day}x a day`).join('; ') + `. Check-ins in the last 14 days: ${last14}. Days with a side effect noted: ${fx}.`
  }

  const ask = async (q, canned) => {
    const question = q.trim()
    if (!question || busy) return
    setErr(''); setText('')
    const next = [...msgs, { role: 'user', content: question }]
    setMsgs(next)
    if (demo) { setMsgs([...next, { role: 'assistant', content: canned ? L(canned) : L("That's a good question for a pharmacist or doctor. In Demo Mode I can only answer the sample questions above.") }]); return }
    setBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const r = await fetch('/api/assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` },
        body: JSON.stringify({ messages: next, lang, context: context() }),
      })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.reply) { setErr(ERR[j.error] || 'We could not reach the assistant. On your own computer, the assistant only works with "vercel dev" or on the deployed link.'); setMsgs(msgs) }
      else setMsgs([...next, { role: 'assistant', content: j.reply }])
    } catch { setErr('We could not reach the assistant. On your own computer, the assistant only works with "vercel dev" or on the deployed link.'); setMsgs(msgs) }
    setBusy(false)
  }

  const needsConsent = !demo && !consent.ai_assistant
  return (
    <main className="px-5 pt-6 space-y-4">
      <h1 className="text-2xl font-bold">{L('Ask a question')}</h1>
      <p className="text-xs text-ink/60">{L('The assistant gives general routine help, not medical advice. Ask a pharmacist or doctor about health concerns.')}</p>
      {demo && <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm">{L('Demo Mode: these answers are pre-written.')}</p>}

      {needsConsent ? (
        <section className="rounded-2xl bg-white border border-ink/10 p-5 space-y-3">
          <p className="text-sm">{L('To chat, allow the assistant to read your routine. You can turn this off in Settings.')}</p>
          <button className="btn btn-primary disabled:opacity-50" disabled={busy} onClick={async () => { setBusy(true); await setConsentFor('ai_assistant', true); setBusy(false) }}>{L('Allow the assistant')}</button>
        </section>
      ) : (
        <>
          {msgs.length === 0 && (
            <section className="space-y-2">
              <p className="text-sm font-medium">{L('Try one of these')}</p>
              <div className="flex flex-wrap gap-2">{CANNED.map(([q, a]) => <button key={q} onClick={() => ask(L(q), a)} className="px-4 py-2 rounded-full border border-ink/25 bg-white text-sm text-left">{L(q)}</button>)}</div>
            </section>
          )}
          <ul className="space-y-3" aria-live="polite">
            {msgs.map((m, i) => (
              <li key={i} className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${m.role === 'user' ? 'bg-moss text-paper ml-10' : 'bg-white border border-ink/10 mr-6'}`}>{m.content}</li>
            ))}
            {busy && <li className="text-sm text-ink/60">…</li>}
          </ul>
          {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
          <div ref={end} />
          <div className="flex gap-2">
            <input value={text} maxLength={500} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ask(text) }} aria-label={L('Ask a question')}
              className="flex-1 rounded-xl border border-ink/25 bg-white px-4 py-3 min-h-[48px]" />
            <button className="btn btn-primary !w-auto px-5 disabled:opacity-50" disabled={busy || !text.trim()} onClick={() => ask(text)}>{L('Send')}</button>
          </div>
        </>
      )}
    </main>
  )
}
