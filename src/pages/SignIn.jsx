import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../lib/api.js'
import { humanError, useAuth } from '../lib/auth.jsx'

export default function SignIn() {
  const [params] = useSearchParams()
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const urlError = params.get('error')

  async function signIn() {
    setError('')
    setBusy(true)
    const redirectUri = `${window.location.origin}/auth/callback`
    const res = await api(`/api/auth/login?redirectUri=${encodeURIComponent(redirectUri)}`)
    if (!res.ok) {
      setError(humanError(res.error))
      setBusy(false)
      return
    }
    window.location.href = res.data.url
  }

  return (
    <section>
      <h1>Sign in</h1>
      {user ? (
        <p>
          You are signed in as {user.name} ({user.email}).
        </p>
      ) : (
        <>
          <p>
            Sign in with your college account to register for events and see your participation
            history. Only accounts ending in <code>@vvce.ac.in</code> can sign in here. Other
            Google accounts are blocked, and that is by design.
          </p>
          {urlError ? <p className="error">{humanError(urlError)}</p> : null}
          {error ? <p className="error">{error}</p> : null}
          <button onClick={signIn} disabled={busy}>
            {busy ? 'Opening Google sign-in.' : 'Sign in with Google'}
          </button>
        </>
      )}
    </section>
  )
}
