import { Link } from 'react-router-dom'

export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function FeeBadge({ event }) {
  if (event.feeType === 'PAID') {
    return <span className="badge badge-paid">Rs. {event.feeAmount}</span>
  }
  return <span className="badge badge-free">Free</span>
}

export default function PosterCard({ event }) {
  return (
    <article className="card">
      {event.posterImageUrl ? (
        <img className="card-poster" src={event.posterImageUrl} alt={`Poster for ${event.title}`} />
      ) : null}
      <h3>
        <Link to={`/events/${event.slug}`}>{event.title}</Link>
      </h3>
      <p className="muted">
        {formatDate(event.startAt)}
        {event.venue ? ` · ${event.venue}` : ''}
      </p>
      <p>
        <FeeBadge event={event} />{' '}
        {event.registrationMode === 'EXTERNAL' ? <span className="badge">External form</span> : null}
      </p>
      <p>
        <Link className="button" to={`/events/${event.slug}`}>
          View details
        </Link>
      </p>
    </article>
  )
}
