'use client'

import { useEffect, useRef, useState } from 'react'
import { GoldBars } from './GoldBars'

export type LoadingVariant = 'Match loading' | 'Squad boot' | 'Server queue' | 'TFT'

const MESSAGE_SETS: Record<LoadingVariant, string[]> = {
  'Match loading': [
    "Respawning your last brain cell…",
    "Untangling spaghetti netcode…",
    "Feeding the RNG gods their tribute…",
    "Reticulating splines. No, really, that's a real thing.",
    "Downloading more RAM… (this is a joke, please don't @ us)",
    "Convincing the server you're not AFK…",
    "Calibrating rage-quit threshold…",
    "Loading hopium reserves to maximum…",
    "Buffering excuses for the next loss…",
    "Checking if it's actually a skill issue…",
    "Polishing the gold stripe for good luck…",
    "Waiting on that one teammate to lock in…",
  ],
  'Squad boot': [
    "Waking up the support who's always 'one more game'…",
    "Reminding the jungler where the jungle is…",
    "Muting comms preemptively…",
    "Syncing everyone's excuses into one shared doc…",
    "Assigning blame in advance, just in case…",
    "Charging the clover for maximum luck…",
    "Making sure the IGL actually has a plan this time…",
    "Counting how many mains got banned again…",
  ],
  'Server queue': [
    "You are number 4,207 in queue. Ish.",
    "Estimated wait: shorter than your last losing streak…",
    "Server is thinking really hard about letting you in…",
    "Queue popped. Just kidding. Still loading…",
    "Fetching a server that isn't on fire…",
    "Negotiating ping with the matchmaking gods…",
    "Making sure your queue partner isn't tilted…",
    "Almost there. Definitely. Probably.",
  ],
  TFT: [
    "Praying to the RNG gods for a 3-star carry…",
    "Pretending we scouted lobbies instead of tabbing out…",
    "Rolling down to 0 gold on level 6, as tradition demands…",
    "Convincing ourselves 8th place still counts as a win…",
    "Loot orbs incoming. Please contain your excitement…",
    "Reforging the same bad item for the 4th time…",
    "Calculating the odds of hitting 2-star on 1 copy left…",
    "Netting a portal that helps literally nobody…",
    "Blaming the augment instead of our positioning…",
    "Slow-rolling like we actually have a plan…",
    "Checking if anyone else is also 3 stars behind…",
    "Summoning the little legend that judges us the hardest…",
  ],
}

const HEADLINES: Record<LoadingVariant, string> = {
  'Match loading': 'LOADING MATCH',
  'Squad boot': 'BOOTING SQUAD',
  'Server queue': 'JOINING QUEUE',
  TFT: 'LOADING CAROUSEL',
}

// Tip rotation is fixed at 7s — not exposed as a prop.
const TIP_SECONDS = 7

interface LoadingScreenProps {
  /**
   * Picks the gamer-humor tip pool (and the default headline) — this is a
   * composition primitive, so there's no default: the page that renders it
   * knows what it's actually waiting on (a lobby list, a specific match,
   * a squad roster, ...) and should say so explicitly.
   */
  variant: LoadingVariant
  /** Overrides the variant's default headline — use this to say what's loading in this page's own words (e.g. "LOADING LOBBY"). */
  title?: string
  /** How long the fake progress bar takes to sweep once, in seconds. */
  loadingSeconds?: number
  showPercent?: boolean
  showTip?: boolean
  className?: string
}

export function LoadingScreen({
  variant,
  title,
  loadingSeconds = 6,
  showPercent = true,
  showTip = true,
  className,
}: LoadingScreenProps) {
  const messages = MESSAGE_SETS[variant]
  const barRef = useRef<HTMLDivElement>(null)
  const tipRef = useRef<HTMLParagraphElement>(null)
  const pctRef = useRef(4)
  const [pct, setPct] = useState(4)
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const step = 100 / ((loadingSeconds * 1000) / 220)
    const pctTimer = setInterval(() => {
      pctRef.current += step
      if (pctRef.current >= 100) pctRef.current = 4
      const rounded = Math.round(pctRef.current)
      if (barRef.current) barRef.current.style.width = `${rounded}%`
      setPct(rounded)
    }, 220)
    return () => clearInterval(pctTimer)
  }, [loadingSeconds])

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIndex((i) => (i + 1) % messages.length)
    }, TIP_SECONDS * 1000)
    return () => clearInterval(msgTimer)
  }, [messages.length])

  const joke = messages[msgIndex % messages.length]

  return (
    <div
      className={`relative flex min-h-screen flex-1 items-center justify-center overflow-hidden bg-ink-1000 px-6 py-16 text-white ${className ?? ''}`}
    >
      <style>{`
        @keyframes lsSpin { to { transform: rotate(360deg) } }
        @keyframes lsFade {
          0% { opacity: 0; transform: translateY(6px) }
          8% { opacity: 1; transform: translateY(0) }
          92% { opacity: 1; transform: translateY(0) }
          100% { opacity: 0; transform: translateY(-6px) }
        }
      `}</style>
      <GoldBars />
      <div className="relative w-full max-w-[560px] text-center">
        <div className="mb-5.5 flex items-center justify-center gap-3.5">
          <span
            className="inline-block h-6.5 w-6.5 shrink-0 rounded-full border-[3px] border-gold-500/20 border-t-gold-500"
            style={{ animation: 'lsSpin 0.7s linear infinite' }}
          />
          <h1 className="m-0 font-display text-[clamp(28px,4vw,44px)] font-black uppercase tracking-[-0.02em]">
            {title ?? HEADLINES[variant]}
          </h1>
        </div>

        {showPercent ? (
          <div className="mx-auto mb-6.5 max-w-[380px]">
            <div className="mb-1.5 flex justify-between font-mono text-[11px] tracking-[0.12em] text-white/50">
              <span>PROGRESS</span>
              <span className="text-gold-500">{pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div ref={barRef} className="h-full rounded-full bg-gold-500 transition-[width] duration-200 ease-linear" style={{ width: '4%' }} />
            </div>
          </div>
        ) : null}

        <div className="flex min-h-[52px] items-center justify-center">
          {showTip ? (
            <p
              key={joke}
              ref={tipRef}
              className="m-0 max-w-[46ch] text-[16px] leading-relaxed text-white/78"
              style={{ animationName: 'lsFade', animationDuration: `${TIP_SECONDS}s`, animationTimingFunction: 'ease', animationFillMode: 'both' }}
            >
              <span className="font-mono tracking-[0.02em] text-gold-500">{'// '}</span>
              {joke}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
