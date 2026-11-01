import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { humanError, useAuth } from '../lib/auth.jsx'
import { FeeBadge, formatDate } from '../components/PosterCard.jsx'

export default function EventDetail() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/events/${slug}`)
      .then((res) => {
        if (res.ok) setEvent(res.data)
        else setError(humanError(res.error))
      })
      .catch(() => setError('Could not load this event. Please try again.'))
  }, [slug])

  if (error) return <p className="error">{error}</p>
  if (!event) return <p>Loading event.</p>

  const registrationClosed =
    event.registrationClosesAt && new Date(event.registrationClosesAt) < new Date()

  return (
    <section>
      <h1>{event.title}</h1>
      {event.posterImageUrl ? (
        <img className="detail-poster" src={event.posterImageUrl} alt={`Poster for ${event.title}`} />
      ) : null}
      <p>{event.description}</p>
      <p>
        <strong>Date:</strong> {formatDate(event.startAt)}
        {event.endAt ? ` to ${formatDate(event.endAt)}` : ''}
      </p>
      {event.venue ? (
        <p>
          <strong>Venue:</strong> {event.venue} ({event.mode === 'ONLINE' ? 'Online' : 'Onsite'})
        </p>
      ) : null}
      <p>
        <strong>Fee:</strong> <FeeBadge event={event} />
      </p>
      {event.feeType === 'PAID' ? (
        <div className="notice">
          <p>
            <strong>Pay by UPI to:</strong> {event.paymentReceiverName || 'See the QR below'}
            {event.paymentReceiverContact ? ` (${event.paymentReceiverContact})` : ''}
          </p>
          {event.paymentQrImageUrl ? (
            <img className="qr" src={event.paymentQrImageUrl} alt="Payment QR for this event" />
          ) : null}
          <p>
            After paying, upload your payment screenshot in the registration form.
            Paying a different event&apos;s receiver does not count for this event.
          </p>
        </div>
      ) : null}
      {event.driveLink ? (
        <p>
          <a href={event.driveLink} target="_blank" rel="noreferrer">
            Event materials (Drive)
          </a>
        </p>
      ) : null}
      {event.registrationMode === 'EXTERNAL' ? (
        <p>
          <a className="button" href={event.externalRegistrationUrl} target="_blank" rel="noreferrer">
            Register on the external form
          </a>
        </p>
      ) : registrationClosed ? (
        <p>Registration for this event is closed.</p>
      ) : user ? (
        <p>
          <Link className="button" to={`/events/${event.slug}/register`}>
            Register for this event
          </Link>
        </p>
      ) : (
        <p>
          <Link className="button" to="/sign-in">
            Sign in to register
          </Link>
        </p>
      )}
    </section>
  )
}
