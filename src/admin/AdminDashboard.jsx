import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import { formatDate } from '../components/PosterCard.jsx'

// Minimal Sprint 1 admin home: the full dashboard (registrations,
// payment check, attendance) is Sprint 3. This page only lists events
// for editing and links to the event form. The server checks admin
// role on /api/events?admin=1, so a student who guesses this URL
// still gets FORBIDDEN from the server, not just a hidden page.
export default function AdminDashboard() {
  const { user } = useAuth()
  const [events, setEvents] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/events?admin=1')
      .then((res) => {
        if (res.ok) setEvents(res.data)
        else setError('You do not have access to the admin area.')
      })
      .catch(() => setError('Could not load events. Please try again.'))
  }, [])

  if (user && user.role !== 'ADMIN') {
    return <p>You do not have access to the admin area. Only admins can open it.</p>
  }
  if (error) return <p className="error">{error}</p>
  if (events === null) return <p>Loading events.</p>

  return (
    <section>
      <h1>Admin</h1>
      <p>
        <Link className="button" to="/admin/events/new">
          Create new event
        </Link>
      </p>
      {events.length === 0 ? (
        <p>No events yet. Create the first one.</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <Link to={`/events/${event.slug}`}>{event.title}</Link> — {event.status} —{' '}
              {formatDate(event.startAt)} —{' '}
              <Link to={`/admin/events/${event.slug}/edit`}>Edit</Link>
            </li>
          ))}
        </ul>
      )}
      <p className="muted">
        Registration lists, payment checks and attendance arrive in Sprint 3.
      </p>
    </section>
  )
}
