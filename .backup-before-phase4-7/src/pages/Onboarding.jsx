import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { t } from '../lib/i18n'
import { today, SOURCES, PURPOSES } from '../lib/plan'
const CONCERNS = [['hair_thinning', 'Hair thinning'], ['dandruff', 'Dandruff'], ['beard', 'Beard growth'], ['supplements', 'Supplements']]
const PRODUCTS = [['minoxidil-hair', 'Hair regrowth solution'], ['minoxidil-beard', 'Beard growth solution'], ['hair-gummies', 'Hair gummies'], ['anti-dandruff-shampoo', 'Anti-dandruff shampoo']]
export default function Onboarding() {
  const nav = useNavigate(); const { user, lang, reloadProfile } = useSession()
  const [step, setStep] = useState(0), [name, setName] = useState('')
  const [concerns, setConcerns] = useState([]), [prods, setProds] = useState([]), [student, setStudent] = useState(false)
  const [startedOn, setStartedOn] = useState(today()), [source, setSource] = useState(null)
  const [consent, setConsent] = useState({ account: true }), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const tog = (arr, set, v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const finish = async () => {
    setBusy(true); setErr('')
    try {
      const c = await supabase.from('consents').insert(PURPOSES.map(([p]) => ({ user_id: user.id, purpose: p, granted: !!consent[p] })))
      if (c.error) throw c.error
      // Only add products that aren't saved yet, so retrying after a failure never creates duplicates.
      const have = await supabase.from('user_products').select('product_id').eq('user_id', user.id)
      if (have.error) throw have.error
      const fresh = prods.filter((p) => !have.data.some((h) => h.product_id === p))
      if (fresh.length) {
        const u = await supabase.from('user_products').insert(fresh.map((p) => ({ user_id: user.id, product_id: p, started_on: startedOn, source })))
        if (u.error) throw u.error
      }
      const { error } = await supabase.from('profiles').upsert({ id: user.id, display_name: name.trim(), concerns, is_student: student, language: lang, onboarded_at: new Date().toISOString() })
      if (error) throw error
      await reloadProfile(); nav('/home')
    } catch { setErr('We could not save your setup. Check your connection and try again.') } finally { setBusy(false) }
  }
  const chip = (on) => `px-4 py-2 rounded-full border min-h-[44px] ${on ? 'bg-moss text-paper border-moss' : 'border-ink/25 bg-white'}`
  const field = 'w-full rounded-xl border border-ink/25 bg-white px-4 py-3 min-h-[48px]'
  const back = (n) => <button className="btn btn-ghost" onClick={() => setStep(n)}>Back</button>
  return (
    <main className="px-6 pt-8 pb-8">
      {step === 0 && <section className="space-y-5">
        <h1 className="text-2xl font-bold">What should we call you?</h1>
        <input aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
        <h2 className="font-medium">What are you working on?</h2>
        <div className="flex flex-wrap gap-2">{CONCERNS.map(([k, v]) => <button key={k} aria-pressed={concerns.includes(k)} onClick={() => tog(concerns, setConcerns, k)} className={chip(concerns.includes(k))}>{v}</button>)}</div>
        <label className="flex items-center gap-3"><input type="checkbox" checked={student} onChange={(e) => setStudent(e.target.checked)} className="h-5 w-5" /> I'm a college student (ID check comes later)</label>
        <button className="btn btn-primary disabled:opacity-50" disabled={!name.trim()} onClick={() => setStep(1)}>{t(lang, 'next')}</button></section>}
      {step === 1 && <section className="space-y-5">
        <h1 className="text-2xl font-bold">What are you using?</h1>
        <p className="text-ink/70">Bought on Amazon or elsewhere? That's fine. Pick what's in your routine.</p>
        <div className="flex flex-wrap gap-2">{PRODUCTS.map(([k, v]) => <button key={k} aria-pressed={prods.includes(k)} onClick={() => tog(prods, setProds, k)} className={chip(prods.includes(k))}>{v}</button>)}</div>
        {prods.length > 0 && <>
          <label className="block font-medium">When did you start?
            <input type="date" max={today()} value={startedOn} onChange={(e) => setStartedOn(e.target.value || today())} className={`${field} mt-1 font-normal`} /></label>
          <div><p className="font-medium">Where did you buy it?</p>
            <div className="flex flex-wrap gap-2 mt-1">{SOURCES.map(([k, l]) => <button key={k} aria-pressed={source === k} onClick={() => setSource(source === k ? null : k)} className={chip(source === k)}>{l}</button>)}</div></div>
          <p className="text-xs text-ink/60">You can change all of this later under Routine.</p></>}
        <div className="space-y-3"><button className="btn btn-primary" onClick={() => setStep(2)}>{t(lang, 'next')}</button>{back(0)}</div></section>}
      {step === 2 && <section className="space-y-4">
        <h1 className="text-2xl font-bold">{t(lang, 'consentTitle')}</h1>
        <p className="text-sm text-ink/70">Each choice is separate and you can change it later in Settings. This app helps you track a routine. It does not give medical advice.</p>
        {PURPOSES.map(([p, label, req, why]) => (
          <label key={p} className="flex gap-3 items-start rounded-xl bg-white border border-ink/15 p-3">
            <input type="checkbox" className="h-5 w-5 mt-1" disabled={req} checked={!!consent[p]} onChange={(e) => setConsent({ ...consent, [p]: e.target.checked })} />
            <span><span className="font-medium block">{label}{req && ' (required)'}</span><span className="text-sm text-ink/70">{why}</span></span></label>))}
        {err && <p role="alert" className="text-red-700 text-sm">{err}</p>}
        <button className="btn btn-primary disabled:opacity-50" disabled={busy} onClick={finish}>{t(lang, 'finish')}</button>
        {back(1)}</section>}
    </main>
  )
}