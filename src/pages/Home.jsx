import { useEffect, useState } from 'react'
import { api } from '../lib/api.js'
import PosterCard from '../components/PosterCard.jsx'

// Sprint 1 Home: real published events from the server. The Sprint 0
// coming-soon text is gone from here: if there are no events, the page
// says so plainly instead of pretending the site is still coming soon.
export default function Home() {
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/events')
      .then((res) => {
        if (res.ok) setEvents(res.data)
        else setError('Could not load events. Please try again.')
      })
      .catch(() => setError('Could not load events. Please try again.'))
  }, [])

  return (
    <section>
      <h1>Vector Flow</h1>
      <p>
        Official website of Vector Flow, the CSE (AI &amp; ML) club at VVCE Mysore.
        Sign in with your college account to register for events.
      </p>
      {error ? <p className="error">{error}</p> : null}
      {events === null && !error ? <p>Loading events.</p> : null}
      {events && events.length === 0 ? <p>No upcoming events yet. Please check back soon.</p> : null}
      {events && events.length > 0 ? (
        <div className="grid">
          {events.map((event) => (
            <PosterCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </section>
  )
}
