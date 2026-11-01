// POST /api/upload/signature { purpose, fileType, fileSize }
// Returns a short-lived Cloudinary signature. Rules (plan Section 4):
//  - payment-screenshot: any signed-in student, image only, up to 5 MB.
//  - poster, qr: admin only, image only, up to 5 MB.
// The secret is never returned. The browser checks file type and size
// first, and this endpoint checks them again before signing.
import { ok, fail } from '../_lib/db.js'
import { requireAuth, requireAdmin } from '../_lib/auth.js'
import { UPLOAD_RULES, signUpload } from '../_lib/upload.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 'METHOD_NOT_ALLOWED', 405)
  try {
    const { purpose, fileType, fileSize } = req.body || {}
    const rule = UPLOAD_RULES[purpose]
    if (!rule) return fail(res, 'INVALID_FILE', 400)
    if (purpose === 'poster' || purpose === 'qr') {
      await requireAdmin(req)
    } else {
      await requireAuth(req)
    }
    if (!rule.types.includes(fileType)) return fail(res, 'INVALID_FILE', 400)
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > rule.maxBytes) {
      return fail(res, 'INVALID_FILE', 400)
    }
    const signed = signUpload(purpose)
    if (!signed) return fail(res, 'SERVER_ERROR', 500)
    return ok(res, signed)
  } catch (err) {
    if (err?.status) return fail(res, err.message, err.status)
    console.error(err)
    return fail(res, 'SERVER_ERROR', 500)
  }
}
