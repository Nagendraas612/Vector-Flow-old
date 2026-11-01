// Google sign-in callback, in two shapes:
//  GET  /api/auth/callback?code=...  (direct Google redirect URI)
//  POST /api/auth/callback { code, redirectUri }
//       (the /auth/callback page posts the code it received from
//       Google, so the registered redirect URI can stay
//       http://localhost:5173/auth/callback, as already set up).
// Both shapes do the same server checks: exchange the code, verify
// the ID token with Google, require a @vvce.ac.in email, find or
// create the user, set an httpOnly session cookie, and redirect
// (GET) or return { ok: true } (POST). A non-college email is
// redirected to /sign-in?error=NOT_COLLEGE_EMAIL, never signed in.
import { prisma, ok, fail } from '../_lib/db.js'
import {
  callbackUrlForGet,
  exchangeCodeForGoogleUser,
  getAppUrl,
  isAllowedRedirectUri,
  signSessionCookie,
} from '../_lib/auth.js'

async function signInUser(res, googleUser) {
  const user = await prisma.user.upsert({
    where: { email: googleUser.email },
    update: { name: googleUser.name, lastLoginAt: new Date() },
    create: { name: googleUser.name, email: googleUser.email, lastLoginAt: new Date() },
  })
  signSessionCookie(res, user)
  return user
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const code = req.query?.code
      const googleError = req.query?.error
      if (googleError || !code) {
        return res.redirect(302, `${getAppUrl()}/sign-in?error=${encodeURIComponent(googleError || 'NO_CODE')}`)
      }
      const googleUser = await exchangeCodeForGoogleUser(code, callbackUrlForGet(req))
      await signInUser(res, googleUser)
      return res.redirect(302, `${getAppUrl()}/participation`)
    }

    if (req.method === 'POST') {
      const { code, redirectUri } = req.body || {}
      if (!code) return fail(res, 'VALIDATION_FAILED', 400)
      if (!isAllowedRedirectUri(redirectUri)) return fail(res, 'INVALID_REDIRECT', 400)
      const googleUser = await exchangeCodeForGoogleUser(code, redirectUri)
      await signInUser(res, googleUser)
      return ok(res, { email: googleUser.email })
    }

    return fail(res, 'METHOD_NOT_ALLOWED', 405)
  } catch (err) {
    if (err?.message === 'NOT_COLLEGE_EMAIL') {
      if (req.method === 'GET') {
        return res.redirect(302, `${getAppUrl()}/sign-in?error=NOT_COLLEGE_EMAIL`)
      }
      return fail(res, 'NOT_COLLEGE_EMAIL', 403)
    }
    if (err?.message === 'JWT_SECRET_NOT_SET') return fail(res, 'AUTH_NOT_CONFIGURED', 500)
    console.error(err)
    if (req.method === 'GET') {
      return res.redirect(302, `${getAppUrl()}/sign-in?error=SIGN_IN_FAILED`)
    }
    return fail(res, 'SIGN_IN_FAILED', 400)
  }
}
