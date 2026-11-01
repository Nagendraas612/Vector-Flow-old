import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import EventDetail from './pages/EventDetail.jsx'
import Register from './pages/Register.jsx'
import Participation from './pages/Participation.jsx'
import SignIn from './pages/SignIn.jsx'
import AuthCallback from './pages/AuthCallback.jsx'
import AdminDashboard from './admin/AdminDashboard.jsx'
import EventForm from './admin/EventForm.jsx'
import { AuthProvider, useAuth } from './lib/auth.jsx'

// Renders the page only after /api/auth/me succeeds. If the server
// says NOT_SIGNED_IN, the student is sent to Sign in. The server, not
// this wrapper, is the real guard: every protected endpoint checks
// the cookie again.
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p>Loading.</p>
  if (!user) return <Navigate to="/sign-in" replace />
  return children
}

function Header() {
  const { user, logout } = useAuth()
  return (
    <header style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
      <Link to="/" style={{ fontWeight: 'bold', textDecoration: 'none', color: 'inherit' }}>
        Vector Flow
      </Link>{' '}
      <span style={{ color: '#666' }}>— VVCE, CSE (AI &amp; ML)</span>{' '}
      <nav style={{ display: 'inline', marginLeft: '1rem' }}>
        <Link to="/">Home</Link>{' '}
        <Link to="/participation">Participation</Link>{' '}
        {user?.role === 'ADMIN' ? (
          <>
            <Link to="/admin">Admin</Link>{' '}
          </>
        ) : null}
        {user ? (
          <>
            <span style={{ color: '#666' }}>{user.name}</span>{' '}
            <button type="button" onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <Link to="/sign-in">Sign in</Link>
        )}
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <div>
        <Header />
        <main style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events/:slug" element={<EventDetail />} />
            <Route
              path="/events/:slug/register"
              element={
                <ProtectedRoute>
                  <Register />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participation"
              element={
                <ProtectedRoute>
                  <Participation />
                </ProtectedRoute>
              }
            />
            <Route path="/sign-in" element={<SignIn />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/new"
              element={
                <ProtectedRoute>
                  <EventForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/events/:slug/edit"
              element={
                <ProtectedRoute>
                  <EventForm />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<p>Page not found. Go back <Link to="/">home</Link>.</p>} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  )
}
