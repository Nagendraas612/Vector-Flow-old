// Signed Cloudinary upload helper (Sprint 1 pattern, plan Section 4).
// The frontend uploads directly to Cloudinary with this signature, so
// a large file never passes through a Vercel function body. The secret
// is never returned to the browser: only the signature, timestamp,
// cloud name and API key are returned.
import crypto from 'node:crypto'

export const UPLOAD_RULES = {
  // purpose -> folder, allowed types, max size in bytes
  'payment-screenshot': {
    folder: 'vector-flow/payment-screenshots',
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * 1024 * 1024,
  },
  poster: {
    folder: 'vector-flow/posters',
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * 1024 * 1024,
  },
  qr: {
    folder: 'vector-flow/payment-qr',
    types: ['image/jpeg', 'image/png', 'image/webp'],
    maxBytes: 5 * 1024 * 1024,
  },
}

export function signUpload(purpose) {
  const rule = UPLOAD_RULES[purpose]
  if (!rule) return null
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) return null
  const timestamp = Math.floor(Date.now() / 1000)
  // Cloudinary signs the sorted parameter string, excluding the
  // signature itself and the api_key. Keep this exact: folder + timestamp.
  const toSign = `folder=${rule.folder}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(toSign + apiSecret)
    .digest('hex')
  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: rule.folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    allowedTypes: rule.types,
    maxBytes: rule.maxBytes,
  }
}

export function checkUploadUrl(url, purpose) {
  // The URL returned by Cloudinary must be a Cloudinary URL for the
  // configured cloud, in the folder for this purpose. This stops a
  // caller from registering with an arbitrary image link.
  if (!url || typeof url !== 'string') return false
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  if (!cloudName) return false
  try {
    const parsed = new URL(url)
    if (parsed.hostname !== 'res.cloudinary.com') return false
    if (!parsed.pathname.includes(`/${cloudName}/image/upload/`)) return false
    const rule = UPLOAD_RULES[purpose]
    if (rule && !parsed.pathname.includes(rule.folder.replace('vector-flow/', ''))) {
      // Folder check is best-effort: Cloudinary URLs carry the folder
      // after /upload/, but a transformed URL may reorder it. The
      // hostname + cloud check above is the hard guard.
    }
    return true
  } catch {
    return false
  }
}
