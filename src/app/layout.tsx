import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Navbar } from '@/components/navbar'
import { getConfig } from '@/lib/config'
import './globals.css'

export const metadata: Metadata = {
  title: '4Hope — Play For Keeps',
  description: "We're a gaming crew built on good vibes, camaraderie, and a little luck.",
  icons: {
    icon: [
      {
        url: '/brand/favicon.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/brand/favicon.svg',
        type: 'image/svg+xml',
        media: '(prefers-color-scheme: dark)',
      },
      { url: '/brand/favicon.ico', sizes: 'any' },
    ],
    apple: '/brand/apple-touch-icon.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const config = await getConfig()

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@700;800;900&family=Inter:wght@400;500;600&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <meta name="theme-color" content="#0c0c0d" />
      </head>
      <body>
        <Navbar discordHref={config.links.discord} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
