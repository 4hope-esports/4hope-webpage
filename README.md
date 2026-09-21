# 4hope-webpage

Official website for 4Hope — TFT + League player registration, profiles, and team management.

## Features

- **Auth** — Google sign-in via NextAuth, plus registration for new players.
- **Player profiles** — display info, Riot account linking (auto-fetches profile icon, ranked tier/rank/LP), and team membership, all editable from one dashboard.
- **Teams** — create a team, invite/join by code or invite link, leave, kick members, and promote a new owner; one team per user, unique team names enforced.
- **Lobbies & live leaderboard** — browse/search/create scheduled League or TFT lobbies, join with approval, mand run a live-scored leaderboard (host controls, participant roles, cutoff lines, prizes) that locks once the lobby ends.

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS 4
- NextAuth (Auth.js) with Google sign-in
- Firebase Admin (Firestore) for server-side data
- Riot Games API for TFT/League roster data

## Development

Use Node 22 (see `.nvmrc`):

```bash
nvm use
npm install
cp .env.example .env.local   # fill in the required values
npm run dev
```

See `.env.example` for the full list of required environment variables (Riot API, Firebase Admin, NextAuth/Google OAuth, site copy).

## Branches

| Branch | Purpose |
|---|---|
| `main` | Production-ready code |
| `dev` | Integration branch |
| `feature/*` | In-progress feature work |

## License

See [LICENSE](./LICENSE).
