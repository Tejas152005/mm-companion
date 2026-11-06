import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { getDemo, startDemo, endDemo, setDemoLang } from './demo'
import { setCurrentLang } from './i18n'
const Ctx = createContext(null)
export const useSession = () => useContext(Ctx)

// Magic links come back as #error=...&error_description=... (or ?error=...) when the link is
// expired, already used, or opened somewhere Supabase can't match it. Surface that instead of
// silently landing back on the sign-in screen with no explanation.
function readLinkError() {
  const src = window.location.hash ? window.location.hash.slice(1) : window.location.search.slice(1)
  const p = new URLSearchParams(src)
  const err = p.get('error_description') || p.get('error')
  if (err) { window.history.replaceState(null, '', window.location.pathname); return decodeURIComponent(err).replace(/\+/g, ' ') }
  return ''
}

export function SessionProvider({ children }) {
  // profile: undefined = not loaded yet, null = signed in but no row, object = loaded
  const [user, setUser] = useState(null), [profile, setProfile] = useState(undefined)
  const [demo, setDemo] = useState(getDemo()), [loading, setLoading] = useState(true)
  const [guestLang, setGuestLang] = useState('en')
  const [linkError, setLinkError] = useState(readLinkError)
  const loadProfile = useCallback(async (u) => {
    if (!u || !supabase) return setProfile(null)
    const { data } = await supabase.from('profiles').select('*').eq('id', u.id).single()
    setProfile(data ?? null)
  }, [])
  useEffect(() => {
    if (!supabase) return setLoading(false)
    // Rely on onAuthStateChange's INITIAL_SESSION event (fired once on load, after Supabase has had
    // a chance to read a magic-link token from the URL) instead of a separate getSession() call.
    // Calling getSession() directly here could resolve before that token is processed and briefly
    // report "signed out", which is the kind of race that makes a fresh sign-in look like it failed.
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setUser(s?.user ?? null)
      if (s?.user) { setProfile((p) => (p && p.id === s.user.id ? p : undefined)); loadProfile(s.user) }
      else setProfile(null)
      if (event === 'SIGNED_IN') setLinkError('')
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') setLoading(false)
    })
    // Safety net: if no auth event fires within a couple of seconds (e.g. no network), stop showing "Loading…".
    const t = setTimeout(() => setLoading(false), 2500)
    return () => { sub.subscription.unsubscribe(); clearTimeout(t) }
  }, [loadProfile])
  const lang = demo?.language || profile?.language || guestLang
  setCurrentLang(lang) // lets every page call L('...') without its own hook
  const setLang = async (l) => {
    setGuestLang(l)
    if (demo) { setDemoLang(l); setDemo(getDemo()) }
    else if (user && supabase) { await supabase.from('profiles').update({ language: l }).eq('id', user.id); loadProfile(user) }
  }
  const value = {
    user, profile, demo, lang, setLang, loading, linkError, clearLinkError: () => setLinkError(''), reloadProfile: () => loadProfile(user),
    enterDemo: () => setDemo(startDemo(guestLang)), // keeps the language picked on the welcome screen
    signOut: async () => { if (demo) { endDemo(); setDemo(null) } else if (supabase) await supabase.auth.signOut() },
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
