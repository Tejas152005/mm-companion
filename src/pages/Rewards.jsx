import { useState } from 'react'
import { useRewards } from '../lib/rewards'
import { L, Lf } from '../lib/i18n'
import { fmtDate, iso } from '../lib/plan'
import { POINTS, REWARDS, tierFor } from '../lib/offers'

const card = 'rounded-2xl bg-white border border-ink/10 p-5 space-y-3'
const MSG = { ok: 'Code applied. Points added.', invalid: "That code doesn't exist.", own: "That's your own code.", already: "You've already used a friend's code." }

export default function Rewards() {
  const rw = useRewards()
  const [friend, setFriend] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  if (!rw.loaded) return <p className="p-6">Loading…</p>
  const tier = tierFor(rw.sum.earned)
  const link = `${window.location.origin}/?ref=${rw.code}`
  const run = async (fn, ok) => { setBusy(true); setMsg(''); const r = await fn(); setBusy(false); setMsg(ok ? ok(r) : ''); return r }
  const share = async () => {
    const text = `${L('Your referral code')}: ${rw.code}`
    try { if (navigator.share) { await navigator.share({ title: 'Man Matters Companion (concept)', text, url: link }); return } } catch { return }
    try { await navigator.clipboard.writeText(link); setMsg(L('Copy link') + ' ✓') } catch { setMsg(link) }
  }
  return (
    <main className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-bold">{L('Rewards')}</h1>
      {rw.error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm">{rw.error}</p>}

      <section className="rounded-3xl bg-ink text-paper p-6">
        <p className="text-paper/70 text-sm">{L('Your points')}</p>
        <p className="text-5xl font-bold leading-none mt-1">{rw.sum.balance}</p>
        <p className="mt-3 text-sm">{L(tier.name)}{tier.next ? ` → ${L(tier.next.name)} (${tier.next.at})` : ''}</p>
        <div className="h-2 rounded-full bg-paper/15 mt-2" role="img" aria-label={`${Math.round(tier.pct * 100)}%`}><div className="h-2 rounded-full bg-amber" style={{ width: `${tier.pct * 100}%` }} /></div>
      </section>

      <section className={card}>
        <h2 className="font-bold">{L('How you earn points')}</h2>
        <ul className="text-sm space-y-1">
          <li className="flex justify-between"><span>{L('Daily check-in')}</span><b>+{POINTS.checkin}</b></li>
          <li className="flex justify-between"><span>{L('Weekly rating')}</span><b>+{POINTS.rating}</b></li>
          <li className="flex justify-between"><span>{L('Progress photo')}</span><b>+{POINTS.photo}</b></li>
          <li className="flex justify-between"><span>{L('A friend joins with your code')}</span><b>+{POINTS.referrer}</b></li>
          <li className="flex justify-between"><span>{L("You join with a friend's code")}</span><b>+{POINTS.referee}</b></li>
        </ul>
      </section>

      <section className={card}>
        <h2 className="font-bold">{L('Rewards you can redeem')}</h2>
        <ul className="space-y-2">
          {REWARDS.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 p-3">
              <p className="text-sm"><b>{L(r.title)}</b><br /><span className="text-ink/60">{r.cost} {L('points')} · {L('Concept offer')}</span></p>
              <button className="btn btn-primary !w-auto px-4 disabled:opacity-50" disabled={busy || rw.sum.balance < r.cost}
                onClick={() => run(() => rw.redeem(r.id), (x) => (x.error ? (x.error === 'balance' ? L('Not enough points') : L('We could not save that. Check your connection and try again.')) : ''))}>
                {rw.sum.balance < r.cost ? L('Not enough points') : L('Redeem')}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-ink/60">{L("Concept rewards. Codes can't be used at Man Matters.")}</p>
        {rw.history.length > 0 && (
          <div className="border-t border-ink/10 pt-3 space-y-1">
            <h3 className="font-medium text-sm">{L('Your redemptions')}</h3>
            {rw.history.map((h) => (
              <p key={h.id} className="text-sm flex justify-between"><span>{L(REWARDS.find((r) => r.id === h.reward_id)?.title || h.reward_id)}</span>
                <span className="text-ink/60">MMC-{String(h.id).slice(-5)} · {fmtDate(iso(new Date(h.created_at)))}</span></p>
            ))}
          </div>
        )}
      </section>

      <section className={card}>
        <h2 className="font-bold">{L('Your referral code')}</h2>
        <p className="text-3xl font-bold tracking-widest">{rw.code}</p>
        <p className="text-sm text-ink/70">{Lf('Friends joined: {n}', { n: rw.sum.referred })}</p>
        <div className="flex gap-2"><button className="btn btn-primary" onClick={share}>{L('Share my code')}</button></div>
        <div className="border-t border-ink/10 pt-3 space-y-2">
          <label className="block text-sm font-medium">{L("Have a friend's code?")}
            <input value={friend} onChange={(e) => setFriend(e.target.value.toUpperCase())} maxLength={12} className="w-full rounded-xl border border-ink/25 bg-white px-4 py-3 min-h-[48px] mt-1 font-normal tracking-widest" /></label>
          <button className="btn btn-ghost disabled:opacity-50" disabled={busy || friend.length < 4}
            onClick={() => run(() => rw.claim(friend), (x) => (MSG[x] ? L(MSG[x]) : L('We could not save that. Check your connection and try again.')))}>{L('Apply code')}</button>
        </div>
      </section>
      {msg && <p role="status" className="text-sm text-moss">{msg}</p>}
      <p className="text-xs text-ink/50">{L('This tracks a routine and is not medical advice. Concept app, not official Man Matters.')}</p>
    </main>
  )
}
