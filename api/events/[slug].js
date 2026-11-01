// GET /api/events/:slug   public detail (PUBLISHED only for students;
//                          admins may also see drafts).
// PUT /api/events/:slug   admin edit, including publish (admin only).
import { prisma, ok, fail } from '../_lib/db.js'
import { optionalAuth, requireAdmin } from '../_lib/auth.js'
import { validateEventInput, eventInputToPrisma, publicEvent } from '../_lib/events.js'

function handleError(res, err) {
  if (err?.code === 'P2002') return fail(res, 'SLUG_TAKEN', 409)
  if (err?.status) return fail(res, err.message, err.status)
  console.error(err)
  return fail(res, 'SERVER_ERROR', 500)
}

export default async function handler(req, res) {
  const slug = req.query?.slug
  if (!slug || typeof slug !== 'string') return fail(res, 'EVENT_NOT_FOUND', 404)
  try {
    if (req.method === 'GET') {
      const event = await prisma.event.findUnique({ where: { slug } })
      if (!event) return fail(res, 'EVENT_NOT_FOUND', 404)
      if (event.status !== 'PUBLISHED') {
        const viewer = await optionalAuth(req)
        if (!viewer || viewer.role !== 'ADMIN') return fail(res, 'EVENT_NOT_FOUND', 404)
      }
      return ok(res, publicEvent(event))
    }

    if (req.method === 'PUT') {
      await requireAdmin(req)
      const existing = await prisma.event.findUnique({ where: { slug } })
      if (!existing) return fail(res, 'EVENT_NOT_FOUND', 404)
      const body = req.body || {}
      const nextStatus = body.status || existing.status
      const problems = validateEventInput(
        { ...body, slug: body.slug || existing.slug },
        { forPublish: nextStatus === 'PUBLISHED' },
      )
      if (problems.length) return fail(res, 'VALIDATION_FAILED', 400)
      if (!['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(nextStatus)) {
        return fail(res, 'VALIDATION_FAILED', 400)
      }
      const event = await prisma.event.update({
        where: { slug },
        data: { ...eventInputToPrisma(body), status: nextStatus },
      })
      return ok(res, publicEvent(event))
    }

    return fail(res, 'METHOD_NOT_ALLOWED', 405)
  } catch (err) {
    return handleError(res, err)
  }
}
