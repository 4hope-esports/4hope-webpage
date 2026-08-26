'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'

interface NavLink {
  label: string
  href: string
}

interface NavigationProps {
  discordUrl: string
}

const LINKS: NavLink[] = [
  { label: 'Home', href: '#home' },
  { label: 'Roster', href: '#roster' },
]

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  )
}

export function Navigation({ discordUrl }: NavigationProps) {
  const [active, setActive] = useState('#home')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.href.slice(1))).filter(
      (el): el is HTMLElement => el !== null,
    )

    if (sections.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActive(`#${visible[0].target.id}`)
        }
      },
      { rootMargin: '-64px 0px -85% 0px' },
    )

    sections.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const isHome = active === '#home'

  const meetTheSquadButton = (
    <a
      href={discordUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setMenuOpen(false)}
      className="inline-flex items-center gap-2 rounded-lg bg-gold-500 px-4 py-2 font-display text-sm font-extrabold uppercase tracking-wide text-ink-1000 no-underline transition-colors hover:bg-gold-400"
    >
      <DiscordIcon />
      Meet the squad
    </a>
  )

  const meetTheSquadButtonMobile = (
    <a
      href={discordUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => setMenuOpen(false)}
      className="flex items-center justify-center gap-2 rounded-lg bg-gold-500 px-4 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-ink-1000 no-underline transition-colors hover:bg-gold-400"
    >
      <DiscordIcon />
      Meet the squad
    </a>
  )

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-ink-1000/86 backdrop-blur-md">
      <div className="flex h-16 items-center gap-7 px-5 sm:px-7">
        <Image src="/brand/logo.png" alt="4Hope" width={34} height={34} className="h-[34px] w-[34px]" />

        <nav className="hidden gap-1 sm:flex">
          {LINKS.map((link) => {
            const isActive = active === link.href
            return (
              <a
                key={link.label}
                href={link.href}
                className={`border-b-2 px-3.5 py-2 font-display text-sm font-bold uppercase tracking-[0.04em] no-underline transition-colors ${
                  isActive ? 'border-gold-500 text-white' : 'border-transparent text-white/55 hover:text-white/80'
                }`}
              >
                {link.label}
              </a>
            )
          })}
        </nav>

        <div className="flex-1" />

        <div className="hidden sm:block">{!isHome && meetTheSquadButton}</div>

        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white sm:hidden"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="flex flex-col gap-1 border-t border-white/10 px-5 py-3 sm:hidden">
          {LINKS.map((link) => {
            const isActive = active === link.href
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`rounded-md px-3 py-2 font-display text-sm font-bold uppercase tracking-[0.04em] no-underline transition-colors ${
                  isActive ? 'bg-ink-800 text-white' : 'text-white/55 hover:text-white/80'
                }`}
              >
                {link.label}
              </a>
            )
          })}
          <div className="mt-3 border-t border-white/10 pt-3">{meetTheSquadButtonMobile}</div>
        </div>
      )}
    </header>
  )
}
