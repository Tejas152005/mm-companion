// One data layer for every signed-in screen. Real accounts use Supabase; Demo Mode uses localStorage.
// Check-ins reach the server only while the "progress_tracking" consent is granted. Otherwise they stay on this device.
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './session'
import { CATALOGUE, getDemoData, saveDemoData } from './demo'
import { today, download } from './plan'

const Ctx = createContext(null)
export const useData = () => useContext(Ctx)

const COLS = ['started_on', 'source', 'active', 'times_per_day', 'reminder_times', 'pack_days', 'pack_price_inr', 'pack_started_on', 'stopped_on', 'stopped_reason']
const pickCols = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => COLS.includes(k)))
const withDay = (list, e) => [...list.filter((c) => c.date !== e.date), e]
const localKey = (id) => 'mmc_local_' + id
const readLocal = (id) => { try { return JSON.parse(localStorage.getItem(localKey(id))) || [] } catch { return [] } }
const join = (r, cat) => {
  const c = cat.find((x) => x.id === r.product_id) || {}
  return { ...r, reminder_times: r.reminder_times || [], name: c.name || r.product_id, weeks_to_notice: c.typical_weeks_to_notice || 16, usage_note: c.usage_note || '' }
}

export function DataProvider({ children }) {
  const { user, demo } = useSession()
  const isDemo = !!demo, uid = isDemo ? 'demo' : user?.id
  const [ready, setReady] = useState(false), [error, setError] = useState('')
  const [rows, setRows] = useState([]), [server, setServer] = useState([]), [local, setLocal] = useState([])
  const [consent, setConsent] = useState({}), [consentAt, setConsentAt] = useState({}), [catalogue, setCatalogue] = useState(CATALOGUE)

  useEffect(() => {
    let off = false
    setReady(false); setError('')
    if (isDemo) {
      const d = getDemoData()
      setCatalogue(CATALOGUE); setRows(d.products); setServer(d.checkins); setLocal([]); setConsent(d.consents); setConsentAt({}); setReady(true)
      return
    }
    if (!user || !supabase) return
    ;(async () => {
      const [up, ck, co, pr] = await Promise.all([
        supabase.from('user_products').select('*').order('started_on'),
        supabase.from('checkins').select('day,applied,effects').order('day'),
        supabase.from('consents').select('purpose,granted,created_at').order('created_at').order('id'),
        supabase.from('products').select('*'),
      ])
      if (off) return
      if (up.error || ck.error || co.error || pr.error) { setError('We could not load your routine. Check your connection and refresh.'); setReady(true); return }
      const cons = {}, at = {}
      co.data.forEach((r) => { cons[r.purpose] = r.granted; at[r.purpose] = r.created_at }) // rows are oldest first, so the last one wins
      setCatalogue(pr.data); setRows(up.data); setServer(ck.data.map((c) => ({ date: c.day, applied: c.applied, effects: c.effects })))
      setLocal(readLocal(uid)); setConsent(cons); setConsentAt(at); setReady(true)
    })()
    return () => { off = true }
  }, [uid, isDemo])

  // Demo Mode keeps everything in this browser.
  useEffect(() => { if (isDemo && ready) saveDemoData({ products: rows, checkins: server, consents: consent }) }, [isDemo, ready, rows, server, consent])

  const products = useMemo(() => rows.map((r) => join(r, catalogue)), [rows, catalogue])
  const active = useMemo(() => products.filter((p) => p.active), [products])
  const stopped = useMemo(() => products.filter((p) => !p.active), [products])
  const checkins = useMemo(() => {
    const m = new Map(local.map((c) => [c.date, c]))
    server.forEach((c) => m.set(c.date, c))
    return [...m.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [server, local])
  const canStore = isDemo || !!consent.progress_tracking
  const points = checkins.filter((c) => c.applied).length * 10

  const logDay = async (date, effects = []) => {
    const entry = { date, applied: true, effects }
    if (isDemo) { setServer((v) => withDay(v, entry)); return {} }
    if (consent.progress_tracking) {
      const { error } = await supabase.from('checkins').upsert({ user_id: uid, day: date, applied: true, effects }, { onConflict: 'user_id,day' })
      if (error) return { error }
      setServer((v) => withDay(v, entry))
    } else {
      const next = withDay(local, entry)
      localStorage.setItem(localKey(uid), JSON.stringify(next)); setLocal(next)
    }
    return {}
  }

  const updateProduct = async (id, patch) => {
    if (!isDemo) {
      const { error } = await supabase.from('user_products').update(pickCols(patch)).eq('id', id)
      if (error) return { error }
    }
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...pickCols(patch) } : r)))
    return {}
  }

  const addProduct = async (product_id) => {
    const row = { product_id, started_on: today(), times_per_day: 1, reminder_times: [], source: null, active: true }
    if (isDemo) { setRows((rs) => [...rs, { ...row, id: 'demo-' + Date.now() }]); return {} }
    const { data, error } = await supabase.from('user_products').insert({ ...row, user_id: uid }).select().single()
    if (error) return { error }
    setRows((rs) => [...rs, data])
    return {}
  }

  // Every change is a new consent row, so the history of what the person agreed to stays intact.
  const setConsentFor = async (purpose, granted) => {
    if (!isDemo) {
      const { error } = await supabase.from('consents').insert({ user_id: uid, purpose, granted })
      if (error) return { error }
      setConsentAt((a) => ({ ...a, [purpose]: new Date().toISOString() }))
      if (purpose === 'progress_tracking' && granted && local.length) {
        const { error: e2 } = await supabase.from('checkins').upsert(local.map((c) => ({ user_id: uid, day: c.date, applied: c.applied, effects: c.effects })), { onConflict: 'user_id,day' })
        if (!e2) {
          setServer((v) => [...v.filter((x) => !local.some((l) => l.date === x.date)), ...local])
          localStorage.removeItem(localKey(uid)); setLocal([])
        }
      }
    }
    setConsent((c) => ({ ...c, [purpose]: granted }))
    return {}
  }

  const exportData = async () => {
    let out
    if (isDemo) out = { demo: true, products: rows, checkins: server, consents: consent }
    else {
      const get = (name) => supabase.from(name).select('*')
      const [p, c, u, k] = await Promise.all([get('profiles'), get('consents'), get('user_products'), get('checkins')])
      if (p.error || c.error || u.error || k.error) return { error: true }
      out = { exported_at: new Date().toISOString(), profile: p.data, consents: c.data, products: u.data, checkins: k.data, checkins_on_this_device_only: local }
    }
    download('my-man-matters-companion-data.json', JSON.stringify(out, null, 2), 'application/json')
    return {}
  }

  const deleteCheckins = async () => {
    if (!isDemo) {
      const { error } = await supabase.from('checkins').delete().eq('user_id', uid)
      if (error) return { error }
      localStorage.removeItem(localKey(uid))
    }
    setServer([]); setLocal([])
    return {}
  }

  const deleteAccount = async () => {
    if (isDemo) return {}
    const { error } = await supabase.rpc('delete_my_account')
    if (error) return { error }
    localStorage.removeItem(localKey(uid))
    await supabase.auth.signOut({ scope: 'local' })
    return {}
  }

  const value = { ready, error, products, active, stopped, catalogue, checkins, canStore, points, consent, consentAt,
    logDay, updateProduct, addProduct, setConsentFor, exportData, deleteCheckins, deleteAccount }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}