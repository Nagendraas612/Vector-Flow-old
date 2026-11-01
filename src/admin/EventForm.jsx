import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { humanError, useAuth } from '../lib/auth.jsx'
import FileUpload from '../components/FileUpload.jsx'

const EMPTY = {
  title: '',
  slug: '',
  description: '',
  posterImageUrl: '',
  venue: '',
  mode: 'ONSITE',
  startAt: '',
  endAt: '',
  registrationOpensAt: '',
  registrationClosesAt: '',
  feeType: 'FREE',
  feeAmount: '',
  paymentReceiverName: '',
  paymentReceiverContact: '',
  paymentQrImageUrl: '',
  registrationMode: 'SITE',
  externalRegistrationUrl: '',
  driveLink: '',
  status: 'DRAFT',
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function toInput(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function EventForm() {
  const { slug } = useParams()
  const isNew = !slug
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(isNew)

  useEffect(() => {
    if (isNew) return
    api(`/api/events/${slug}`)
      .then((res) => {
        if (!res.ok) {
          setError(humanError(res.error))
          return
        }
        const e = res.data
        setForm({
          ...EMPTY,
          ...e,
          startAt: toInput(e.startAt),
          endAt: toInput(e.endAt),
          registrationOpensAt: toInput(e.registrationOpensAt),
          registrationClosesAt: toInput(e.registrationClosesAt),
          feeAmount: e.feeAmount ?? '',
        })
        setLoaded(true)
      })
      .catch(() => setError('Could not load this event. Please try again.'))
  }, [slug, isNew])

  if (loading) return <p>Loading.</p>
  if (user && user.role !== 'ADMIN') {
    return <p>You do not have access to the admin area. Only admins can open it.</p>
  }
  if (error) return <p className="error">{error}</p>
  if (!loaded) return <p>Loading event.</p>

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      if (field === 'title' && isNew) next.slug = slugify(value)
      return next
    })
  }

  async function submit(status) {
    setError('')
    if (!form.title.trim() || !form.description.trim() || !form.startAt) {
      setError('Title, description and start date are required.')
      return
    }
    if (form.feeType === 'PAID' && (!form.feeAmount || Number(form.feeAmount) <= 0)) {
      setError('A paid event needs a fee amount greater than zero.')
      return
    }
    if (status === 'PUBLISHED' && form.feeType === 'PAID') {
      if (!form.paymentReceiverName.trim() || !form.paymentReceiverContact.trim() || !form.paymentQrImageUrl) {
        setError('To publish a paid event, fill in the receiver name, receiver contact and QR image.')
        return
      }
    }
    if (status === 'PUBLISHED' && form.registrationMode === 'EXTERNAL' && !form.externalRegistrationUrl) {
      setError('To publish an external event, fill in the external registration link.')
      return
    }
    setSaving(true)
    const payload = {
      ...form,
      feeAmount: form.feeType === 'PAID' ? Number(form.feeAmount) : null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: form.endAt ? new Date(form.endAt).toISOString() : null,
      registrationOpensAt: form.registrationOpensAt ? new Date(form.registrationOpensAt).toISOString() : null,
      registrationClosesAt: form.registrationClosesAt ? new Date(form.registrationClosesAt).toISOString() : null,
      status,
    }
    const res = isNew
      ? await api('/api/events', { method: 'POST', body: JSON.stringify(payload) })
      : await api(`/api/events/${slug}`, { method: 'PUT', body: JSON.stringify(payload) })
    setSaving(false)
    if (!res.ok) {
      setError(humanError(res.error))
      return
    }
    navigate('/admin')
  }

  return (
    <section>
      <h1>{isNew ? 'Create event' : 'Edit event'}</h1>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          submit(form.status)
        }}
      >
        <label>
          Title
          <input value={form.title} onChange={(e) => set('title', e.target.value)} required />
        </label>
        <label>
          Short link (slug, small letters, numbers and hyphens only)
          <input value={form.slug} onChange={(e) => set('slug', e.target.value)} required />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => set('description', e.target.value)} required rows={5} />
        </label>
        <label>
          Venue
          <input value={form.venue} onChange={(e) => set('venue', e.target.value)} />
        </label>
        <label>
          Mode
          <select value={form.mode} onChange={(e) => set('mode', e.target.value)}>
            <option value="ONSITE">Onsite</option>
            <option value="ONLINE">Online</option>
          </select>
        </label>
        <label>
          Start date and time
          <input type="datetime-local" value={form.startAt} onChange={(e) => set('startAt', e.target.value)} required />
        </label>
        <label>
          End date and time
          <input type="datetime-local" value={form.endAt} onChange={(e) => set('endAt', e.target.value)} />
        </label>
        <label>
          Registration opens
          <input type="datetime-local" value={form.registrationOpensAt} onChange={(e) => set('registrationOpensAt', e.target.value)} />
        </label>
        <label>
          Registration closes
          <input type="datetime-local" value={form.registrationClosesAt} onChange={(e) => set('registrationClosesAt', e.target.value)} />
        </label>
        <label>
          Fee type
          <select value={form.feeType} onChange={(e) => set('feeType', e.target.value)}>
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
          </select>
        </label>
        {form.feeType === 'PAID' ? (
          <>
            <label>
              Fee amount (Rs.)
              <input type="number" min="1" value={form.feeAmount} onChange={(e) => set('feeAmount', e.target.value)} required />
            </label>
            <label>
              Payment receiver name
              <input value={form.paymentReceiverName} onChange={(e) => set('paymentReceiverName', e.target.value)} />
            </label>
            <label>
              Payment receiver contact
              <input value={form.paymentReceiverContact} onChange={(e) => set('paymentReceiverContact', e.target.value)} />
            </label>
            <FileUpload
              purpose="qr"
              label="Payment QR image (JPG, PNG or WebP, up to 5 MB)"
              value={form.paymentQrImageUrl}
              onUploaded={(url) => set('paymentQrImageUrl', url)}
            />
          </>
        ) : null}
        <label>
          Registration mode
          <select value={form.registrationMode} onChange={(e) => set('registrationMode', e.target.value)}>
            <option value="SITE">On the site</option>
            <option value="EXTERNAL">External form</option>
          </select>
        </label>
        {form.registrationMode === 'EXTERNAL' ? (
          <label>
            External registration link
            <input value={form.externalRegistrationUrl} onChange={(e) => set('externalRegistrationUrl', e.target.value)} />
          </label>
        ) : null}
        <label>
          Drive link (optional)
          <input value={form.driveLink} onChange={(e) => set('driveLink', e.target.value)} />
        </label>
        <FileUpload
          purpose="poster"
          label="Poster image (JPG, PNG or WebP, up to 5 MB, optional)"
          value={form.posterImageUrl}
          onUploaded={(url) => set('posterImageUrl', url)}
        />
        <label>
          Status
          <select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="DRAFT">Draft (not shown to students)</option>
            <option value="PUBLISHED">Published (shown to students)</option>
          </select>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit" disabled={saving}>
          {saving ? 'Saving, please wait.' : 'Save event'}
        </button>
        <p>
          <Link to="/admin">Back to admin</Link>
        </p>
      </form>
    </section>
  )
}
