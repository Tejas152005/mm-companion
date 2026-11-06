import { useEffect, useRef, useState } from 'react'
import { L } from '../lib/i18n'
import { loadLandmarker, drawGoal } from '../lib/ar'
import { download } from '../lib/plan'

const chip = (on) => `px-4 py-2 rounded-full border min-h-[44px] text-sm ${on ? 'bg-moss text-paper border-moss' : 'border-ink/25 bg-white'}`
const LABEL = 'Illustration, not a guaranteed result.'
const STYLES = { hair: [['straight', 'Straight'], ['wavy', 'Wavy'], ['curly', 'Curly']], beard: [['stubble', 'Stubble'], ['short', 'Short'], ['full', 'Full']] }

export default function Goal() {
  const [kind, setKind] = useState('hair'), [style, setStyle] = useState('straight'), [density, setDensity] = useState(55)
  const chooseKind = (k) => { setKind(k); setStyle(k === 'hair' ? 'straight' : 'short') }
  const [mode, setMode] = useState('idle') // idle | loading | camera | photo
  const [msg, setMsg] = useState(''), [noFace, setNoFace] = useState(false)
  const video = useRef(null), base = useRef(null), over = useRef(null), file = useRef(null)
  const lmk = useRef(null), stream = useRef(null), raf = useRef(0), faces = useRef(null)
  const live = useRef({ kind, style, density }); live.current = { kind, style, density }

  const stop = () => {
    cancelAnimationFrame(raf.current); raf.current = 0
    stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null
    if (video.current) video.current.srcObject = null
  }
  useEffect(() => () => { stop(); lmk.current?.close?.(); lmk.current = null }, [])

  const model = async () => { if (!lmk.current) { setMsg(L('Loading the face model…')); lmk.current = await loadLandmarker(); setMsg('') } return lmk.current }
  const paint = (lm) => {
    const c = over.current, ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    setNoFace(!lm)
    if (lm) drawGoal(ctx, lm, c.width, c.height, live.current.kind, live.current.style, live.current.density / 100)
  }

  const startCamera = async () => {
    setMsg(''); stop()
    if (!navigator.mediaDevices?.getUserMedia) { setMsg('The camera needs a secure (https) link. Open the deployed app, or use a photo instead.'); return }
    setMode('loading')
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }, audio: false })
      const m = await model()
      const v = video.current; v.srcObject = stream.current; await v.play()
      over.current.width = v.videoWidth; over.current.height = v.videoHeight
      setMode('camera')
      let last = -1
      const loop = () => {
        if (v.readyState >= 2 && v.currentTime !== last) {
          last = v.currentTime
          const res = m.detectForVideo(v, performance.now())
          paint(res.faceLandmarks && res.faceLandmarks[0])
        }
        raf.current = requestAnimationFrame(loop)
      }
      loop()
    } catch (e) {
      stop(); setMode('idle')
      setMsg(e && e.name === 'NotAllowedError' ? 'Camera permission was denied. You can use a photo instead.' : 'We could not start the camera or load the face model. Check your connection, or use a photo instead.')
    }
  }

  const usePhoto = async (f) => {
    if (!f) return
    setMsg(''); stop(); setMode('loading')
    try {
      const url = URL.createObjectURL(f)
      const img = new Image(); img.src = url; await img.decode(); URL.revokeObjectURL(url)
      const k = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight))
      const b = base.current; b.width = over.current.width = Math.round(img.naturalWidth * k); b.height = over.current.height = Math.round(img.naturalHeight * k)
      b.getContext('2d').drawImage(img, 0, 0, b.width, b.height)
      const m = await model()
      const res = m.detectForVideo(b, performance.now())
      faces.current = (res.faceLandmarks && res.faceLandmarks[0]) || null
      setMode('photo'); paint(faces.current)
    } catch { setMode('idle'); setMsg('We could not read that photo. Try a JPEG or PNG.') }
  }
  useEffect(() => { if (mode === 'photo') paint(faces.current) }, [kind, style, density, mode])

  const snapshot = () => {
    const o = over.current, c = document.createElement('canvas'); c.width = o.width; c.height = o.height + 44
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
    x.save()
    if (mode === 'camera') { x.translate(o.width, 0); x.scale(-1, 1); x.drawImage(video.current, 0, 0, o.width, o.height); x.drawImage(o, 0, 0) } // camera view is mirrored
    else { x.drawImage(base.current, 0, 0); x.drawImage(o, 0, 0) }
    x.restore()
    x.fillStyle = '#12281F'; x.fillRect(0, o.height, c.width, 44)
    x.fillStyle = '#F6F8F5'; x.font = '15px sans-serif'; x.fillText(LABEL + ' (Man Matters Companion, concept)', 12, o.height + 27)
    c.toBlob((b) => { if (b) download('goal-preview-illustration.png', b, 'image/png') }, 'image/png')
  }

  const showing = mode === 'camera' || mode === 'photo'
  return (
    <main className="px-5 pt-5 space-y-4">
      <h1 className="text-2xl font-bold">{L('Goal preview')}</h1>
      <p className="rounded-xl bg-amber/20 px-4 py-2 text-sm font-medium">{L(LABEL)}</p>
      <div className="flex gap-2" role="group" aria-label="Preview type">
        {[['hair', 'Hair'], ['beard', 'Beard']].map(([k, l]) => <button key={k} aria-pressed={kind === k} onClick={() => chooseKind(k)} className={chip(kind === k)}>{L(l)}</button>)}
      </div>
      <div className="flex gap-2 flex-wrap" role="group" aria-label={L('Style')}>
        {STYLES[kind].map(([k, l]) => <button key={k} aria-pressed={style === k} onClick={() => setStyle(k)} className={chip(style === k)}>{L(l)}</button>)}
      </div>

      <div className={`relative rounded-2xl overflow-hidden bg-ink/90 ${showing ? '' : 'aspect-[3/4] flex items-center justify-center'}`}>
        <video ref={video} playsInline muted className={`w-full ${mode === 'camera' ? 'block' : 'hidden'}`} style={{ transform: 'scaleX(-1)' }} />
        <canvas ref={base} className={`w-full ${mode === 'photo' ? 'block' : 'hidden'}`} />
        <canvas ref={over} className={`absolute inset-0 w-full h-full ${showing ? '' : 'hidden'}`} style={mode === 'camera' ? { transform: 'scaleX(-1)' } : undefined} />
        {!showing && <p className="text-paper/70 text-sm px-8 text-center">{mode === 'loading' ? L('Loading the face model…') : L('Everything happens on your phone. Nothing is uploaded. A snapshot is only saved to your device if you tap Save.')}</p>}
        {showing && <p className="absolute bottom-0 inset-x-0 bg-ink/70 text-paper text-xs text-center py-1.5">{L(LABEL)}</p>}
        {showing && noFace && <p className="absolute top-2 inset-x-2 rounded-lg bg-amber text-ink text-sm text-center py-1.5">{L('No face found. Face the camera in good light.')}</p>}
      </div>

      <label className="block text-sm font-medium">{L('Growth stage (fills in gradually, like a real routine)')}: {density}%
        <input type="range" min="10" max="100" step="5" value={density} onChange={(e) => setDensity(Number(e.target.value))} className="w-full mt-1" />
      </label>

      <div className="flex flex-wrap gap-2">
        {mode === 'camera'
          ? <button className="btn btn-ghost !w-auto px-4" onClick={() => { stop(); setMode('idle') }}>{L('Stop camera')}</button>
          : <button className="btn btn-primary !w-auto px-4 disabled:opacity-50" disabled={mode === 'loading'} onClick={startCamera}>{L('Start camera')}</button>}
        <button className="btn btn-ghost !w-auto px-4 disabled:opacity-50" disabled={mode === 'loading'} onClick={() => file.current?.click()}>{L('Use a photo instead')}</button>
        {showing && <button className="btn btn-ghost !w-auto px-4" onClick={snapshot}>{L('Save snapshot')}</button>}
      </div>
      <input ref={file} type="file" accept="image/*" className="hidden" aria-label={L('Use a photo instead')} onChange={(e) => { usePhoto(e.target.files?.[0]); e.target.value = '' }} />
      {msg && <p role="status" className="text-sm text-ink/70">{msg}</p>}
      <p className="text-xs text-ink/50">{L('This tracks a routine and is not medical advice. Concept app, not official Man Matters.')}</p>
    </main>
  )
}
