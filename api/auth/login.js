// GET /api/auth/login?redirectUri=<origin>/auth/callback
// Returns the Google sign-in URL. The redirect URI must be one of the
// URIs registered in Google Cloud, on an origin we allow (localhost
// or APP_URL), so this endpoint cannot be used as an open redirect.
import { ok, fail } from '../_lib/db.js'
import { buildGoogleAuthUrl, getAppUrl, isAllowedRedirectUri } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 'METHOD_NOT_ALLOWED', 405)
  const redirectUri =
    typeof req.query?.redirectUri === 'string' && req.query.redirectUri
      ? req.query.redirectUri
      : `${getAppUrl()}/auth/callback`
  if (!isAllowedRedirectUri(redirectUri)) return fail(res, 'INVALID_REDIRECT', 400)
  if (!process.env.GOOGLE_CLIENT_ID) return fail(res, 'AUTH_NOT_CONFIGURED', 500)
  return ok(res, { url: buildGoogleAuthUrl(redirectUri) })
}
