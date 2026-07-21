import { getConfig } from '@/lib/config'
import { Footer } from '@/components/footer'
import { HeroSection } from '@/components/sections/hero-section'
import { TeamsSection } from '@/components/sections/teams-section'
import { MatchesSection } from '@/components/sections/matches-section'
import { NewsSection } from '@/components/sections/news-section'
import { ShopSection } from '@/components/sections/shop-section'

export default async function Home() {
  const config = await getConfig()

  return (
    <>
      <HeroSection config={config} />
      <TeamsSection />
      <MatchesSection />
      <NewsSection />
      <ShopSection config={config} />
      <Footer />
    </>
  )
}
