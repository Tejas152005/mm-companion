// Loyalty points, referrals and student verification. Real accounts use Supabase functions; Demo Mode keeps everything in this tab.
import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './session'
import { useData } from './data'
import { shrink } from './progress'
import { POINTS, REWARDS } from './offers'
import { pendingRef, clearRef } from './ref'
import { today, addDays } from './plan'

const K = { red: 'mmc_demo_redeemed', ref: 'mmc_demo_ref', stu: 'mmc_demo_student', rat: 'mmc_demo_ratings' }
const rd = (k, d) => { try { const v = JSON.parse(sessionStorage.getItem(k)); return v ?? d } catch { return d } }
const wr = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)) } catch {} }
const ID_BUCKET = 'student-ids'

export function useRewards() {
  const { user, demo } = useSession()
  const { ready, checkins } = useData()
  const isDemo = !!demo, uid = user?.id
  const [sum, setSum] = useState({ earned: 0, spent: 0, balance: 0, referred: 0 })
  const [code, setCode] = useState(''), [history, setHistory] = useState([]), [stu, setStu] = useState(null)
  const [loaded, setLoaded] = useState(false), [error, setError] = useState(''), [tick, setTick] = useState(0)
  const cleaning = useRef(false)
  const reload = () => setTick((n) => n + 1)

  useEffect(() => {
    if (!ready) return
    let off = false
    setError('')
    if (isDemo) {
      const nRatings = (rd(K.rat, null) || { length: 6 }).length // Progress seeds 6 sample ratings
      const joined = rd(K.ref, { claimed: false }).claimed
      const done = rd(K.red, [])
      const earned = checkins.filter((c) => c.applied).length * POINTS.checkin + nRatings * POINTS.rating + (joined ? POINTS.referee : 0)
      const spent = done.reduce((a, r) => a + r.cost, 0)
      setSum({ earned, spent, balance: earned - spent, referred: 0 }); setCode('MMARJUN1'); setHistory(done); setStu(rd(K.stu, null)); setLoaded(true)
      return
    }
    if (!supabase || !uid) return
    ;(async () => {
      const waiting = pendingRef()
      if (waiting) { await supabase.rpc('claim_referral', { p_code: waiting }); clearRef() } // a link they arrived through
      const [s, c, h, v] = await Promise.all([
        supabase.rpc('loyalty_summary'), supabase.rpc('my_referral_code'),
        supabase.from('redemptions').select('id,reward_id,cost,created_at').order('created_at', { ascending: false }),
        supabase.from('student_verifications').select('status,college,valid_until,id_path').maybeSingle(),
      ])
      if (off) return
      if (s.error || c.error || h.error || v.error) { setError('We could not load your rewards. Check your connection and refresh.'); setLoaded(true); return }
      setSum(s.data); setCode(c.data || ''); setHistory(h.data); setStu(v.data); setLoaded(true)
    })()
    return () => { off = true }
  }, [ready, isDemo, uid, tick, checkins.length])

  // Once a student is approved, their ID photo is deleted straight away. The row keeps only the decision.
  useEffect(() => {
    if (isDemo || !stu || stu.status !== 'approved' || !stu.id_path || cleaning.current) return
    cleaning.current = true
    ;(async () => {
      await supabase.storage.from(ID_BUCKET).remove([stu.id_path])
      await supabase.from('student_verifications').update({ id_path: null }).eq('user_id', uid)
      cleaning.current = false; reload()
    })()
  }, [stu, isDemo, uid])

  const studentOk = !!stu && stu.status === 'approved' && (!stu.valid_until || stu.valid_until >= today())

  const claim = async (raw) => {
    const c = raw.trim().toUpperCase()
    if (!/^[A-Z0-9]{4,12}$/.test(c)) return 'invalid'
    if (isDemo) {
      if (c === code) return 'own'
      if (rd(K.ref, { claimed: false }).claimed) return 'already'
      wr(K.ref, { claimed: true }); reload(); return 'ok'
    }
    const { data, error } = await supabase.rpc('claim_referral', { p_code: c })
    if (error) return 'error'
    reload(); return data
  }

  const redeem = async (id) => {
    const r = REWARDS.find((x) => x.id === id)
    if (!r) return { error: 'unknown' }
    if (isDemo) {
      if (sum.balance < r.cost) return { error: 'balance' }
      wr(K.red, [{ id: Date.now(), reward_id: id, cost: r.cost, created_at: new Date().toISOString() }, ...rd(K.red, [])]); reload(); return {}
    }
    const { data, error } = await supabase.rpc('redeem_reward', { p_reward: id })
    if (error) return { error: 'error' }
    if (!data.ok) return { error: data.reason }
    reload(); return {}
  }

  const submitStudent = async (college, file) => {
    if (isDemo) { const v = { status: 'pending', college, valid_until: null, id_path: null }; wr(K.stu, v); setStu(v); return {} }
    let blob
    try { blob = await shrink(file, 1600, 0.8) } catch { return { error: 'format' } }
    const path = `${uid}/id-${Date.now()}.jpg`
    const up = await supabase.storage.from(ID_BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
    if (up.error) return { error: 'upload' }
    const old = stu?.id_path
    const { error } = await supabase.from('student_verifications').upsert(
      { user_id: uid, college, status: 'pending', id_path: path, consent_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) { await supabase.storage.from(ID_BUCKET).remove([path]); return { error: 'save' } }
    if (old) await supabase.storage.from(ID_BUCKET).remove([old])
    reload(); return {}
  }

  const withdrawStudent = async () => {
    if (isDemo) { try { sessionStorage.removeItem(K.stu) } catch {} setStu(null); return {} }
    const list = await supabase.storage.from(ID_BUCKET).list(uid, { limit: 100 })
    if (list.error) return { error: 'error' }
    if (list.data.length) { const r = await supabase.storage.from(ID_BUCKET).remove(list.data.map((f) => `${uid}/${f.name}`)); if (r.error) return { error: 'error' } }
    const d = await supabase.from('student_verifications').delete().eq('user_id', uid)
    if (d.error) return { error: 'error' }
    setStu(null); return {}
  }

  const demoApprove = () => { const v = { ...(stu || {}), status: 'approved', valid_until: addDays(today(), 365) }; wr(K.stu, v); setStu(v) }

  return { loaded, error, sum, code, history, stu, studentOk, claim, redeem, submitStudent, withdrawStudent, demoApprove, isDemo }
}
