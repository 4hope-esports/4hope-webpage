# 4hope-webpage

Official website for 4Hope — TFT + League player registration, profiles, and team management.

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
| `feature/*` | In-progress feature work |

## License

See [LICENSE](./LICENSE).
