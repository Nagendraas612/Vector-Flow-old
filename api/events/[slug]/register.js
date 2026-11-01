// POST /api/events/:slug/register
// Checks, in order, all on the server (a hidden button is not a guard):
//  1. signed in (NOT_SIGNED_IN)
//  2. event exists (EVENT_NOT_FOUND)
//  3. event is PUBLISHED and now is inside the registration window
//     (REGISTRATION_CLOSED)
//  4. event is not EXTERNAL-only (EXTERNAL_REGISTRATION: use the
//     external link shown on the event page instead)
//  5. paid event needs a screenshot URL (PAYMENT_REQUIRED)
//  6. duplicate: the database unique constraint is the final guard
//     (ALREADY_REGISTERED)
// Free events set paymentStatus NOT_REQUIRED. Paid events set
// PENDING_REVIEW. The student's profile is updated from the form
// only where it does not clash with another student's USN.
import { prisma, ok, fail } from '../../_lib/db.js'
import { requireAuth } from '../../_lib/auth.js'
import { checkUploadUrl } from '../../_lib/upload.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 'METHOD_NOT_ALLOWED', 405)
  const slug = req.query?.slug
  if (!slug || typeof slug !== 'string') return fail(res, 'EVENT_NOT_FOUND', 404)
  try {
    const user = await requireAuth(req)
    const event = await prisma.event.findUnique({ where: { slug } })
    if (!event) return fail(res, 'EVENT_NOT_FOUND', 404)
    if (event.status !== 'PUBLISHED') return fail(res, 'REGISTRATION_CLOSED', 403)
    if (event.registrationMode === 'EXTERNAL') {
      return fail(res, 'EXTERNAL_REGISTRATION', 403)
    }
    const now = new Date()
    if (event.registrationOpensAt && now < event.registrationOpensAt) {
      return fail(res, 'REGISTRATION_CLOSED', 403)
    }
    if (event.registrationClosesAt && now > event.registrationClosesAt) {
      return fail(res, 'REGISTRATION_CLOSED', 403)
    }

    const body = req.body || {}
    const name = String(body.name || '').trim()
    const usn = String(body.usn || '').trim().toUpperCase()
    if (!name || !usn) return fail(res, 'VALIDATION_FAILED', 400)
    let semester = null
    if (body.semester !== undefined && body.semester !== null && body.semester !== '') {
      semester = Number(body.semester)
      if (!Number.isInteger(semester) || semester < 1 || semester > 12) {
        return fail(res, 'VALIDATION_FAILED', 400)
      }
    }

    let paymentStatus = 'NOT_REQUIRED'
    let paymentScreenshotUrl = null
    if (event.feeType === 'PAID') {
      paymentScreenshotUrl = body.paymentScreenshotUrl || null
      if (!paymentScreenshotUrl) return fail(res, 'PAYMENT_REQUIRED', 400)
      if (!checkUploadUrl(paymentScreenshotUrl, 'payment-screenshot')) {
        return fail(res, 'INVALID_FILE', 400)
      }
      paymentStatus = 'PENDING_REVIEW'
    }

    let registration
    try {
      registration = await prisma.registration.create({
        data: {
          eventId: event.id,
          userId: user.id,
          name,
          usn,
          email: user.email,
          branch: body.branch ? String(body.branch).trim() : null,
          semester,
          phone: body.phone ? String(body.phone).trim() : null,
          paymentStatus,
          paymentScreenshotUrl,
        },
        include: { event: true },
      })
    } catch (err) {
      if (err?.code === 'P2002') return fail(res, 'ALREADY_REGISTERED', 409)
      throw err
    }

    // Keep the student's profile in step with the form, best-effort:
    // a USN clash with another student must not fail the registration.
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name,
          usn,
          branch: body.branch ? String(body.branch).trim() : undefined,
          semester: semester ?? undefined,
          phone: body.phone ? String(body.phone).trim() : undefined,
        },
      })
    } catch {
      // Profile update is a nicety, not part of the registration.
    }

    return ok(
      res,
      {
        id: registration.id,
        eventTitle: registration.event.title,
        eventSlug: registration.event.slug,
        paymentStatus: registration.paymentStatus,
        attendance: registration.attendance,
        status: registration.status,
        registeredAt: registration.registeredAt,
      },
      201,
    )
  } catch (err) {
    if (err?.status) return fail(res, err.message, err.status)
    console.error(err)
    return fail(res, 'SERVER_ERROR', 500)
  }
}
