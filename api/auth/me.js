// GET /api/auth/me — the signed-in user, or NOT_SIGNED_IN.
// The frontend calls this on load and in the protected-route wrapper;
// a 401 here simply means "not signed in", not a broken page.
import { prisma, ok, fail } from '../_lib/db.js'
import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 'METHOD_NOT_ALLOWED', 405)
  try {
    const user = await requireAuth(req)
    const fresh = await prisma.user.findUnique({ where: { id: user.id } })
    if (!fresh) return fail(res, 'NOT_SIGNED_IN', 401)
    return ok(res, {
      id: fresh.id,
      name: fresh.name,
      email: fresh.email,
      usn: fresh.usn,
      branch: fresh.branch,
      semester: fresh.semester,
      phone: fresh.phone,
      role: fresh.role,
    })
  } catch (err) {
    if (err?.status) return fail(res, err.message, err.status)
    console.error(err)
    return fail(res, 'SERVER_ERROR', 500)
  }
}
