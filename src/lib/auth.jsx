// Sign-in state for the whole site. The session lives in an httpOnly
// cookie, so this code never sees a token: it only asks the server
// who is signed in, through /api/auth/me.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const res = await api('/api/auth/me')
    setUser(res.ok ? res.data : null)
    setLoading(false)
    return res
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Plain-English messages for the error names the server returns.
// The raw error name is never shown to a student.
export function humanError(error) {
  switch (error) {
    case 'NOT_SIGNED_IN':
      return 'Please sign in with your college account first.'
    case 'NOT_COLLEGE_EMAIL':
      return 'Only college accounts ending in @vvce.ac.in can sign in here.'
    case 'FORBIDDEN':
      return 'You do not have access to that page. Only admins can open it.'
    case 'EVENT_NOT_FOUND':
      return 'That event was not found. It may have been removed or not published yet.'
    case 'REGISTRATION_CLOSED':
      return 'Registration for this event is closed.'
    case 'ALREADY_REGISTERED':
      return 'You are already registered for this event.'
    case 'INVALID_FILE':
      return 'That file is not allowed. Please use a JPG, PNG or WebP image under 5 MB.'
    case 'PAYMENT_REQUIRED':
      return 'This is a paid event. Please upload your payment screenshot first.'
    case 'EXTERNAL_REGISTRATION':
      return 'Registration for this event happens on an external form. Please use the external link on the event page.'
    case 'SLUG_TAKEN':
      return 'That short link is already used by another event. Please try a different one.'
    case 'VALIDATION_FAILED':
      return 'Please check the form. Some details are missing or not valid.'
    case 'SIGN_IN_FAILED':
      return 'Sign-in did not complete. Please try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
