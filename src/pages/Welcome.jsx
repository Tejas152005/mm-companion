import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSession } from '../lib/session'
import { LANGS, t } from '../lib/i18n'
export default function Welcome() {
  const { lang, setLang, enterDemo, linkError, clearLinkError } = useSession()
  const [email, setEmail] = useState(''), [sent, setSent] = useState(false), [err, setErr] = useState('')
  const send = async (e) => {
    e.preventDefault(); setErr(''); clearLinkError()
    if (!supabase) return setErr('Supabase keys are missing in .env. Demo Mode still works.')
    const { error } = await supabase.auth.signInWithOtp({ email, options:{ emailRedirectTo: window.location.origin } })
    error ? setErr(error.message) : setSent(true)
  }
  return (
    <main className="px-6 pt-10 pb-8 flex flex-col min-h-screen">
      <div className="flex gap-2 mb-10" role="group" aria-label="Language">
        {Object.entries(LANGS).map(([k,v]) => (
          <button key={k} onClick={()=>setLang(k)} aria-pressed={lang===k}
            className={`px-3 py-1.5 rounded-full text-sm border ${lang===k?'bg-ink text-paper border-ink':'border-ink/25'}`}>{v}</button>))}
      </div>
      <h1 className="text-4xl font-bold leading-tight tracking-tight">{t(lang,'tagline')}</h1>
      <p className="mt-3 text-ink/70">{t(lang,'concept')}</p>
      {linkError && <p role="alert" className="mt-4 rounded-xl bg-amber/20 px-4 py-3 text-sm">{linkError} Request a new sign-in link below.</p>}
      <form onSubmit={send} className="mt-10 space-y-3">
        <label className="block text-sm font-medium" htmlFor="em">{t(lang,'email')}</label>
        <input id="em" type="email" required value={email} onChange={e=>setEmail(e.target.value)}
          className="w-full rounded-xl border border-ink/25 bg-white px-4 py-3 min-h-[48px]"/>
        <button className="btn btn-primary" disabled={sent}>{t(lang,'sendLink')}</button>
        {sent && <p role="status" className="text-moss">{t(lang,'checkMail')}</p>}
        {err && <p role="alert" className="text-red-700 text-sm">{err}</p>}
      </form>
      <div className="mt-auto pt-10"><button onClick={enterDemo} className="btn btn-ghost">{t(lang,'tryDemo')}</button></div>
    </main>
  )
}
