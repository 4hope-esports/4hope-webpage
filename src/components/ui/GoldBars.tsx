const BARS = [
  { w: 480, t: -60, l: -100 },
  { w: 260, t: 40, l: 20 },
  { w: 480, b: -20, r: -100 },
  { w: 260, b: 80, r: 20 },
  { w: 320, t: -30, r: -60 },
]

export function GoldBars() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {BARS.map((b, i) => (
        <span
          key={i}
          className="absolute h-11 rounded"
          style={{
            width: b.w,
            top: b.t,
            left: b.l,
            bottom: b.b,
            right: b.r,
            background: 'var(--color-gold-500)',
            opacity: i % 2 ? 0.14 : 0.22,
            transform: 'rotate(-32deg)',
          }}
        />
      ))}
    </div>
  )
}
