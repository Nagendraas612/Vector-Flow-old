// POST /api/auth/logout — clears the session cookie.
import { ok, fail } from '../_lib/db.js'
import { clearSessionCookie } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 'METHOD_NOT_ALLOWED', 405)
  clearSessionCookie(res)
  return ok(res, { loggedOut: true })
}
