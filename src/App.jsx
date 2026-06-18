import { useEffect, useState } from 'react'
import logo from '/brand/logo.png'
import './App.css'

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z" />
    </svg>
  )
}

function App() {
  const [config, setConfig] = useState(null)

  useEffect(() => {
    fetch('/data/config.json')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => {})
  }, [])

  const discordLink = config?.links?.discord || '#'

  return (
    <>
      <div className="hero">
        <img src={logo} alt="4Hope logo" className="logo" />

        <h1 className="tagline">
          <span className="gold">Four titles.</span><br />One squad.
        </h1>

        <div className="divider" />

        <div className="team-info">
          <span className="kicker">// Who we are</span>
          <p>
            {config?.team?.description ||
              "We're a competitive gaming organization built on grit, camaraderie, and a little luck. Our squads compete across multiple titles — united by one mission: play for keeps."}
          </p>
          <p>
            Whether you're a player looking for your next squad, a fan looking to ride along, or a creator looking to build something — you're in the right place.
          </p>
        </div>

        <a className="cta" href={discordLink} target="_blank" rel="noopener noreferrer">
          <DiscordIcon />
          Join Squad
        </a>
      </div>

      <div className="footer">4Hope &copy; 2026</div>
    </>
  )
}

export default App
