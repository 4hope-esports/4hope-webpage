# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

4hope-webpage is the official website for **4Hope** — a competitive gaming / esports organization (TFT + League). It's a Next.js 16 (App Router) + React 19 + TypeScript app using Tailwind CSS 4, NextAuth (Google sign-in), and Firebase Admin (Firestore) for server-side data, plus the Riot Games API for roster/stat data. See `README.md` for setup.

Player-run lobbies (leaderboard rooms) live under `src/app/lobbies/` (routes were renamed from `tournament/leaderboard/*` to `lobbies/*`).

## Branch Strategy

- `main` — stable/production
- `dev` — integration branch
- `feature/*` — in-progress feature work (current: `feature/leaderboard`)

## Design System

The 4Hope design system lives in a Claude Design project (`bf19a7b9-95fb-4b5d-b469-d5ba30c2f9be`). Use `/design-sync` to access it. The system pairs the "Simple Design System" (Figma Community) token architecture with the 4Hope brand.

### Brand Identity

Athletic, scrappy, underdog-with-swagger. The "hope" + four-leaf-clover play on "4HOPE." Built for stream overlays, player cards, match pages, rosters, and merch.

### Colors

- **Ink** `--ink-1000: #0C0C0D` — default backdrop
- **Gold** `--gold-500: #F2C200` — single accent color (primary actions, active states, focus rings, key stats, stripe motif)
- **White** `#FFFFFF` — type on ink
- Text on gold is **always ink**, never white
- One gold element per view wins — don't flood with gold
- Semantic colors: green (win), red (loss/danger), yellow (warning) from inherited tokens

### Typography

- **Display — Archivo** (700–900, tracking −0.02em, UPPERCASE): headlines, button labels, stat figures
- **Brand Display — TT Bluescreens Trial** (Bold Italic): hero wordmark / signature moments
- **Body — Inter** (400/500/600, leading 1.5–1.55): reading and UI text
- **Mono — Roboto Mono** (400/500/700): kickers, stats, lobby codes, timers (often `//` prefixed, UPPERCASE, wide tracking)

### Spacing & Corners

- 4px base unit (`--space-*`: 4/8/12/16/24/32/48…)
- Controls (buttons, inputs, tags): 8px radius
- Cards: 14px radius
- Tags: 6px radius
- Pills/avatars: fully round

### Surfaces & Effects

- Dark "arena" theme: add `class="arena"` to a wrapper
- Signature background: ink black with diagonal gold bars (≈ −32°) for heroes/section headers
- Borders: hairline 1px. On ink: `rgba(255,255,255,0.10–0.12)`
- Shadows sparingly; on ink show elevation with a gold 1px ring on hover
- Focus: gold ring `0 0 0 3px` at 26% opacity + solid gold border
- No glassmorphism. Modal blanket: `rgba(0,0,0,0.7)`

### Voice & Copy

- Direct, confident, slightly playful. Second person ("you", "your squad"). Never corporate.
- Headlines: UPPERCASE Archivo. Body: sentence case.
- Button labels: "Join squad", "Watch VOD", "Run it back" (not "Submit", "Learn more")
- Status labels: "LIVE", "GG", "WIN", "LOSS", "SUB NEEDED"
- No emoji in UI. The clover mark and gold stripe are the only decorative accents.

### Components (React, namespace `Ds4HopeDesignSystem_bf19a7`)

- **Core:** Button, IconButton, Tag, Badge, Avatar, AvatarGroup, Divider, Spinner
- **Forms:** Input, Textarea, Select, Checkbox, Radio, Switch, Slider, FormField
- **Navigation:** Tabs, NavPill, Pagination, Breadcrumb, MenuItem
- **Feedback:** Notification, Tooltip, ProgressBar, Dialog
- **Data:** Card, StatCard, Accordion
- **Icons:** Feather set (288 glyphs) via `<Icon name="Zap" size={20} />`, paints with `currentColor`

### Assets

- `assets/brand/logo.png` — stacked 4HO/PE wordmark with clover (use on ink)
- `assets/brand/banner.jpeg` — gold diagonal bars on black

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
