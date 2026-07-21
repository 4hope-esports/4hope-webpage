import fs from 'fs/promises'
import path from 'path'

export type SiteConfig = {
  team: { name: string; tagline: string; description: string }
  links: { discord: string }
}

export async function getConfig(): Promise<SiteConfig> {
  // Reads from JSON for now — swap with Prisma queries later
  const filePath = path.join(process.cwd(), 'public/data/config.json')
  const raw = await fs.readFile(filePath, 'utf-8')
  return JSON.parse(raw) as SiteConfig
}
