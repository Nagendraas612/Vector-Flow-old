// Auth helpers for Sprint 1. Every protected function must call
// requireAuth / requireAdmin here. Never trust a role sent from the
// frontend: the role is read from the database, from a signed JWT.
//
// Flow (authorization-code flow, no new auth library):
//  1. Frontend asks GET /api/auth/login for a Google sign-in URL.
//  2. Google redirects the browser to /auth/callback?code=... (this
//     redirect URI is the one registered in Google Cloud).
//  3. The /auth/callback page POSTs the code to /api/auth/callback.
//  4. The server exchanges the code for tokens, checks the email
//     domain, finds or creates the user, and sets a signed JWT in an
//     httpOnly cookie. The browser never sees the JWT value.
// A direct GET to /api/auth/callback is also supported, for a Google
// redirect URI that points straight at the function.
import jwt from 'jsonwebtoken'
import { prisma } from './db.js'

const COLLEGE_DOMAIN = 'vvce.ac.in'

export function getAppUrl() {
  const raw = (process.env.APP_URL || 'http://localhost:5173').trim()
  return raw.replace(/\/+$/, '')
}

function allowedOrigins() {
  const origins = new Set(['http://localhost:5173', 'http://localhost:3000'])
  try {
    origins.add(new URL(getAppUrl()).origin)
  } catch {
    // getAppUrl is only used for display then; the check below fails closed.
  }
  return origins
}

export function isAllowedRedirectUri(uri) {
  if (!uri || typeof uri !== 'string') return false
  try {
    const url = new URL(uri)
    if (!allowedOrigins().has(url.origin)) return false
    // Only the two callback paths we own are allowed as redirect targets.
    return url.pathname === '/auth/callback' || url.pathname === '/api/auth/callback'
  } catch {
    return false
  }
}

export function buildGoogleAuthUrl(redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
    hd: COLLEGE_DOMAIN,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

function parseCookies(req) {
  const header = req.headers?.cookie || ''
  const out = {}
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx > 0) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim())
  }
  return out
}

export function signSessionCookie(res, user) {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET_NOT_SET')
  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '7d' },
  )
  const secure = process.env.NODE_ENV === 'production' || getAppUrl().startsWith('https://')
  const parts = [
    `vf_session=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${7 * 24 * 60 * 60}`,
  ]
  if (secure) parts.push('Secure')
  res.setHeader('Set-Cookie', parts.join('; '))
}

export function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    'vf_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
  )
}

function authError(code, status) {
  const err = new Error(code)
  err.status = status
  return err
}

// Returns the database user for the session cookie, or throws
// NOT_SIGNED_IN / NOT_COLLEGE_EMAIL. The role comes from the DB row,
// never from the token alone (a stale token cannot promote a user).
export async function requireAuth(req) {
  const cookies = parseCookies(req)
  const token = cookies.vf_session
  if (!token) throw authError('NOT_SIGNED_IN', 401)
  let payload
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET || '')
  } catch {
    throw authError('NOT_SIGNED_IN', 401)
  }
  if (!payload?.sub) throw authError('NOT_SIGNED_IN', 401)
  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) throw authError('NOT_SIGNED_IN', 401)
  if (!user.email.toLowerCase().endsWith(`@${COLLEGE_DOMAIN}`)) {
    throw authError('NOT_COLLEGE_EMAIL', 403)
  }
  return user
}

export async function requireAdmin(req) {
  const user = await requireAuth(req)
  if (user.role !== 'ADMIN') throw authError('FORBIDDEN', 403)
  return user
}

// Optional auth: returns the user or null, never throws for a missing
// session. Used by the public event-detail route, which shows drafts
// to admins but hides them from everyone else.
export async function optionalAuth(req) {
  try {
    return await requireAuth(req)
  } catch {
    return null
  }
}

function callbackUrlForGet(req) {
  const host = req.headers?.['x-forwarded-host'] || req.headers?.host || ''
  const proto =
    req.headers?.['x-forwarded-proto'] ||
    (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}/api/auth/callback`
}

// Exchange an authorization code for Google tokens, then verify the
// ID token with Google's tokeninfo endpoint. Returns the tokeninfo
// payload (email, name) or throws NOT_COLLEGE_EMAIL / a plain Error
// for a failed exchange. No Google library is needed: both calls are
// plain fetch calls to Google's documented endpoints.
export async function exchangeCodeForGoogleUser(code, redirectUri) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })
  const tokenBody = await tokenRes.json().catch(() => ({}))
  if (!tokenRes.ok || !tokenBody.id_token) {
    throw new Error('GOOGLE_EXCHANGE_FAILED')
  }
  const infoRes = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(tokenBody.id_token)}`,
  )
  const info = await infoRes.json().catch(() => ({}))
  if (!infoRes.ok || !info.email) throw new Error('GOOGLE_TOKEN_INVALID')
  if (info.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('GOOGLE_TOKEN_INVALID')
  if (info.iss !== 'https://accounts.google.com' && info.iss !== 'accounts.google.com') {
    throw new Error('GOOGLE_TOKEN_INVALID')
  }
  if (info.exp && Number(info.exp) * 1000 < Date.now()) {
    throw new Error('GOOGLE_TOKEN_INVALID')
  }
  if (info.email_verified !== 'true' && info.email_verified !== true) {
    throw new Error('GOOGLE_TOKEN_INVALID')
  }
  const email = String(info.email).toLowerCase()
  // hd is only present for Workspace accounts. If Google sent it, it
  // must be the college domain. If it is absent, the email-domain
  // check below is the guard.
  if (info.hd && info.hd !== COLLEGE_DOMAIN) throw authError('NOT_COLLEGE_EMAIL', 403)
  if (!email.endsWith(`@${COLLEGE_DOMAIN}`)) throw authError('NOT_COLLEGE_EMAIL', 403)
  return { email, name: info.name || email.split('@')[0] }
}

export { callbackUrlForGet }
