import { ShoppingBag } from 'lucide-react'
import type { SiteConfig } from '@/lib/config'

export function ShopSection({ config }: { config: SiteConfig }) {
  return (
    <section id="shop" className="relative overflow-hidden bg-ink-1000 px-6 py-20 sm:py-28">
      <div className="absolute right-10 -bottom-[20%] w-[70px] h-[70%] bg-gold-500/12 -rotate-[32deg] rounded-[6px] pointer-events-none" />

      <div className="relative mx-auto flex max-w-xl flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/10 text-gold-500">
          <ShoppingBag size={22} />
        </div>
        <span className="font-mono text-xs font-medium tracking-[0.12em] uppercase text-gold-500">// Merch</span>
        <h2 className="font-display font-[900] text-[clamp(1.5rem,4vw,2.25rem)] uppercase tracking-tight">Shop</h2>
        <p className="max-w-sm text-sm leading-relaxed text-white/60">
          Jerseys, hoodies, and clover pins are in the works. Join Discord to get first pick when the drop goes live.
        </p>
        <a
          className="mt-2 inline-flex items-center gap-2.5 px-7 py-3 bg-gold-500 text-ink-1000 font-display font-extrabold text-sm tracking-wide uppercase no-underline rounded-lg hover:bg-gold-400 transition-colors"
          href={config.links.discord}
          target="_blank"
          rel="noopener noreferrer"
        >
          Notify me
        </a>
      </div>
    </section>
  )
}
