// Uploads an image directly to Cloudinary, using a short-lived
// signature from the server (plan Section 4). The file never goes
// through a Vercel function body. Type and size are checked here in
// the browser, and checked again on the server before signing.
import { useState } from 'react'
import { api } from '../lib/api.js'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024

export default function FileUpload({ purpose, label, onUploaded, value }) {
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function handleChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That image is larger than 5 MB. Please choose a smaller one.')
      return
    }
    setUploading(true)
    try {
      const sig = await api('/api/upload/signature', {
        method: 'POST',
        body: JSON.stringify({ purpose, fileType: file.type, fileSize: file.size }),
      })
      if (!sig.ok) {
        setError('Could not start the upload. Please sign in and try again.')
        setUploading(false)
        return
      }
      const form = new FormData()
      form.append('file', file)
      form.append('api_key', sig.data.apiKey)
      form.append('timestamp', String(sig.data.timestamp))
      form.append('signature', sig.data.signature)
      form.append('folder', sig.data.folder)
      const uploadRes = await fetch(sig.data.uploadUrl, { method: 'POST', body: form })
      const uploadBody = await uploadRes.json().catch(() => ({}))
      if (!uploadRes.ok || !uploadBody.secure_url) {
        setError('Upload failed. Please try again.')
        setUploading(false)
        return
      }
      onUploaded(uploadBody.secure_url)
    } catch {
      setError('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  return (
    <div>
      <label>
        {label}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} disabled={uploading} />
      </label>
      {uploading ? <p>Uploading, please wait.</p> : null}
      {value ? (
        <p>
          Uploaded: <a href={value} target="_blank" rel="noreferrer">View image</a>
        </p>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  )
}
