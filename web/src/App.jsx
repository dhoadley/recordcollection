import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import CollectionPage from './pages/CollectionPage'
import RecordFormPage from './pages/RecordFormPage'

function RequireAuth({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-zinc-500">
        Loading…
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <CollectionPage table="albums" />
          </RequireAuth>
        }
      />
      <Route
        path="/add"
        element={
          <RequireAuth>
            <RecordFormPage table="albums" />
          </RequireAuth>
        }
      />
      <Route
        path="/records/:id/edit"
        element={
          <RequireAuth>
            <RecordFormPage table="albums" />
          </RequireAuth>
        }
      />
      <Route
        path="/wishlist"
        element={
          <RequireAuth>
            <CollectionPage table="wishlist" />
          </RequireAuth>
        }
      />
      <Route
        path="/wishlist/add"
        element={
          <RequireAuth>
            <RecordFormPage table="wishlist" />
          </RequireAuth>
        }
      />
      <Route
        path="/wishlist/:id/edit"
        element={
          <RequireAuth>
            <RecordFormPage table="wishlist" />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
