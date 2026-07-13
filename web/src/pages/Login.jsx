import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && session) {
    const dest = location.state?.from?.pathname || '/'
    return <Navigate to={dest} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setSubmitting(false)
    if (signInError) {
      setError('Incorrect email or password.')
    }
    // On success, the auth listener updates the session and this component
    // re-renders into the <Navigate> redirect above.
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="max-w-sm mx-auto mt-16">
        <h1 className="font-display text-5xl tracking-wider text-center mb-8 text-white">
          My Records
        </h1>
        <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              autoComplete="email"
              className={`w-full bg-zinc-900 border ${
                error ? 'border-red-500' : 'border-zinc-700'
              } rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={`w-full bg-zinc-900 border ${
                error ? 'border-red-500' : 'border-zinc-700'
              } rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500`}
            />
            {error && <p className="text-red-400 text-xs mt-1.5">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium transition-colors"
          >
            {submitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </main>
  )
}
