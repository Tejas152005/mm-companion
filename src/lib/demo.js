// Demo Mode: fully client-side, no account, no network. Seeded persona for reviewers.
import { today, addDays } from './plan'
const KEY = 'mmc_demo', DATA = 'mmc_demo_v2'

// Same rows as the products table in supabase/schema.sql, so Demo Mode and real accounts share one code path.
export const CATALOGUE = [
  { id: 'minoxidil-hair', name: 'Hair regrowth solution (concept)', category: 'hair', typical_weeks_to_notice: 16, usage_note: 'Follow the pack label. Ask a doctor about irritation.' },
  { id: 'minoxidil-beard', name: 'Beard growth solution (concept)', category: 'beard', typical_weeks_to_notice: 16, usage_note: 'Follow the pack label. Ask a doctor about irritation.' },
  { id: 'hair-gummies', name: 'Hair gummies (concept)', category: 'supplement', typical_weeks_to_notice: 12, usage_note: 'Take as per pack label.' },
  { id: 'anti-dandruff-shampoo', name: 'Anti-dandruff shampoo (concept)', category: 'hair', typical_weeks_to_notice: 4, usage_note: 'Follow the pack label.' },
]

const persona = (language = 'en') => ({ isDemo: true, display_name: 'Arjun (demo)', language, concerns: ['hair_thinning'], is_student: true })

// Arjun: 54 days in, twice-daily routine, pack runs out in about 6 days (so the refill nudge shows).
// The price is a made-up sample for the demo, not a real Man Matters price.
function seed() {
  const t0 = today(), checkins = []
  for (let i = 54; i >= 1; i--) if (i % 7 !== 3) checkins.push({ date: addDays(t0, -i), applied: true, effects: i % 11 === 0 ? ['dry'] : [] })
  return {
    products: [{
      id: 'demo-1', product_id: 'minoxidil-hair', started_on: addDays(t0, -54), source: 'amazon', active: true,
      times_per_day: 2, reminder_times: ['08:00', '20:00'], pack_days: 30, pack_price_inr: 599, pack_started_on: addDays(t0, -24),
      stopped_on: null, stopped_reason: null,
    }],
    checkins,
    consents: { account: true, progress_tracking: true, photo_storage: false, ai_assistant: true, offers_marketing: true, brand_insights: true },
  }
}

export const startDemo = (language) => { const p = persona(language); localStorage.setItem(KEY, JSON.stringify(p)); localStorage.removeItem(DATA); return p }
export const getDemo = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
export const setDemoLang = (language) => { const d = getDemo(); if (d) { d.language = language; localStorage.setItem(KEY, JSON.stringify(d)) } }
export const endDemo = () => { localStorage.removeItem(KEY); localStorage.removeItem(DATA) }
export function getDemoData() {
  try { const v = JSON.parse(localStorage.getItem(DATA)); if (v) return v } catch {}
  const d = seed(); localStorage.setItem(DATA, JSON.stringify(d)); return d
}
export const saveDemoData = (d) => localStorage.setItem(DATA, JSON.stringify(d))
export const resetDemoData = () => localStorage.removeItem(DATA)