// Photos and weekly ratings. Real accounts use Supabase (photos in a private bucket); Demo Mode keeps it in this tab.
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { useSession } from './session'
import { useData } from './data'
import { today, addDays } from './plan'

const BUCKET = 'progress-photos', DEMO_KEY = 'mmc_demo_ratings'
export const weekOf = (s = today()) => { const [y, m, d] = s.split('-').map(Number); return addDays(s, -((new Date(y, m - 1, d).getDay() + 6) % 7)) }

// Re-encoding through a canvas shrinks the photo and drops its EXIF data (location, camera).
export async function shrink(file, max = 1280, q = 0.82) {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image(); img.src = url; await img.decode()
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', q))
  } finally { URL.revokeObjectURL(url) }
}

export async function removeAllPhotos(uid) {
  const { data, error } = await supabase.storage.from(BUCKET).list(uid, { limit: 1000 })
  if (error) return { error }
  if (data.length) {
    const r = await supabase.storage.from(BUCKET).remove(data.map((f) => `${uid}/${f.name}`))
    if (r.error) return { error: r.error }
  }
  const d = await supabase.from('photos').delete().eq('user_id', uid)
  return d.error ? { error: d.error } : {}
}

const withRating = (list, r) => [...list.filter((x) => !(x.product_id === r.product_id && x.week_of === r.week_of)), r].sort((a, b) => a.week_of.localeCompare(b.week_of))

function demoSeed() {
  const w = weekOf(), noticed = [1, 1, 1, 2, 2, 2], ease = [3, 4, 4, 4, 5, 4]
  return noticed.map((n, i) => ({ product_id: 'minoxidil-hair', week_of: addDays(w, -7 * (6 - i)), noticed: n, ease: ease[i], note: '' }))
}

export function useProgress() {
  const { user, demo } = useSession()
  const { ready, consent, setConsentFor } = useData()
  const isDemo = !!demo, uid = user?.id
  const [photos, setPhotos] = useState([]), [ratings, setRatings] = useState([]), [loaded, setLoaded] = useState(false), [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    let off = false
    setLoaded(false); setError('')
    if (isDemo) {
      let r; try { r = JSON.parse(sessionStorage.getItem(DEMO_KEY)) } catch {}
      setRatings(r || demoSeed()); setPhotos([]); setLoaded(true)
      return
    }
    if (!supabase || !uid) return
    ;(async () => {
      const [ph, rt] = await Promise.all([
        supabase.from('photos').select('id,taken_on,path,area').order('taken_on').order('id'),
        supabase.from('ratings').select('product_id,week_of,noticed,ease,note').order('week_of'),
      ])
      if (off) return
      if (ph.error || rt.error) { setError('We could not load your photos and ratings. Check your connection and refresh.'); setLoaded(true); return }
      let list = ph.data.map((p) => ({ ...p, url: '' }))
      if (list.length) {
        const s = await supabase.storage.from(BUCKET).createSignedUrls(list.map((p) => p.path), 3600)
        if (!s.error) { const m = new Map(s.data.map((x) => [x.path, x.signedUrl])); list = list.map((p) => ({ ...p, url: m.get(p.path) || '' })) }
      }
      if (off) return
      setPhotos(list); setRatings(rt.data); setLoaded(true)
    })()
    return () => { off = true }
  }, [ready, isDemo, uid])

  const canPhotos = isDemo || !!consent.photo_storage
  const canRate = isDemo || !!consent.progress_tracking

  const saveRating = async (r) => {
    if (!canRate) return { error: 'consent' }
    if (!isDemo) {
      const { error } = await supabase.from('ratings').upsert({ user_id: uid, ...r }, { onConflict: 'user_id,product_id,week_of' })
      if (error) return { error }
    }
    const next = withRating(ratings, r)
    setRatings(next)
    if (isDemo) try { sessionStorage.setItem(DEMO_KEY, JSON.stringify(next)) } catch {}
    return {}
  }

  const addPhoto = async (file, area) => {
    let blob
    try { blob = await shrink(file, isDemo ? 640 : 1280) } catch { return { error: 'format' } }
    const taken_on = today()
    if (isDemo) { setPhotos((v) => [...v, { id: 'd' + Date.now(), taken_on, area, url: URL.createObjectURL(blob) }]); return {} }
    if (!consent.photo_storage) return { error: 'consent' }
    const path = `${uid}/${Date.now()}.jpg`
    const up = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg' })
    if (up.error) return { error: up.error }
    const { data, error } = await supabase.from('photos').insert({ user_id: uid, taken_on, path, area }).select('id,taken_on,path,area').single()
    if (error) { await supabase.storage.from(BUCKET).remove([path]); return { error } }
    setPhotos((v) => [...v, { ...data, url: URL.createObjectURL(blob) }])
    return {}
  }

  const deletePhoto = async (p) => {
    if (!isDemo) {
      const r = await supabase.storage.from(BUCKET).remove([p.path])
      if (r.error) return { error: r.error }
      const d = await supabase.from('photos').delete().eq('id', p.id)
      if (d.error) return { error: d.error }
    }
    setPhotos((v) => v.filter((x) => x.id !== p.id))
    return {}
  }

  const deleteAll = async () => {
    if (!isDemo) { const r = await removeAllPhotos(uid); if (r.error) return r }
    setPhotos([])
    return {}
  }

  return { loaded, error, photos, ratings, canPhotos, canRate, saveRating, addPhoto, deletePhoto, deleteAll, allow: (p) => setConsentFor(p, true) }
}