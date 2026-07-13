import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'

function RecordIcon() {
  return (
    <svg className="w-7 h-7 text-rose-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="11" opacity="0.15" />
      <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.45" />
      <circle cx="12" cy="12" r="2.5" opacity="0.65" />
      <circle cx="12" cy="12" r="1" fill="#09090b" />
    </svg>
  )
}

export default function Header({ action }) {
  const { pathname } = useLocation()
  const collectionActive =
    pathname === '/' || pathname === '/add' || pathname.startsWith('/records')
  const wishlistActive = pathname.startsWith('/wishlist')

  const navClass = (active) =>
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active ? 'text-white bg-zinc-800' : 'text-zinc-400 hover:text-white'
    }`

  return (
    <header className="bg-zinc-950 sticky top-0 z-10 shadow-xl shadow-black/50">
      <div className="h-0.5 bg-gradient-to-r from-rose-700 via-rose-400 to-rose-700" />
      <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-y-2">
        <Link to="/" className="flex items-center gap-3">
          <RecordIcon />
          <span className="font-display text-2xl tracking-wider text-white leading-none">
            My Records
          </span>
        </Link>
        <div className="flex items-center gap-4 ml-auto">
          <nav className="flex items-center gap-1">
            <Link to="/" className={navClass(collectionActive)}>
              Collection
            </Link>
            <Link to="/wishlist" className={navClass(wishlistActive)}>
              Wishlist
            </Link>
          </nav>
          {action}
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
