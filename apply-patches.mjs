// Run from your project folder:  node apply-patches.mjs
// Makes the small edits to files that already exist in your project. Safe to run twice. Originals are copied to .backup-before-phase4-7/
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const file = (p) => path.join(root, p)
const read = (p) => (fs.existsSync(file(p)) ? fs.readFileSync(file(p), 'utf8') : null)
const strings = JSON.parse(read('src/lib/strings.json') || '{}')
const keys = Object.keys(strings).sort((a, b) => b.length - a.length)
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const backupDir = file('.backup-before-phase4-7')
const report = []

function edit(p, fn) {
  const before = read(p)
  if (before === null) { report.push(`SKIPPED  ${p} (file not found)`); return }
  const notes = []
  let after = fn(before, notes)
  if (after !== before && !/import\s*\{[^}]*\bL\b[^}]*\}\s*from\s*'\.\.\/lib\/i18n'/.test(after) && /\bL\(/.test(after)) {
    const lines = after.split('\n'); let last = -1
    lines.forEach((l, i) => { if (/^import\s/.test(l)) last = i })
    lines.splice(last + 1, 0, "import { L } from '../lib/i18n'")
    after = lines.join('\n'); notes.push('added L import')
  }
  if (after === before) { report.push(`unchanged ${p}${notes.length ? ' (' + notes.join('; ') + ')' : ' (already patched, or nothing to change)'}`); return }
  fs.mkdirSync(path.join(backupDir, path.dirname(p)), { recursive: true })
  if (!fs.existsSync(path.join(backupDir, p))) fs.writeFileSync(path.join(backupDir, p), before)
  fs.writeFileSync(file(p), after)
  report.push(`patched   ${p}${notes.length ? ' (' + notes.join('; ') + ')' : ''}`)
}
const replaceOnce = (src, from, to, notes, what, done) => {
  if ((done && src.includes(done)) || (src.includes(to) && !src.includes(from))) return src
  if (!src.includes(from)) { notes.push(`WARNING: could not find ${what}`); return src }
  notes.push(what); return src.split(from).join(to)
}

// Wrap plain text nodes (>Text<) and sentence-like quoted messages ('Text') in L(), for every key that has a translation.
function wrapStrings(src, notes) {
  let n = 0
  for (const k of keys) {
    const node = `>${k}<`
    if (src.includes(node)) { src = src.split(node).join(`>{L(${JSON.stringify(k)})}<`); n++ }
    if ((k.includes(' ') || k.endsWith('.')) && !k.includes("'")) {
      const re = new RegExp(`(?<!L\\()'${esc(k)}'`, 'g')
      if (re.test(src)) { src = src.replace(re, `L('${k}')`); n++ }
    }
  }
  if (n) notes.push(`${n} strings made translatable`)
  return src
}
const PAGES = ['Home', 'Routine', 'Refill', 'Journey', 'Progress', 'Settings', 'Onboarding']

// Home: link to the brand view, and point the points counter at the Rewards page.
edit('src/pages/Home.jsx', (s, n) => {
  s = replaceOnce(s, '<Link to="/settings" className="text-sm underline">Settings</Link>',
    '<span className="flex gap-4 text-sm"><Link to="/dashboard" className="underline">Brand view</Link><Link to="/settings" className="underline">Settings</Link></span>', n, 'added Brand view link', 'to="/dashboard"')
  s = replaceOnce(s, '<p><b className="text-xl">{points}</b> points</p>', '<p><Link to="/rewards" className="underline">Rewards</Link></p>', n, 'points now link to Rewards', 'to="/rewards"')
  return s
})
// Settings: account deletion also removes stored ID photos.
edit('src/pages/Settings.jsx', (s, n) => {
  if (!s.includes("from '../lib/files'")) s = replaceOnce(s, "import { removeAllPhotos } from '../lib/progress'", "import { removeAllPhotos } from '../lib/progress'\nimport { removeAllFiles } from '../lib/files'", n, 'imported removeAllFiles', "from '../lib/files'")
  s = replaceOnce(s, 'await removeAllPhotos(user.id)', 'await removeAllFiles(user.id)', n, 'account deletion removes ID photos too', 'removeAllFiles(user.id)')
  return s
})
// Consent wording and option chips come from lists, so translate them where they are drawn.
for (const p of ['Settings', 'Onboarding']) edit(`src/pages/${p}.jsx`, (s, n) => {
  s = replaceOnce(s, "{label}{req && ' (required)'}", "{L(label)}{req && ' (' + L('required') + ')'}", n, 'consent labels translatable', 'L(label)')
  s = replaceOnce(s, '>{why}<', '>{L(why)}<', n, 'consent reasons translatable', 'L(why)')
  return s
})
for (const p of ['Home', 'Routine', 'Onboarding']) edit(`src/pages/${p}.jsx`, (s, n) => replaceOnce(s, '>{l}<', '>{L(l)}<', n, 'option labels translatable', 'L(l)'))
edit('src/pages/Onboarding.jsx', (s, n) => replaceOnce(s, '>{v}<', '>{L(v)}<', n, 'concern and product chips translatable', 'L(v)'))
for (const p of PAGES) edit(`src/pages/${p}.jsx`, wrapStrings)

// index.html: PWA tags.
edit('index.html', (s, n) => {
  if (s.includes('manifest.webmanifest')) return s
  const tags = `    <link rel="manifest" href="/manifest.webmanifest" />\n    <meta name="theme-color" content="#12281F" />\n    <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />\n    <meta name="apple-mobile-web-app-capable" content="yes" />\n    <meta name="mobile-web-app-capable" content="yes" />\n    <meta name="apple-mobile-web-app-title" content="MM Companion" />\n`
  if (!s.includes('</head>')) { n.push('WARNING: no </head> found, add the PWA tags by hand (see README)'); return s }
  n.push('added PWA tags'); return s.replace('</head>', tags + '  </head>')
})

const pkg = read('package.json')
if (pkg && !pkg.includes('@mediapipe/tasks-vision')) report.push('REMINDER  run: npm install @mediapipe/tasks-vision@0.10.14')
console.log(report.join('\n'))
if (report.some((r) => r.includes('WARNING'))) console.log('\nA WARNING means that edit was not made. Everything else was.')
