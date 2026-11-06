// Dates, timeline and refill maths, calendar files, and shared option lists. No React in here.

// ---- Dates (local time, not UTC, so a 1 am check-in in India counts as today) ----
const pad = (n) => String(n).padStart(2, '0')
export const iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const today = () => iso()
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
export const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5)
export const fmtDate = (s) => parse(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
export const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
export const shortName = (p) => p.name.replace(' (concept)', '')

// ---- Shared option lists ----
export const SOURCES = [['company_site', 'Man Matters website'], ['amazon', 'Amazon'], ['flipkart', 'Flipkart'], ['offline', 'A store'], ['other', 'Somewhere else']]
export const REASONS = [['price', 'Too expensive'], ['felt_done', 'Felt it was done'], ['side_effect', 'A side effect'], ['switched', 'Switched product'], ['paused', 'Just a break'], ['other', 'Something else']]
export const PURPOSES = [
  ['account', 'Keep my account and routine', true, 'Needed to run the app.'],
  ['progress_tracking', 'Store my check-ins and ratings', false, 'Lets you see progress over weeks and across devices.'],
  ['photo_storage', 'Store my progress photos', false, 'Optional. You can delete them any time.'],
  ['ai_assistant', 'Let the assistant read my routine', false, 'Used only to answer your questions.'],
  ['offers_marketing', 'Show me offers', false, 'Concept offers only.'],
  ['brand_insights', 'Share anonymous trends with the brand', false, 'No name or email attached.'],
]

// ---- Streak, timeline, weekly consistency ----
export function streak(checkins) {
  const s = new Set(checkins.filter((c) => c.applied).map((c) => c.date))
  let i = s.has(today()) ? 0 : 1, n = 0
  while (s.has(addDays(today(), -i))) { n++; i++ }
  return n
}

// Five checkpoints spread across the usual waiting window (wks weeks).
export const stages = (wks) =>
  [['start', 0], ['settle', 0.25], ['half', 0.5], ['late', 0.75], ['judge', 1]].map(([key, f]) => ({ key, week: Math.round(wks * f) }))

// One entry per week since the start date. Days before the first check-in are "not tracked", not "missed".
export function weeklyAdherence(checkins, startIso, nowIso, maxWeeks = 20) {
  const done = new Set(checkins.filter((c) => c.applied).map((c) => c.date))
  const first = checkins.length ? checkins.map((c) => c.date).sort()[0] : nowIso
  const weeks = Math.floor(diffDays(startIso, nowIso) / 7) + 1
  const out = []
  for (let w = Math.max(0, weeks - maxWeeks); w < weeks; w++) {
    const from = addDays(startIso, w * 7)
    let n = 0, days = 0
    for (let i = 0; i < 7; i++) {
      const d = addDays(from, i)
      if (d > nowIso) break
      if (d < first) continue
      days++
      if (done.has(d)) n++
    }
    out.push({ week: w + 1, n, days })
  }
  return out
}

// ---- Refill and cost ----
export const LEAD_DAYS = 5 // assumed delivery time when suggesting a reorder date
export function refill(p, nowIso = today()) {
  if (!p.pack_days || p.pack_price_inr == null) return null
  const runsOn = addDays(p.pack_started_on || p.started_on, p.pack_days)
  const perDay = p.pack_price_inr / p.pack_days
  const windowDays = (p.weeks_to_notice || 16) * 7
  const used = Math.max(0, Math.min(windowDays, diffDays(p.started_on, nowIso)))
  return {
    perDay, perMonth: perDay * 30, runsOn, daysLeft: diffDays(nowIso, runsOn), reorderBy: addDays(runsOn, -LEAD_DAYS),
    windowCost: perDay * windowDays, spent: perDay * used, remaining: perDay * (windowDays - used),
  }
}

// ---- Calendar reminders (.ics). Work on any phone, even when the app is closed. ----
const esc = (s) => String(s).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n')
function vevent({ uid, title, date, time, daily, note }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const start = date.replace(/-/g, '') + 'T' + (time ? time.replace(':', '') : '0900') + '00'
  return [
    'BEGIN:VEVENT', `UID:${uid}@mm-companion`, `DTSTAMP:${stamp}`, `DTSTART:${start}`,
    ...(daily ? ['RRULE:FREQ=DAILY'] : []),
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(note)}`,
    'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM', 'END:VEVENT',
  ]
}
const NOTE = 'From Man Matters Companion (concept app). Follow your pack label or your doctor.'
export const routineEvents = (p) =>
  (p.reminder_times || []).filter(Boolean).slice(0, p.times_per_day).map((time, i) =>
    vevent({ uid: `${p.id}-r${i}`, title: `Use your ${shortName(p)}`, date: today(), time, daily: true, note: NOTE }))
export const reorderEvents = (p, r) => [
  vevent({ uid: `${p.id}-reorder`, title: `Reorder ${shortName(p)}`, date: r.reorderBy < today() ? today() : r.reorderBy, time: '10:00', daily: false, note: NOTE }),
]

export function download(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function downloadIcs(filename, events) {
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Man Matters Companion (concept)//EN', 'CALSCALE:GREGORIAN', ...events.flat(), 'END:VCALENDAR'].join('\r\n')
  download(filename, body, 'text/calendar;charset=utf-8')
}