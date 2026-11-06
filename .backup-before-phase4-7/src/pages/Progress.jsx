import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '../lib/session'
import { useData } from '../lib/data'
import { useProgress, weekOf } from '../lib/progress'
import { today, diffDays, fmtDate, shortName, download } from '../lib/plan'

const AREAS = [['crown', 'Crown'], ['hairline', 'Hairline'], ['beard', 'Beard'], ['other', 'Other']]
const EFFECTS = { itch: 'Itchy', dry: 'Dry or tight', red: 'Redness' }
const NOTICED = ['Nothing yet', 'Not sure', 'A little', 'Fairly clear', 'Clearly']
const EASE = ['Hard', 'Tricky', 'Okay', 'Easy', 'Very easy']
const MAX_PHOTOS = 60
const chip = (on) => `px-4 py-2 rounded-full border min-h-[44px] text-sm ${on ? 'bg-moss text-paper border-moss' : 'border-ink/25 bg-white'}`
const card = 'rounded-2xl bg-white border border-ink/10 p-5 space-y-4'

function ConsentAsk({ text, label, onAllow }) {
  const [busy, setBusy] = useState(false)
  return (
    <div className="rounded-xl bg-amber/20 p-4 space-y-2 text-sm">
      <p>{text}</p>
      <button className="btn btn-primary disabled:opacity-50" disabled={busy} onClick={async () => { setBusy(true); await onAllow(); setBusy(false) }}>{label}</button>
      <p className="text-xs text-ink/60">You can turn this off again in Settings.</p>
    </div>
  )
}

function Photos({ pr, startedOn }) {
  const [area, setArea] = useState('crown'), [busy, setBusy] = useState(false), [msg, setMsg] = useState(''), [ask, setAsk] = useState(null), [allAsk, setAllAsk] = useState(false)
  const input = useRef(null)
  const mine = pr.photos.filter((p) => p.area === area)
  const first = mine[0], last = mine[mine.length - 1]
  const day = (p) => (startedOn && diffDays(startedOn, p.taken_on) >= 0 ? ` · Day ${diffDays(startedOn, p.taken_on)}` : '')
  const onFile = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setBusy(true); setMsg('')
    const r = await pr.addPhoto(f, area)
    setBusy(false)
    setMsg(r.error ? (r.error === 'format' ? 'We could not read that photo. Try a JPEG or PNG.' : 'We could not save that photo. Check your connection and try again.') : 'Photo added.')
  }
  const del = async (p) => { setBusy(true); const r = await pr.deletePhoto(p); setBusy(false); setAsk(null); setMsg(r.error ? 'We could not delete that. Try again.' : 'Photo deleted.') }
  const delAll = async () => { setBusy(true); const r = await pr.deleteAll(); setBusy(false); setAllAsk(false); setMsg(r.error ? 'We could not delete your photos. Try again.' : 'All your photos were deleted.') }
  return (
    <section className={card}>
      <div>
        <h2 className="font-bold">Progress photos</h2>
        <p className="text-sm text-ink/70">Hair changes slowly, so a photo every few weeks shows more than a mirror does. Use the same light, spot and angle each time. Photos are private to you.</p>
      </div>
      {!pr.canPhotos ? (
        <ConsentAsk text="To keep photos, allow us to store them in your private account space." label="Allow storing my photos" onAllow={() => pr.allow('photo_storage')} />
      ) : (
        <>
          <div role="group" aria-label="Photo area" className="flex flex-wrap gap-2">
            {AREAS.map(([k, l]) => <button key={k} aria-pressed={area === k} onClick={() => setArea(k)} className={chip(area === k)}>{l}</button>)}
          </div>
          <input ref={input} type="file" accept="image/*" onChange={onFile} className="hidden" aria-label="Choose a photo" />
          <button className="btn btn-primary disabled:opacity-50" disabled={busy || pr.photos.length >= MAX_PHOTOS} onClick={() => input.current?.click()}>{busy ? 'Working…' : `Add a ${area === 'other' ? '' : AREAS.find((a) => a[0] === area)[1].toLowerCase() + ' '}photo`}</button>
          {pr.photos.length >= MAX_PHOTOS && <p className="text-sm text-ink/70">You have reached {MAX_PHOTOS} photos. Delete some to add more.</p>}
        </>
      )}
      {msg && <p role="status" className="text-sm text-moss">{msg}</p>}

      {mine.length >= 2 && (
        <div className="space-y-2">
          <h3 className="font-medium text-sm">First and latest</h3>
          <div className="grid grid-cols-2 gap-2">
            {[first, last].map((p, i) => (
              <figure key={p.id}>
                {p.url ? <img src={p.url} alt={`${i ? 'Latest' : 'First'} ${area} photo, ${fmtDate(p.taken_on)}`} className="w-full aspect-[3/4] object-cover rounded-xl bg-ink/10" /> : <div className="w-full aspect-[3/4] rounded-xl bg-ink/10" />}
                <figcaption className="text-xs text-ink/60 mt-1">{i ? 'Latest' : 'First'} · {fmtDate(p.taken_on)}{day(p)}</figcaption>
              </figure>
            ))}
          </div>
          <p className="text-xs text-ink/60">Light, hair length and wet or dry hair all change how a photo looks. This is a visual record, not a measurement or a promised result.</p>
        </div>
      )}
      {mine.length === 1 && <p className="text-sm text-ink/70">Add one more later and we'll show them side by side.</p>}
      {mine.length === 0 && pr.canPhotos && <p className="text-sm text-ink/70">No {AREAS.find((a) => a[0] === area)[1].toLowerCase()} photos yet. A first photo today gives you something to compare with later.</p>}

      {mine.length > 0 && (
        <ul className="grid grid-cols-3 gap-2">
          {[...mine].reverse().map((p) => (
            <li key={p.id} className="space-y-1">
              {p.url ? <img src={p.url} alt={`${area} photo, ${fmtDate(p.taken_on)}`} className="w-full aspect-square object-cover rounded-lg bg-ink/10" /> : <div className="w-full aspect-square rounded-lg bg-ink/10" />}
              <p className="text-[11px] text-ink/60">{fmtDate(p.taken_on)}</p>
              {ask === p.id ? (
                <span className="flex gap-2 text-xs"><button className="underline text-red-700" disabled={busy} onClick={() => del(p)}>Delete</button><button className="underline" onClick={() => setAsk(null)}>Keep</button></span>
              ) : <button className="text-xs underline" onClick={() => setAsk(p.id)}>Delete</button>}
            </li>
          ))}
        </ul>
      )}
      {pr.photos.length > 0 && (allAsk ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-2 text-sm">
          <p>Delete all {pr.photos.length} photos? This can't be undone.</p>
          <button className="btn bg-red-700 text-white disabled:opacity-50" disabled={busy} onClick={delAll}>Yes, delete all photos</button>
          <button className="btn btn-ghost" onClick={() => setAllAsk(false)}>Cancel</button>
        </div>
      ) : <button className="text-sm underline" onClick={() => setAllAsk(true)}>Delete all my photos</button>)}
    </section>
  )
}

function Scale({ label, words, value, onChange }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2 mt-1" role="group" aria-label={label}>
        {words.map((w, i) => <button key={w} aria-pressed={value === i + 1} onClick={() => onChange(i + 1)} className={chip(value === i + 1)}>{w}</button>)}
      </div>
    </div>
  )
}

function Rating({ pr, p }) {
  const wk = weekOf(), cur = pr.ratings.find((r) => r.product_id === p.product_id && r.week_of === wk)
  const [noticed, setNoticed] = useState(cur?.noticed || 0), [ease, setEase] = useState(cur?.ease || 0), [note, setNote] = useState(cur?.note || '')
  const [busy, setBusy] = useState(false), [msg, setMsg] = useState('')
  const past = pr.ratings.filter((r) => r.product_id === p.product_id)
  const save = async () => {
    setBusy(true); setMsg('')
    const r = await pr.saveRating({ product_id: p.product_id, week_of: wk, noticed, ease: ease || null, note: note.trim() })
    setBusy(false); setMsg(r.error ? 'We could not save that. Check your connection and try again.' : 'Saved for this week.')
  }
  return (
    <section className={card}>
      <div>
        <h2 className="font-bold">This week's check</h2>
        <p className="text-sm text-ink/70">Your own view of {shortName(p).toLowerCase()}, once a week. There are no right answers. Early on, "nothing yet" is normal.</p>
      </div>
      {!pr.canRate ? (
        <ConsentAsk text="To keep your weekly ratings, allow us to store your check-ins and ratings." label="Allow storing my ratings" onAllow={() => pr.allow('progress_tracking')} />
      ) : (
        <>
          <Scale label="Do you notice a change?" words={NOTICED} value={noticed} onChange={setNoticed} />
          <Scale label="How easy was the routine this week?" words={EASE} value={ease} onChange={setEase} />
          <label className="block text-sm font-medium">A note (optional)
            <textarea value={note} maxLength={280} rows={2} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-ink/25 bg-white px-4 py-3 mt-1 font-normal" />
          </label>
          <button className="btn btn-primary disabled:opacity-50" disabled={!noticed || busy} onClick={save}>{cur ? 'Update this week' : 'Save this week'}</button>
          {msg && <p role="status" className="text-sm text-moss">{msg}</p>}
        </>
      )}
      {past.length > 0 && (
        <div className="space-y-2 border-t border-ink/10 pt-4">
          <h3 className="font-medium text-sm">How it has felt, week by week</h3>
          <div className="flex gap-1 h-24 items-end" aria-label="Weekly ratings of how much change you noticed">
            {past.slice(-20).map((r) => (
              <div key={r.week_of} className="flex-1 rounded-sm bg-moss" style={{ height: `${r.noticed * 20}%` }} title={`Week of ${fmtDate(r.week_of)}: ${NOTICED[r.noticed - 1]}`} />
            ))}
          </div>
          <p className="text-xs text-ink/60">Taller bar means you noticed more change that week. This is your own opinion, not a measurement. Latest: {NOTICED[past[past.length - 1].noticed - 1].toLowerCase()} (week of {fmtDate(past[past.length - 1].week_of)}).</p>
        </div>
      )}
    </section>
  )
}

function Effects({ p, checkins }) {
  const [msg, setMsg] = useState('')
  const since = checkins.filter((c) => c.date >= p.started_on)
  const has = (c) => c.effects?.some((e) => EFFECTS[e])
  const logged = since.filter((c) => c.applied).length
  const noted = since.filter(has), early = noted.filter((c) => diffDays(p.started_on, c.date) < 14).length
  const counts = Object.keys(EFFECTS).map((k) => [k, since.filter((c) => c.effects?.includes(k)).length]).filter((x) => x[1] > 0)
  const last = noted.map((c) => c.date).sort().pop()
  const text = [
    'Routine summary from Man Matters Companion (a concept app, not medical advice)',
    `Product: ${shortName(p)}`,
    `Started: ${fmtDate(p.started_on)} (day ${Math.max(0, diffDays(p.started_on, today()))})`,
    `Times a day: ${p.times_per_day}`,
    `Check-ins logged: ${logged}`,
    `Days with something noted: ${noted.length}`,
    ...counts.map(([k, n]) => `- ${EFFECTS[k]}: ${n} day${n === 1 ? '' : 's'}`),
    `Noted in the first two weeks: ${early} day${early === 1 ? '' : 's'}`,
    `Most recent: ${last ? fmtDate(last) : 'none noted'}`,
    'These are my own notes, not a diagnosis.',
  ].join('\n')
  const share = async () => {
    try { await navigator.clipboard.writeText(text); setMsg('Copied. Paste it into a message or show it at your visit.') }
    catch { download('my-routine-summary.txt', text, 'text/plain'); setMsg('Downloaded as a text file.') }
  }
  return (
    <section className={card}>
      <div>
        <h2 className="font-bold">Skin and scalp notes</h2>
        <p className="text-sm text-ink/70">From the tags you add in your daily check-in, since you started {shortName(p).toLowerCase()}.</p>
      </div>
      {noted.length === 0 ? <p className="text-sm text-ink/70">Nothing noted so far across {logged} logged day{logged === 1 ? '' : 's'}.</p> : (
        <>
          <p className="text-sm">You noted something on <b>{noted.length}</b> of {logged} logged days{early ? `, ${early} of them in the first two weeks` : ''}. Most recent: {fmtDate(last)}.</p>
          <ul className="flex flex-wrap gap-2">{counts.map(([k, n]) => <li key={k} className="px-3 py-1.5 rounded-full bg-amber/20 text-sm">{EFFECTS[k]}: {n}</li>)}</ul>
        </>
      )}
      <p className="text-sm rounded-lg bg-amber/20 p-3">These are your own notes, not a diagnosis. If something feels severe, keeps getting worse, or you feel unwell, stop and talk to a doctor or pharmacist. Check your pack label too.</p>
      <button className="btn btn-ghost" onClick={share}>Copy a summary for my doctor or pharmacist</button>
      {msg && <p role="status" className="text-sm text-moss">{msg}</p>}
    </section>
  )
}

export default function Progress() {
  const { demo } = useSession()
  const { ready, active, checkins } = useData()
  const pr = useProgress()
  const [sel, setSel] = useState(0)
  if (!ready || !pr.loaded) return <p className="p-6">Loading…</p>
  const p = active[Math.min(sel, active.length - 1)]
  return (
    <main className="px-5 pt-5 space-y-5">
      <h1 className="text-2xl font-bold">Photos and ratings</h1>
      {demo && <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm">Demo Mode: photos stay in this tab and disappear when you refresh. The ratings are sample data.</p>}
      {pr.error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 px-4 py-3 text-sm">{pr.error}</p>}
      <Photos pr={pr} startedOn={active[0]?.started_on} />
      {!p ? (
        <section className={card}>
          <p className="text-sm text-ink/70">Add a product to start weekly ratings and skin and scalp notes.</p>
          <Link to="/routine" className="btn btn-primary block text-center">Set up my routine</Link>
        </section>
      ) : (
        <>
          {active.length > 1 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Product">
              {active.map((a, i) => <button key={a.id} aria-pressed={i === sel} onClick={() => setSel(i)} className={chip(i === sel)}>{shortName(a)}</button>)}
            </div>
          )}
          <Rating key={p.product_id} pr={pr} p={p} />
          <Effects p={p} checkins={checkins} />
        </>
      )}
      <p className="text-xs text-ink/50">This tracks a routine and is not medical advice. Concept app, not official Man Matters.</p>
    </main>
  )
}