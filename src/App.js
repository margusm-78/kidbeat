import React, { useEffect, useMemo, useRef, useState } from 'react'

// KidBeat – full drop-in App.jsx (noise-buffer reuse optimization)
// - Fix: reuse memoized white-noise buffer per sampleRate to reduce CPU/GC
// - Reliable single-step scheduler so playback advances every tick
// - iOS audio unlock on Play
// - Keeps save/load, export WAV, tempo, swing, per-track volume

const STEPS = 16
const DEFAULT_BPM = 100
const TRACKS = [
  { id: 'kick',  label: 'Kick',  color: '#fecdd3', type: 'kick'  },
  { id: 'snare', label: 'Snare', color: '#bae6fd', type: 'snare' },
  { id: 'hat',   label: 'Hi-Hat',color: '#d9f99d', type: 'hat'   },
  { id: 'clap',  label: 'Clap',  color: '#fde68a', type: 'clap'  },
]

function createAudioEngine () {
  const ctx = new (window.AudioContext || window.webkitAudioContext)()
  const master = ctx.createGain()
  master.gain.value = 0.9
  master.connect(ctx.destination)
  return { ctx, master }
}

// === Drum voices (connect to `master`) ===
function playKick (ctx, master, when, velocity = 1) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(150, when)
  osc.frequency.exponentialRampToValueAtTime(45, when + 0.12)
  gain.gain.setValueAtTime(0.001, when)
  gain.gain.exponentialRampToValueAtTime(velocity, when + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.25)
  osc.connect(gain).connect(master)
  osc.start(when)
  osc.stop(when + 0.32)
}

// Reusable noise-based voices accept an optional shared noise buffer
function playSnare (ctx, master, when, velocity = 1, noiseBuffer) {
  const noiseSrc = ctx.createBufferSource()
  // If no shared buffer provided (e.g., OfflineAudioContext), create one
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * 0.2)), ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  
  // Ensure buffer is filled with noise data
  if (noiseBuffer.getChannelData && noiseBuffer.getChannelData(0)[0] === undefined) {
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  
  noiseSrc.buffer = noiseBuffer

  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1000
  const ng = ctx.createGain(); ng.gain.setValueAtTime(velocity * 0.7, when); ng.gain.exponentialRampToValueAtTime(0.001, when + 0.15)
  noiseSrc.connect(hp).connect(ng).connect(master)
  noiseSrc.start(when); noiseSrc.stop(when + 0.2)

  const osc = ctx.createOscillator(); osc.type = 'triangle'
  const g = ctx.createGain(); g.gain.setValueAtTime(velocity * 0.3, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.2)
  osc.frequency.setValueAtTime(200, when); osc.connect(g).connect(master)
  osc.start(when); osc.stop(when + 0.21)
}

function playHat (ctx, master, when, velocity = 1, noiseBuffer) {
  const noise = ctx.createBufferSource()
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * 0.2)), ctx.sampleRate)
    const data = noiseBuffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  noise.buffer = noiseBuffer
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 6000
  const g = ctx.createGain(); g.gain.setValueAtTime(velocity * 0.25, when); g.gain.exponentialRampToValueAtTime(0.001, when + 0.05)
  noise.connect(hp).connect(g).connect(master)
  noise.start(when); noise.stop(when + 0.05)
}

function playClap (ctx, master, when, velocity = 1, noiseBuffer) {
  // Use the same shared noise buffer; shape with envelopes + bandpass
  const burst = (offset) => {
    const src = ctx.createBufferSource()
    if (!noiseBuffer) {
      noiseBuffer = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * 0.2)), ctx.sampleRate)
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    src.buffer = noiseBuffer
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000
    const gg = ctx.createGain(); gg.gain.setValueAtTime(velocity * 0.35, when + offset); gg.gain.exponentialRampToValueAtTime(0.001, when + offset + 0.12)
    src.connect(bp).connect(gg).connect(master)
    src.start(when + offset)
    src.stop(when + offset + 0.12)
  }
  burst(0); burst(0.01); burst(0.02)
}

function scheduleHit (ctx, master, type, when, velocity = 1, noiseBuffer) {
  switch (type) {
    case 'kick':  return playKick(ctx, master, when, velocity)
    case 'snare': return playSnare(ctx, master, when, velocity, noiseBuffer)
    case 'hat':   return playHat(ctx, master, when, velocity, noiseBuffer)
    case 'clap':  return playClap(ctx, master, when, velocity, noiseBuffer)
  }
}

async function renderToWav ({ bpm, pattern, bars = 2 }) {
  const sr = 44100
  const secondsPerBeat = 60 / bpm
  const stepDur = secondsPerBeat / 4
  const totalTime = stepDur * STEPS * bars
  const oac = new OfflineAudioContext(2, Math.ceil(totalTime * sr), sr)

  // For OfflineAudioContext, generate a fresh noise buffer (context-specific)
  const offlineNoise = oac.createBuffer(1, Math.max(1, Math.round(oac.sampleRate * 0.2)), oac.sampleRate)
  const d = offlineNoise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1

  const schedule = (type, when) => {
    switch (type) {
      case 'kick':  playKick(oac, oac.destination, when, 1); break
      case 'snare': playSnare(oac, oac.destination, when, 1, offlineNoise); break
      case 'hat':   playHat(oac, oac.destination, when, 1, offlineNoise); break
      case 'clap':  playClap(oac, oac.destination, when, 1, offlineNoise); break
    }
  }
  for (let bar = 0; bar < bars; bar++) {
    for (let step = 0; step < STEPS; step++) {
      const when = bar * STEPS * stepDur + step * stepDur + 0.02
      TRACKS.forEach((t, row) => { if (pattern[row][step]) schedule(t.type, when) })
    }
  }
  const rendered = await oac.startRendering()
  const length = rendered.length * 2 + 44
  const buffer = new ArrayBuffer(length)
  const view = new DataView(buffer)
  const writeString = (offset, str) => { for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i)) }
  const channels = 2
  const sampleRate = rendered.sampleRate
  const samples = rendered.length
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples * channels * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * channels * 2, true)
  view.setUint16(32, channels * 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples * channels * 2, true)
  const ch0 = rendered.getChannelData(0)
  const ch1 = rendered.getChannelData(1)
  let offset = 44
  for (let i = 0; i < samples; i++) {
    const s0 = Math.max(-1, Math.min(1, ch0[i]))
    const s1 = Math.max(-1, Math.min(1, ch1[i]))
    view.setInt16(offset, s0 < 0 ? s0 * 0x8000 : s0 * 0x7fff, true)
    view.setInt16(offset + 2, s1 < 0 ? s1 * 0x8000 : s1 * 0x7fff, true)
    offset += 4
  }
  return new Blob([view], { type: 'audio/wav' })
}

function useLocalPatterns () {
  const loadAll = () => { try { return JSON.parse(localStorage.getItem('kidbeat_patterns') || '{}') } catch { return {} } }
  const saveAll = (obj) => localStorage.setItem('kidbeat_patterns', JSON.stringify(obj))
  return { loadAll, saveAll }
}

export default function App () {
  const [bpm, setBpm] = useState(DEFAULT_BPM)
  const [swing, setSwing] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [name, setName] = useState('My First Beat')
  const [volumes, setVolumes] = useState([1, 1, 1, 1])
  const [audioState, setAudioState] = useState('unknown')

  const defaultPattern = useMemo(() => TRACKS.map(() => Array(STEPS).fill(false)), [])
  const [pattern, setPattern] = useState(() => {
    const p = TRACKS.map(() => Array(STEPS).fill(false))
    p[0][0] = p[0][8] = true
    p[1][4] = p[1][12] = true
    for (let i = 0; i < STEPS; i += 2) p[2][i] = true
    return p
  })

  const { ctx, master } = useMemo(() => createAudioEngine(), [])
  const lookahead = 0.08
  const timerRef = useRef(null)
  const nextNoteTimeRef = useRef(0)
  const stepRef = useRef(0)

  // Shared white-noise buffer (per sampleRate) for snare/hat/clap
  const sharedNoise = useMemo(() => {
    const nb = ctx.createBuffer(1, Math.max(1, Math.round(ctx.sampleRate * 0.2)), ctx.sampleRate)
    const data = nb.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return nb
  }, [ctx.sampleRate])

  useEffect(() => {
    // reflect audio state in UI
    const update = () => setAudioState(ctx.state)
    update()
    ctx.onstatechange = update
    return () => { 
      if (timerRef.current) window.clearInterval(timerRef.current)
      try { ctx.close() } catch {} 
    }
  }, [ctx])

  const schedule = (time, step) => {
    TRACKS.forEach((t, row) => {
      if (pattern[row][step]) scheduleHit(ctx, master, t.type, time, volumes[row], sharedNoise)
    })
  }

  function nextStep () {
    const secondsPerBeat = 60 / bpm
    const stepDur = secondsPerBeat / 4
    if (nextNoteTimeRef.current <= ctx.currentTime + lookahead) {
      let t = nextNoteTimeRef.current
      if (swing > 0 && (stepRef.current % 2 === 1)) {
        t += (swing / 100) * (stepDur / 3)
      }
      schedule(t, stepRef.current)
      nextNoteTimeRef.current += stepDur
      setCurrentStep(stepRef.current)
      stepRef.current = (stepRef.current + 1) % STEPS
    }
  }

  const start = async () => {
    try {
      // iOS unlock - create silent buffer and play it
      const buffer = ctx.createBuffer(1, 1, 22050)
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      source.start(0)
      
      if (ctx.state !== 'running') {
        await ctx.resume()
      }

      nextNoteTimeRef.current = ctx.currentTime + 0.05
      stepRef.current = 0
      setIsPlaying(true)

      // kick first tick immediately
      nextStep()

      if (timerRef.current) window.clearInterval(timerRef.current)
      timerRef.current = window.setInterval(nextStep, 25)
    } catch (error) {
      console.error('Failed to start audio:', error)
      alert('Audio failed to start. Please try again.')
    }
  }

  const stop = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    setIsPlaying(false)
    setCurrentStep(0)
  }

  const toggleCell = (row, col) => {
    setPattern(p => { 
      const copy = p.map(r => r.slice())
      copy[row][col] = !copy[row][col]
      return copy 
    })
  }
  
  const setAll = (row, on) => {
    setPattern(p => { 
      const copy = p.map(r => r.slice())
      copy[row] = Array(STEPS).fill(on)
      return copy 
    })
  }
  
  const randomize = () => {
    setPattern(() => TRACKS.map(() => Array(STEPS).fill(false)).map((row, rIdx) => 
      row.map(() => Math.random() < (rIdx === 2 ? 0.6 : 0.3))
    ))
  }
  
  const clear = () => setPattern(defaultPattern)

  const { loadAll, saveAll } = useLocalPatterns()
  
  const savePattern = () => { 
    const all = loadAll()
    all[name] = { bpm, swing, pattern, volumes }
    saveAll(all) 
  }
  
  const loadPattern = (n) => { 
    const all = loadAll()
    const data = all[n]
    if (data) { 
      setName(n)
      setBpm(data.bpm ?? DEFAULT_BPM)
      setSwing(data.swing ?? 0)
      setPattern(data.pattern ?? defaultPattern)
      setVolumes(data.volumes ?? [1,1,1,1]) 
    } 
  }
  
  const deletePattern = (n) => { 
    const all = loadAll()
    delete all[n]
    saveAll(all)
    if (n === name) setName('My Beat') 
  }

  const exportWav = async () => {
    try {
      const blob = await renderToWav({ bpm, pattern, bars: 4 })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name.replaceAll(' ', '_') + '.wav'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 2000)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Export failed. Please try again.')
    }
  }

  const savedNames = Object.keys((() => { 
    try { 
      return JSON.parse(localStorage.getItem('kidbeat_patterns') || '{}') 
    } catch { 
      return {} 
    } 
  })())

  return (
    <div className="container">
      <div className="title">🥁 KidBeat – Friendly Beatmaker</div>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <span className="label">Beat Name</span>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
          <button onClick={savePattern}>💾 Save</button>
          <button onClick={exportWav}>⬇️ Export WAV</button>

          <span className="label">Tempo</span>
          <input className="slider" type="range" min="60" max="160" step="1" value={bpm} onChange={(e) => setBpm(parseInt(e.target.value))} />
          <span className="small">{bpm} BPM</span>

          <span className="label">Swing</span>
          <input className="slider" type="range" min="0" max="100" step="1" value={swing} onChange={(e) => setSwing(parseInt(e.target.value))} />
          <span className="small">{swing}%</span>

          <span className="small" style={{ marginLeft: 'auto' }}>Audio: <b>{audioState}</b></span>
        </div>

        <div className="grid">
          <div className="steps">
            <div></div>
            {Array.from({ length: STEPS }, (_, i) => (
              <div key={i} className="step-num" style={{ fontWeight: i % 4 === 0 ? 700 : 400 }}>{i + 1}</div>
            ))}

            {TRACKS.map((t, r) => (
              <React.Fragment key={t.id}>
                <div>
                  <div className="track-name">
                    <span>{t.label}</span>
                    <span className="dot" style={{ background: t.color }}></span>
                  </div>
                  <div className="row small" style={{ marginTop: 6 }}>
                    <span>Vol</span>
                    <input className="vol" type="range" min="0" max="1" step="0.05" value={volumes[r]} onChange={(e) => {
                      const val = parseFloat(e.target.value)
                      setVolumes(v => Object.assign([], v, { [r]: val }))
                    }} />
                    <button onClick={() => setAll(r, true)}>All</button>
                    <button onClick={() => setAll(r, false)}>None</button>
                  </div>
                </div>

                {Array.from({ length: STEPS }, (_, c) => {
                  const active = pattern[r][c]
                  const isNow = isPlaying && c === currentStep
                  const cls = 'cell' + (active ? ' active' : '') + (isNow ? ' now' : '')
                  return (
                    <button 
                      key={c} 
                      className={cls} 
                      onClick={() => toggleCell(r, c)} 
                      aria-label={`${t.label} step ${c + 1}`}
                    ></button>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          {!isPlaying ? (
            <button className="primary" onClick={start}>▶️ Play</button>
          ) : (
            <button className="danger" onClick={stop}>⏹ Stop</button>
          )}
          <button onClick={randomize}>🎲 Surprise Beat</button>
          <button onClick={clear}>🧽 Clear</button>
          <div className="spacer"></div>
          <select onChange={(e) => loadPattern(e.target.value)} defaultValue="">
            <option value="" disabled>Load Saved Beat</option>
            {savedNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <button onClick={() => deletePattern(name)}>🗑️ Delete Current</button>
        </div>

        <div className="help">Tip: On iPad Safari, tap <b>Share</b> → <b>Add to Home Screen</b> to install. Your beats save on this device.</div>
      </div>

      <div className="footer">Privacy-friendly: no uploads, all audio is generated on-device.</div>
    </div>
  )
}