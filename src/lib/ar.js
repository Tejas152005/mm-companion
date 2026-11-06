// Goal preview: draws an illustration on top of a face found ON THIS DEVICE (MediaPipe Face Landmarker). Nothing is uploaded.
const VERSION = '0.10.14'
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'

export async function loadLandmarker() {
  const { FilesetResolver, FaceLandmarker } = await import('@mediapipe/tasks-vision')
  const fileset = await FilesetResolver.forVisionTasks(WASM)
  const make = (delegate) => FaceLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: 'VIDEO', numFaces: 1 })
  try { return await make('GPU') } catch { return await make('CPU') }
}

// Deterministic "random" generator, reset with the same seed every frame, so the illustration
// doesn't flicker between frames but still looks hand-drawn rather than a grid of dots.
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const JAW = [234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152, 377, 400, 378, 379, 365, 397, 288, 361, 323, 454]

export function inside(poly, x, y) {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) c = !c
  }
  return c
}

// Draws one hair/beard strand as a short curved stroke rather than a dot, so it reads as hair,
// not as graft marks. `curl` controls how wavy/curly the stroke is: 0 = straight, 1 = tight curls.
function strand(ctx, x, y, dx, dy, len, curl, rng, style) {
  const segs = curl > 0.6 ? 7 : curl > 0.15 ? 4 : 2
  const amp = len * (curl > 0.6 ? 0.3 : curl > 0.15 ? 0.14 : 0.03)
  const freq = curl > 0.6 ? 2.6 : 1.3
  const phase = rng() * 6.283
  const nx = -dy, ny = dx // perpendicular, for the wave offset
  ctx.beginPath()
  ctx.moveTo(x, y)
  for (let s = 1; s <= segs; s++) {
    const tt = s / segs
    const wobble = Math.sin(tt * Math.PI * freq + phase) * amp * tt
    ctx.lineTo(x + dx * len * tt + nx * wobble, y + dy * len * tt + ny * wobble)
  }
  ctx.strokeStyle = style
  ctx.lineWidth = Math.max(0.9, len * 0.1)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

// Warm dark-brown palette with natural per-strand variation, instead of flat black dots.
const shade = (rng, lo, hi) => {
  const k = lo + rng() * (hi - lo)
  return `rgba(${Math.round(32 + k * 26)},${Math.round(22 + k * 20)},${Math.round(15 + k * 14)},${(0.55 + rng() * 0.3).toFixed(2)})`
}

// kind: 'hair' | 'beard'.
// style: for hair, 'straight' | 'wavy' | 'curly'. For beard, 'stubble' | 'short' | 'full'.
// growth: 0..1, how far along the usual waiting window the person is. Higher = fuller coverage and longer
// strands, modelling "it fills in gradually", not an instant, all-or-nothing transplant-style patch.
export function drawGoal(ctx, lm, w, h, kind, style, growth) {
  const P = (i) => ({ x: lm[i].x * w, y: lm[i].y * h })
  const l = P(234), r = P(454), top = P(10), chin = P(152)
  const faceW = Math.hypot(r.x - l.x, r.y - l.y), faceH = Math.hypot(chin.x - top.x, chin.y - top.y)
  const tilt = Math.atan2(r.y - l.y, r.x - l.x)
  const scale = Math.max(0.75, faceW / 260)
  const g = Math.min(1, Math.max(0.05, growth))
  let n = 0

  if (kind === 'hair') {
    const curl = style === 'curly' ? 0.85 : style === 'wavy' ? 0.35 : 0.05
    ctx.save(); ctx.translate(top.x, top.y); ctx.rotate(tilt)
    const rx = faceW * 0.54, ry = faceH * 0.46
    const rows = Math.round(6 + g * 9) // more rows filled in as the routine progresses
    const perRow = Math.round(16 + g * 30)
    const rng = mulberry32(7)
    for (let row = 0; row < rows; row++) {
      const v = row / Math.max(1, rows - 1) // 0 = crown/part, 1 = hairline edge
      for (let i = 0; i < perRow; i++) {
        const u = (i + rng() * 0.7) / perRow
        const ang = Math.PI + u * Math.PI
        const rad = Math.sqrt(0.12 + v * 0.88)
        const sx = Math.cos(ang) * rad * rx, sy = Math.sin(ang) * rad * ry
        // Strands sweep outward and down from a centre part, like real hair growth direction.
        const dirX = Math.cos(ang), dirY = Math.sin(ang) * (ry / rx) + 0.35
        const dlen = Math.hypot(dirX, dirY) || 1
        const len = (9 + rng() * 9) * scale * (0.5 + g * 0.9)
        strand(ctx, sx, sy, dirX / dlen, dirY / dlen, len, curl, rng, shade(rng, -0.3, 0.3))
        n++
      }
    }
    ctx.restore()
  } else {
    const cfg = { stubble: { len: 3.2, density: 0.55, curl: 0.05 }, short: { len: 7, density: 0.8, curl: 0.15 }, full: { len: 12.5, density: 1, curl: 0.3 } }[style] || { len: 7, density: 0.8, curl: 0.15 }
    const jaw = JAW.map(P), nose = P(2), lip = P(13)
    const c = { x: (nose.x + lip.x) / 2, y: (nose.y + lip.y) / 2 }
    const inner = jaw.map((p) => ({ x: p.x + (c.x - p.x) * 0.42, y: p.y + (c.y - p.y) * 0.42 })).reverse()
    const poly = [...jaw, ...inner]
    const xs = poly.map((p) => p.x), ys = poly.map((p) => p.y)
    const x0 = Math.min(...xs), y0 = Math.min(...ys), bw = Math.max(...xs) - x0, bh = Math.max(...ys) - y0
    const rng = mulberry32(11)
    const samples = Math.round(260 * cfg.density * (0.45 + g * 0.85)) // dense, even growth, not sparse specks
    for (let i = 0; i < samples; i++) {
      const u = rng(), v = rng()
      const x = x0 + u * bw, y = y0 + v * bh
      if (!inside(poly, x, y)) continue
      const len = cfg.len * scale * (0.6 + rng() * 0.6) * (0.55 + g * 0.75)
      const ang = Math.PI / 2 + (rng() - 0.5) * 0.7 // mostly growing downward, with natural spread
      strand(ctx, x, y, Math.cos(ang), Math.sin(ang), len, cfg.curl, rng, shade(rng, -0.25, 0.35))
      n++
    }
  }
  return n
}
