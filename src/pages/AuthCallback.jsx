// Page Google returns to after sign-in: /auth/callback?code=...
// It posts the code to the server, which exchanges it, checks the
// college domain, and sets the session cookie. If Google returned an
// error instead of a code, the student is sent to Sign in with a
// plain-English message. This page never sees a token or a secret.
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { humanError, useAuth } from '../lib/auth.jsx'

export default function AuthCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [error, setError] = useState('')

  useEffect(() => {
    const code = params.get('code')
    const googleError = params.get('error')
    if (googleError || !code) {
      navigate(`/sign-in?error=${encodeURIComponent(googleError || 'SIGN_IN_FAILED')}`, { replace: true })
      return
    }
    const redirectUri = `${window.location.origin}/auth/callback`
    api('/api/auth/callback', {
      method: 'POST',
      body: JSON.stringify({ code, redirectUri }),
    })
      .then(async (res) => {
        if (!res.ok) {
          navigate(`/sign-in?error=${encodeURIComponent(res.error)}`, { replace: true })
          return
        }
        await refresh()
        navigate('/participation', { replace: true })
      })
      .catch(() => setError('Sign-in did not complete. Please try again.'))
  }, [params, navigate, refresh])

  if (error) return <p className="error">{humanError(error)}</p>
  return <p>Signing you in, please wait.</p>
}
