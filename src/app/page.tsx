import fs from 'fs/promises'
import path from 'path'
import Image from 'next/image'

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  )
}

async function getConfig() {
  // Reads from JSON for now — swap with Prisma queries later
  const filePath = path.join(process.cwd(), 'public/data/config.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as {
    team: { name: string; tagline: string; description: string }
    links: { discord: string }
  }
}

export default async function Home() {
  const config = await getConfig()

  return (
    <>
      <div className="relative flex flex-col items-center justify-center min-h-screen gap-5 px-6 py-8 text-center overflow-hidden">
        {/* Gold bars */}
        <div className="fixed right-[150px] -bottom-[5%] w-[90px] h-[55%] bg-gold-500/20 -rotate-[32deg] rounded-[6px] pointer-events-none z-0" />
        <div className="fixed right-5 -bottom-[10%] w-[80px] h-[55%] bg-gold-500/14 -rotate-[32deg] rounded-[6px] pointer-events-none z-0" />

        <Image
          src="/brand/logo.png"
          alt="4Hope logo"
          width={100}
          height={100}
          className="relative z-10 drop-shadow-[0_0_32px_rgba(242,194,0,0.15)]"
          priority
        />

        <h1 className="relative z-10 font-display font-[900] text-[clamp(1.75rem,5vw,2.75rem)] tracking-tight uppercase leading-tight">
          {config.team.tagline}
        </h1>

        <div className="relative z-10 w-12 h-0.5 bg-gold-500 rounded-sm opacity-50" />

        <div className="relative z-10 flex flex-col gap-2 mt-1 max-w-[520px]">
          <span className="font-mono text-xs font-medium tracking-[0.12em] uppercase text-gold-500">
            // Who we are
          </span>
          <p className="text-sm leading-relaxed text-white/60">
            {config.team.description}
          </p>
          <p className="text-sm leading-relaxed text-white/60">
            Whether you&apos;re looking for a squad to run games with or create content for fun — you&apos;re in the right place.
          </p>
        </div>

        <a
          className="relative z-10 inline-flex items-center gap-2.5 mt-2 px-7 py-3 bg-gold-500 text-ink-1000 font-display font-extrabold text-base tracking-wide uppercase no-underline rounded-lg hover:bg-gold-400 transition-colors"
          href={config.links.discord}
          target="_blank"
          rel="noopener noreferrer"
        >
          <DiscordIcon />
          Join Squad
        </a>
      </div>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 font-mono text-[0.6875rem] text-white/30 tracking-[0.08em] uppercase">
        4Hope &copy; 2026
      </div>
    </>
  )
}
