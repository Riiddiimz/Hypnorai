import { useEffect, useRef, useState } from 'react'

type Theme = {
  name: string
  colors: string[]
  background: string
  accent: string
}

const THEMES: Theme[] = [
  { name: 'Neon', colors: ['#7c3cff', '#00e5ff', '#ff3cac'], background: '#07070a', accent: '#a78bfa' },
  { name: 'Aurora', colors: ['#00f5a0', '#00d9f5', '#8b5cf6'], background: '#06100f', accent: '#5eead4' },
  { name: 'Sunset', colors: ['#ff4d6d', '#ff9f1c', '#ffe66d'], background: '#120907', accent: '#fb7185' },
]

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [themeIndex, setThemeIndex] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [gravity, setGravity] = useState(0.34)
  const [trail, setTrail] = useState(true)
  const [particles, setParticles] = useState(true)
  const [running, setRunning] = useState(true)
  const [seed, setSeed] = useState(1)

  const theme = THEMES[themeIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let last = performance.now()
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.floor(rect.width * dpr)
      canvas.height = Math.floor(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const rect = () => canvas.getBoundingClientRect()
    const bounds = () => {
      const r = rect()
      return { w: r.width, h: r.height }
    }

    let b = {
      x: 0.5,
      y: 0.5,
      vx: 0.46,
      vy: -0.72,
      radius: 18,
      hue: 0,
    }

    const history: { x: number; y: number }[] = []
    const sparks: { x: number; y: number; vx: number; vy: number; life: number; color: string }[] = []

    const reset = () => {
      b = {
        x: 0.5,
        y: 0.5,
        vx: (0.45 + ((seed * 13) % 17) / 100) * (seed % 2 ? 1 : -1),
        vy: -0.72,
        radius: 18,
        hue: seed * 47,
      }
      history.length = 0
      sparks.length = 0
    }
    reset()

    const spawnSparks = (x: number, y: number, color: string) => {
      if (!particles) return
      for (let i = 0; i < 16; i++) {
        const a = Math.random() * Math.PI * 2
        const v = 0.7 + Math.random() * 2.2
        sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color })
      }
    }

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 16.666, 2)
      last = now
      const { w, h } = bounds()

      ctx.fillStyle = theme.background
      ctx.fillRect(0, 0, w, h)

      const cx = w / 2
      const cy = h / 2
      const ringR = Math.min(w, h) * 0.34

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(Math.sin(now * 0.00035) * 0.12)
      ctx.strokeStyle = theme.colors[1] + '55'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, ringR, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = theme.colors[0] + '20'
      ctx.lineWidth = 14
      ctx.beginPath()
      ctx.arc(0, 0, ringR + 10, 0.25, Math.PI * 1.6)
      ctx.stroke()
      ctx.restore()

      if (running) {
        b.vy += gravity * 0.025 * dt * speed
        b.x += b.vx * 0.00155 * dt * speed
        b.y += b.vy * 0.00155 * dt * speed

        const dx = (b.x - 0.5) * w
        const dy = (b.y - 0.5) * h
        const distance = Math.hypot(dx, dy)
        const maxR = ringR - b.radius - 2

        if (distance > maxR) {
          const nx = dx / distance
          const ny = dy / distance
          b.x = 0.5 + (nx * maxR) / w
          b.y = 0.5 + (ny * maxR) / h
          const dot = b.vx * nx + b.vy * ny
          b.vx -= 2 * dot * nx
          b.vy -= 2 * dot * ny
          b.vx *= 0.995
          b.vy *= 0.995
          b.radius = Math.min(b.radius + 0.22, 42)
          b.hue += 63
          const color = theme.colors[Math.floor(Math.abs(b.hue / 63)) % theme.colors.length]
          spawnSparks(cx + nx * maxR, cy + ny * maxR, color)
        }

        history.push({ x: cx + dx, y: cy + dy })
        if (history.length > 85) history.shift()
      }

      if (trail && history.length > 1) {
        for (let i = 1; i < history.length; i++) {
          const p = history[i]
          const alpha = i / history.length
          ctx.beginPath()
          ctx.strokeStyle = theme.colors[i % theme.colors.length] + Math.floor(alpha * 90).toString(16).padStart(2, '0')
          ctx.lineWidth = 1 + alpha * 5
          ctx.moveTo(history[i - 1].x, history[i - 1].y)
          ctx.lineTo(p.x, p.y)
          ctx.stroke()
        }
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i]
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.vy += 0.018 * dt
        s.life -= 0.022 * dt
        if (s.life <= 0) sparks.splice(i, 1)
        else {
          ctx.globalAlpha = s.life
          ctx.fillStyle = s.color
          ctx.beginPath()
          ctx.arc(s.x, s.y, 2.2 * s.life, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      ctx.globalAlpha = 1

      const dx = (b.x - 0.5) * w
      const dy = (b.y - 0.5) * h
      const bx = cx + dx
      const by = cy + dy
      const color = theme.colors[Math.floor(Math.abs(b.hue / 63)) % theme.colors.length]

      ctx.save()
      ctx.shadowBlur = 36
      ctx.shadowColor = color
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      const g = ctx.createRadialGradient(bx - b.radius * 0.3, by - b.radius * 0.35, 1, bx, by, b.radius)
      g.addColorStop(0, '#ffffff')
      g.addColorStop(0.18, color)
      g.addColorStop(1, color + '22')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(bx, by, b.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      if (running) raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [theme, speed, gravity, trail, particles, running, seed])

  const regenerate = () => setSeed((s) => s + 1)

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✦</span> HYPNORAI</div>
        <div className="tagline">Create. Mesmerize. Repeat.</div>
      </header>

      <section className="workspace">
        <div className="preview-card">
          <div className="preview-top">
            <div><span className="status-dot" /> LIVE PREVIEW</div>
            <button className="ghost-btn" onClick={() => setRunning((v) => !v)}>{running ? 'Pause' : 'Play'}</button>
          </div>
          <div className="canvas-wrap">
            <canvas ref={canvasRef} />
            <div className="preview-caption">INFINITE BOUNCE · SEED {seed}</div>
          </div>
        </div>

        <aside className="controls">
          <div className="eyebrow">V1 / EXPERIMENT</div>
          <h1>Make something<br /><em>mesmerizing.</em></h1>
          <p className="intro">Un moteur de visuels hypnotiques en temps réel. Change les règles et regarde la simulation évoluer.</p>

          <div className="control-group">
            <label>Template</label>
            <div className="template-card active">
              <div className="template-icon">◉</div>
              <div><strong>Infinite Bounce</strong><span>Balle · anneau · collisions</span></div>
            </div>
          </div>

          <div className="control-group">
            <label>Palette</label>
            <div className="palette-row">
              {THEMES.map((t, i) => (
                <button key={t.name} className={themeIndex === i ? 'palette active' : 'palette'} onClick={() => setThemeIndex(i)} title={t.name}>
                  {t.colors.map((c) => <span key={c} style={{ background: c }} />)}
                </button>
              ))}
            </div>
          </div>

          <div className="control-group">
            <div className="slider-label"><label>Speed</label><b>{speed.toFixed(1)}×</b></div>
            <input type="range" min="0.4" max="2.4" step="0.1" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </div>

          <div className="control-group">
            <div className="slider-label"><label>Gravity</label><b>{gravity.toFixed(2)}</b></div>
            <input type="range" min="0" max="0.8" step="0.01" value={gravity} onChange={(e) => setGravity(Number(e.target.value))} />
          </div>

          <div className="toggles">
            <button onClick={() => setTrail((v) => !v)} className={trail ? 'toggle on' : 'toggle'}><span /> Trail <b>{trail ? 'ON' : 'OFF'}</b></button>
            <button onClick={() => setParticles((v) => !v)} className={particles ? 'toggle on' : 'toggle'}><span /> Particles <b>{particles ? 'ON' : 'OFF'}</b></button>
          </div>

          <button className="generate" onClick={regenerate}><span>✦</span> Generate new variation</button>
          <div className="microcopy">V1 prototype · browser simulation · deterministic seed</div>
        </aside>
      </section>
    </main>
  )
}

export default App
