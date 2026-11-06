// Offers, festivals, loyalty rules. Pure data and maths, no React. Every figure here is a concept value, not a real Man Matters price or discount.
import { addDays } from './plan'

// Dates checked November 2026: Diwali 8 Nov 2026 and 29 Oct 2027; Holi (Dhulandi) 22 Mar 2027, Holika Dahan 21 Mar 2027.
export const FESTIVALS = [
  { id: 'diwali-2026', key: 'diwali', name: 'Diwali', date: '2026-11-08', before: 7, after: 3 },
  { id: 'holi-2027', key: 'holi', name: 'Holi', date: '2027-03-22', before: 14, after: 2 },
  { id: 'diwali-2027', key: 'diwali', name: 'Diwali', date: '2027-10-29', before: 7, after: 3 },
]
export const windowOf = (f) => ({ from: addDays(f.date, -f.before), to: addDays(f.date, f.after) })

// preview: 'holi' forces Holi mode so reviewers can see it any time of year.
export function festivalState(nowIso, preview) {
  if (preview) return { active: FESTIVALS.find((f) => f.key === preview) || null, next: null, preview: true }
  const active = FESTIVALS.find((f) => { const w = windowOf(f); return nowIso >= w.from && nowIso <= w.to }) || null
  const next = FESTIVALS.find((f) => windowOf(f).from > nowIso) || null
  return { active, next, preview: false }
}

export const OFFERS = [
  { id: 'holi-kit', festival: 'holi', pct: 15, title: 'Holi hair-care kit', note: 'A shampoo and your usual product together.' },
  { id: 'diwali-refill', festival: 'diwali', pct: 10, title: 'Festive refill offer', note: 'On your next refill.' },
  { id: 'student', requires: 'student', pct: 10, title: 'College student discount', note: 'After a quick ID check.' },
]
export const isOpen = (o, ctx) => (o.festival ? ctx.festival === o.festival : o.requires === 'student' ? !!ctx.student : true)
// One offer applies at a time: the biggest one that is open. Offers never stack.
export const bestOffer = (offers, ctx) => offers.filter((o) => isOpen(o, ctx)).sort((a, b) => b.pct - a.pct)[0] || null
export const priceAfter = (price, pct) => Math.round(price * (1 - pct / 100))

export const POINTS = { checkin: 10, rating: 20, photo: 15, referrer: 100, referee: 50 }
export const TIERS = [['Starter', 0], ['Steady', 300], ['Committed', 800]]
// Costs here must match the rows seeded in supabase/phase4.sql (the database enforces the real cost).
export const REWARDS = [
  { id: 'delivery', title: 'Free delivery on next order', cost: 150 },
  { id: 'off5', title: '5% off next order', cost: 300 },
  { id: 'off10', title: '10% off next order', cost: 600 },
]
export function tierFor(earned) {
  let i = 0
  TIERS.forEach(([, at], k) => { if (earned >= at) i = k })
  const next = TIERS[i + 1] || null
  const pct = next ? Math.min(1, (earned - TIERS[i][1]) / (next[1] - TIERS[i][1])) : 1
  return { name: TIERS[i][0], next: next && { name: next[0], at: next[1] }, pct }
}

// Holi hair-care mode: general care habits only. Nothing here promises a result or gives medical advice.
export const HOLI_STEPS = {
  Before: [
    'Many people oil their hair a few hours before. It can make colour easier to rinse out.',
    'Tie long hair up or wear a cap. A thin layer of oil on your beard works the same way.',
    'Pick skin-safe colours where you can, and keep colour out of your eyes and mouth.',
    'If you use a scalp or beard solution, ask a pharmacist or doctor about timing around Holi. Follow your pack label.',
  ],
  During: [
    'Drink water and take breaks in the shade.',
    'If your scalp or skin stings or burns, rinse with plain water and stop playing.',
  ],
  After: [
    "Rinse with plain water first, then wash gently. Don't scrub hard.",
    "Note anything unusual in today's check-in. If it doesn't settle, ask a pharmacist or doctor.",
    'Pick your routine back up as your pack label says.',
  ],
}

// Calendar reminders for Holi prep and aftercare (same .ics approach as the routine reminders).
const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
function ev(uid, title, date, time, note) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  return ['BEGIN:VEVENT', `UID:${uid}@mm-companion`, `DTSTAMP:${stamp}`, `DTSTART:${date.replace(/-/g, '')}T${time.replace(':', '')}00`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(note)}`, 'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM', 'END:VEVENT']
}
export const holiEvents = (f) => [
  ev(`${f.id}-prep`, 'Holi prep: oil your hair and tie it up', addDays(f.date, -1), '18:00', 'From Man Matters Companion (concept app). General care tips only.'),
  ev(`${f.id}-after`, 'Holi aftercare: rinse with plain water, then wash gently', f.date, '16:00', 'From Man Matters Companion (concept app). Ask a pharmacist or doctor if anything stings or does not settle.'),
]
