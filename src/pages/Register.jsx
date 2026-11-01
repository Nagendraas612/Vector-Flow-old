import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { humanError, useAuth } from '../lib/auth.jsx'
import FileUpload from '../components/FileUpload.jsx'

export default function Register() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    usn: '',
    branch: '',
    semester: '',
    phone: '',
    paymentScreenshotUrl: '',
  })

  useEffect(() => {
    api(`/api/events/${slug}`)
      .then((res) => {
        if (res.ok) setEvent(res.data)
        else setError(humanError(res.error))
      })
      .catch(() => setError('Could not load this event. Please try again.'))
  }, [slug])

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name || '',
        usn: f.usn || user.usn || '',
        branch: f.branch || user.branch || '',
        semester: f.semester || (user.semester ? String(user.semester) : ''),
        phone: f.phone || user.phone || '',
      }))
    }
  }, [user])

  if (loading) return <p>Loading.</p>
  if (!user) {
    return (
      <p>
        Please <Link to="/sign-in">sign in with your college account</Link> before registering.
      </p>
    )
  }
  if (error) return <p className="error">{error}</p>
  if (!event) return <p>Loading event.</p>
  if (event.registrationMode === 'EXTERNAL') {
    return (
      <section>
        <h1>{event.title}</h1>
        <p>
          Registration for this event happens on an external form:{' '}
          <a href={event.externalRegistrationUrl} target="_blank" rel="noreferrer">
            Open the external form
          </a>
        </p>
      </section>
    )
  }
  if (done) {
    return (
      <section>
        <h1>Registered</h1>
        <p>
          You are registered for {event.title}. You can see this registration on your{' '}
          <Link to="/participation">Participation page</Link>.
        </p>
      </section>
    )
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.usn.trim()) {
      setError('Name and USN are required.')
      return
    }
    if (event.feeType === 'PAID' && !form.paymentScreenshotUrl) {
      setError('This is a paid event. Please upload your payment screenshot first.')
      return
    }
    setSubmitting(true)
    const res = await api(`/api/events/${slug}/register`, {
      method: 'POST',
      body: JSON.stringify({
        name: form.name.trim(),
        usn: form.usn.trim(),
        branch: form.branch.trim() || null,
        semester: form.semester ? Number(form.semester) : null,
        phone: form.phone.trim() || null,
        paymentScreenshotUrl: form.paymentScreenshotUrl || null,
      }),
    })
    setSubmitting(false)
    if (res.ok) setDone(true)
    else setError(humanError(res.error))
  }

  return (
    <section>
      <h1>Register for {event.title}</h1>
      {event.feeType === 'PAID' ? (
        <p>
          Fee: Rs. {event.feeAmount}. Pay {event.paymentReceiverName || 'the receiver shown on the event page'}{' '}
          by UPI, then upload the screenshot below. Your registration stays under review until an
          admin checks it.
        </p>
      ) : (
        <p>This event is free. No payment step is needed.</p>
      )}
      <form onSubmit={submit} className="form">
        <label>
          Full name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        <label>
          USN
          <input value={form.usn} onChange={(e) => set('usn', e.target.value)} required />
        </label>
        <label>
          Branch
          <input value={form.branch} onChange={(e) => set('branch', e.target.value)} />
        </label>
        <label>
          Semester
          <input
            type="number"
            min="1"
            max="12"
            value={form.semester}
            onChange={(e) => set('semester', e.target.value)}
          />
        </label>
        <label>
          Phone (optional)
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        {event.feeType === 'PAID' ? (
          <FileUpload
            purpose="payment-screenshot"
            label="Payment screenshot (JPG, PNG or WebP, up to 5 MB)"
            value={form.paymentScreenshotUrl}
            onUploaded={(url) => set('paymentScreenshotUrl', url)}
          />
        ) : null}
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Registering, please wait.' : 'Register'}
        </button>
      </form>
      <p>
        <button type="button" onClick={() => navigate(`/events/${slug}`)}>
          Back to event
        </button>
      </p>
    </section>
  )
}
