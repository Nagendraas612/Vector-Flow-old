// Shared event validation and public serializing for Sprint 1.
// Server checks (plan Sprint 1, item 4): slug unique (enforced by the
// database, mapped to SLUG_TAKEN), a paid event must have an amount,
// a receiver name, a receiver contact and a QR image, and an external
// event must have an external URL. These checks run on create, on edit
// and again on publish, so a draft with missing fields can be saved
// but can never be published.

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
}

function isHttpUrl(value) {
  if (!value || typeof value !== 'string') return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// Returns a list of plain-English problems, or an empty list.
// `forPublish` is true when the caller is publishing: missing paid /
// external fields block publishing even if a draft was saved earlier.
export function validateEventInput(body, { forPublish = false } = {}) {
  const problems = []
  if (!body || typeof body !== 'object') return ['Event details are missing.']
  if (!body.title || !String(body.title).trim()) problems.push('Title is required.')
  if (!body.slug || !isValidSlug(body.slug)) {
    problems.push('Slug must use only small letters, numbers and hyphens, for example "hack-night-2026".')
  }
  if (!body.description || !String(body.description).trim()) {
    problems.push('Description is required.')
  }
  if (!body.startAt || Number.isNaN(Date.parse(body.startAt))) {
    problems.push('A valid start date and time is required.')
  }
  if (body.endAt && Number.isNaN(Date.parse(body.endAt))) {
    problems.push('End date and time is not valid.')
  }
  if (body.endAt && body.startAt && Date.parse(body.endAt) < Date.parse(body.startAt)) {
    problems.push('End date must be after the start date.')
  }
  if (!['ONSITE', 'ONLINE'].includes(body.mode)) {
    problems.push('Mode must be Onsite or Online.')
  }
  if (body.registrationOpensAt && Number.isNaN(Date.parse(body.registrationOpensAt))) {
    problems.push('Registration opens date is not valid.')
  }
  if (body.registrationClosesAt && Number.isNaN(Date.parse(body.registrationClosesAt))) {
    problems.push('Registration closes date is not valid.')
  }
  if (
    body.registrationOpensAt &&
    body.registrationClosesAt &&
    Date.parse(body.registrationClosesAt) < Date.parse(body.registrationOpensAt)
  ) {
    problems.push('Registration closes date must be after registration opens date.')
  }
  if (!['FREE', 'PAID'].includes(body.feeType)) {
    problems.push('Fee type must be Free or Paid.')
  }
  if (body.feeType === 'PAID') {
    if (!Number.isInteger(body.feeAmount) || body.feeAmount <= 0) {
      problems.push('A paid event needs a fee amount greater than zero.')
    }
    if (forPublish) {
      if (!body.paymentReceiverName || !String(body.paymentReceiverName).trim()) {
        problems.push('A paid event needs a payment receiver name before it can be published.')
      }
      if (!body.paymentReceiverContact || !String(body.paymentReceiverContact).trim()) {
        problems.push('A paid event needs a payment receiver contact before it can be published.')
      }
      if (!body.paymentQrImageUrl || !String(body.paymentQrImageUrl).trim()) {
        problems.push('A paid event needs a payment QR image before it can be published.')
      }
    }
  }
  if (!['SITE', 'EXTERNAL'].includes(body.registrationMode)) {
    problems.push('Registration mode must be On the site or External form.')
  }
  if (body.registrationMode === 'EXTERNAL' && forPublish) {
    if (!body.externalRegistrationUrl || !isHttpUrl(body.externalRegistrationUrl)) {
      problems.push('An external event needs a valid external registration link before it can be published.')
    }
  }
  if (body.posterImageUrl && !isHttpUrl(body.posterImageUrl)) {
    problems.push('Poster image link is not a valid link.')
  }
  if (body.paymentQrImageUrl && !isHttpUrl(body.paymentQrImageUrl)) {
    problems.push('Payment QR image link is not a valid link.')
  }
  if (body.driveLink && !isHttpUrl(body.driveLink)) {
    problems.push('Drive link is not a valid link.')
  }
  return problems
}

export function eventInputToPrisma(body) {
  const toDate = (value) => (value ? new Date(value) : null)
  return {
    title: String(body.title).trim(),
    slug: body.slug,
    description: String(body.description).trim(),
    posterImageUrl: body.posterImageUrl || null,
    venue: body.venue ? String(body.venue).trim() : null,
    mode: body.mode,
    startAt: new Date(body.startAt),
    endAt: toDate(body.endAt),
    registrationOpensAt: toDate(body.registrationOpensAt),
    registrationClosesAt: toDate(body.registrationClosesAt),
    feeType: body.feeType,
    feeAmount: body.feeType === 'PAID' ? body.feeAmount : null,
    paymentReceiverName: body.paymentReceiverName ? String(body.paymentReceiverName).trim() : null,
    paymentReceiverContact: body.paymentReceiverContact
      ? String(body.paymentReceiverContact).trim()
      : null,
    paymentQrImageUrl: body.paymentQrImageUrl || null,
    registrationMode: body.registrationMode,
    externalRegistrationUrl: body.externalRegistrationUrl || null,
    driveLink: body.driveLink || null,
  }
}

// Public fields only. Receiver contact is included on the detail
// route (a student who registers needs it), but the list route in
// api/events/index.js strips it out before sending.
export function publicEvent(event) {
  if (!event) return null
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    description: event.description,
    posterImageUrl: event.posterImageUrl,
    venue: event.venue,
    mode: event.mode,
    startAt: event.startAt,
    endAt: event.endAt,
    registrationOpensAt: event.registrationOpensAt,
    registrationClosesAt: event.registrationClosesAt,
    feeType: event.feeType,
    feeAmount: event.feeAmount,
    paymentReceiverName: event.paymentReceiverName,
    paymentReceiverContact: event.paymentReceiverContact,
    paymentQrImageUrl: event.paymentQrImageUrl,
    registrationMode: event.registrationMode,
    externalRegistrationUrl: event.externalRegistrationUrl,
    driveLink: event.driveLink,
    status: event.status,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  }
}
