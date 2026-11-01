// GET /api/me/registrations — the signed-in student's own
// registrations, newest first, with the event details the
// Participation page needs. A student can only ever see their own.
import { prisma, ok, fail } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 'METHOD_NOT_ALLOWED', 405)
  try {
    const user = await requireAuth(req)
    const registrations = await prisma.registration.findMany({
      where: { userId: user.id },
      orderBy: { registeredAt: 'desc' },
      include: {
        event: {
          select: {
            title: true,
            slug: true,
            startAt: true,
            endAt: true,
            venue: true,
            feeType: true,
            feeAmount: true,
            status: true,
          },
        },
      },
    })
    return ok(
      res,
      registrations.map((r) => ({
        id: r.id,
        event: r.event,
        name: r.name,
        usn: r.usn,
        paymentStatus: r.paymentStatus,
        attendance: r.attendance,
        status: r.status,
        registeredAt: r.registeredAt,
      })),
    )
  } catch (err) {
    if (err?.status) return fail(res, err.message, err.status)
    console.error(err)
    return fail(res, 'SERVER_ERROR', 500)
  }
}
