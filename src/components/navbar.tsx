'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Teams', href: '/teams' },
  { label: 'Matches', href: '/matches' },
  { label: 'News', href: '/news' },
  { label: 'Shop', href: '/shop' },
]

export function Navbar({ discordHref }: { discordHref: string }) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close the mobile/tablet menu on route change and keep body scroll in sync with it
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-ink-1000/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/brand/logo.png" alt="4Hope" width={32} height={32} />
          <span className="font-display text-sm font-[900] uppercase tracking-wide">4Hope</span>
        </Link>

        {/* Top menu — visible on desktop/laptop only */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-display text-xs font-bold uppercase tracking-wide transition-colors hover:text-gold-500 ${
                  active ? 'text-gold-500' : 'text-white/70'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <a
          href={discordHref}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex items-center rounded-lg bg-gold-500 px-5 py-2.5 font-display text-xs font-extrabold uppercase tracking-wide text-ink-1000 transition-colors hover:bg-gold-400"
        >
          Join squad
        </a>

        {/* Sandwich menu — visible on phone/tablet only */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-white transition-colors hover:text-gold-500 lg:hidden"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Phone/tablet dropdown panel */}
      <nav
        id="mobile-menu"
        className={`absolute inset-x-0 top-full border-t border-white/10 bg-ink-1000 px-6 transition-[max-height,opacity] duration-200 ease-out lg:hidden ${
          open ? 'max-h-[calc(100vh-4rem)] overflow-y-auto py-4 opacity-100' : 'pointer-events-none max-h-0 overflow-hidden py-0 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-3 font-display text-sm font-bold uppercase tracking-wide transition-colors hover:bg-white/5 hover:text-gold-500 ${
                  active ? 'text-gold-500' : 'text-white/80'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
          <a
            href={discordHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-gold-500 px-5 py-3 font-display text-sm font-extrabold uppercase tracking-wide text-ink-1000 transition-colors hover:bg-gold-400"
          >
            Join squad
          </a>
        </div>
      </nav>
    </header>
  )
}
