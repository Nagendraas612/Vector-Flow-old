// GET  /api/events            public list of PUBLISHED events, by start date.
// GET  /api/events?admin=1     admin list of ALL events (admin only).
// POST /api/events            admin create (admin only).
import { prisma, ok, fail } from '../_lib/db.js'
import { requireAdmin } from '../_lib/auth.js'
import { validateEventInput, eventInputToPrisma, publicEvent } from '../_lib/events.js'

function handleError(res, err) {
  if (err?.code === 'P2002') return fail(res, 'SLUG_TAKEN', 409)
  if (err?.status) return fail(res, err.message, err.status)
  console.error(err)
  return fail(res, 'SERVER_ERROR', 500)
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      if (req.query?.admin === '1') {
        await requireAdmin(req)
        const events = await prisma.event.findMany({ orderBy: { startAt: 'asc' } })
        return ok(res, events.map(publicEvent))
      }
      const events = await prisma.event.findMany({
        where: { status: 'PUBLISHED' },
        orderBy: { startAt: 'asc' },
      })
      // The list does not include receiver contact details; the
      // detail page shows them to a student who is registering.
      const list = events.map((e) => {
        const item = publicEvent(e)
        delete item.paymentReceiverContact
        return item
      })
      return ok(res, list)
    }

    if (req.method === 'POST') {
      const admin = await requireAdmin(req)
      const body = req.body || {}
      const problems = validateEventInput(body, { forPublish: body.status === 'PUBLISHED' })
      if (problems.length) return fail(res, 'VALIDATION_FAILED', 400)
      // Never trust a status from the body beyond DRAFT / PUBLISHED,
      // and never publish unless the publish checks passed above.
      const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'
      const event = await prisma.event.create({
        data: { ...eventInputToPrisma(body), status, createdById: admin.id },
      })
      return ok(res, publicEvent(event), 201)
    }

    return fail(res, 'METHOD_NOT_ALLOWED', 405)
  } catch (err) {
    return handleError(res, err)
  }
}
