import type { Metadata } from 'next'
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
      <body>{children}</body>
    </html>
  )
}
