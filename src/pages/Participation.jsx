import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../lib/auth.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatDate } from '../components/PosterCard.jsx'

// Protected page: the wrapper in App.jsx only renders this after
// /api/auth/me succeeds, and the server only returns the caller's
// own registrations, so one student can never see another's list.
export default function Participation() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api('/api/me/registrations')
      .then((res) => {
        if (res.ok) setItems(res.data)
        else setError('Could not load your registrations. Please try again.')
      })
      .catch(() => setError('Could not load your registrations. Please try again.'))
  }, [])

  if (error) return <p className="error">{error}</p>
  if (items === null) return <p>Loading your registrations.</p>

  return (
    <section>
      <h1>My Participation</h1>
      {items.length === 0 ? (
        <p>
          You have not registered for any event yet. <Link to="/">Browse events</Link>.
        </p>
      ) : (
        <div className="grid">
          {items.map((item) => (
            <article key={item.id} className="card">
              <h3>
                <Link to={`/events/${item.event.slug}`}>{item.event.title}</Link>
              </h3>
              <p className="muted">
                {formatDate(item.event.startAt)}
                {item.event.venue ? ` · ${item.event.venue}` : ''}
              </p>
              <p>
                Fee: {item.event.feeType === 'PAID' ? `Rs. ${item.event.feeAmount}` : 'Free'}
              </p>
              <p>
                <StatusBadge
                  paymentStatus={item.paymentStatus}
                  attendance={item.attendance}
                  status={item.status}
                />
              </p>
              <p className="muted">Registered on {formatDate(item.registeredAt)}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
