import { supabase } from './supabase'
import { removeAllPhotos } from './progress'

// Deleting an account removes database rows automatically, but stored image files have to be removed first.
export async function removeAllFiles(uid) {
  const p = await removeAllPhotos(uid)
  if (p.error) return p
  const { data, error } = await supabase.storage.from('student-ids').list(uid, { limit: 100 })
  if (error) return { error }
  if (data.length) {
    const r = await supabase.storage.from('student-ids').remove(data.map((f) => `${uid}/${f.name}`))
    if (r.error) return { error: r.error }
  }
  return {}
}
