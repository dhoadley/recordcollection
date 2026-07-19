import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { TABLES } from '../lib/tables'
import { searchAppleMusic } from '../lib/metadata'
import Header from '../components/Header'

async function existsIn(table, artist, title) {
  if (!artist || !title) return false
  const { data } = await supabase
    .from(table)
    .select('id')
    .ilike('artist', artist)
    .ilike('title', title)
    .limit(1)
  return (data || []).length > 0
}

function DuplicateWarning({ children }) {
  return (
    <div className="bg-amber-900/40 border border-amber-600/50 rounded-lg px-3 py-2.5 mt-2 text-sm text-amber-300">
      {children}
    </div>
  )
}

export default function RecordFormPage({ table }) {
  const cfg = TABLES[table]
  const navigate = useNavigate()

  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [form, setForm] = useState({ artist: '', title: '', year: '', genre: '', cover_art_url: '' })
  const [inCollection, setInCollection] = useState(false)
  const [inWishlist, setInWishlist] = useState(false)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef(null)

  // Debounced Apple Music search.
  useEffect(() => {
    const q = term.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchAppleMusic(q))
      } catch {
        setResults([])
      }
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [term])

  // Re-check for duplicates whenever artist/title change, whether from a
  // search selection or manual typing, so the warning stays accurate.
  const dupCheckRef = useRef(null)
  useEffect(() => {
    const artist = form.artist.trim()
    const title = form.title.trim()
    if (dupCheckRef.current) clearTimeout(dupCheckRef.current)
    if (!artist || !title) {
      setInCollection(false)
      setInWishlist(false)
      return
    }
    dupCheckRef.current = setTimeout(async () => {
      setInCollection(await existsIn('albums', artist, title))
      if (table === 'wishlist') {
        setInWishlist(await existsIn('wishlist', artist, title))
      }
    }, 400)
    return () => clearTimeout(dupCheckRef.current)
  }, [form.artist, form.title, table])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function selectAlbum(album) {
    setForm({
      artist: album.artist,
      title: album.title,
      year: album.year,
      genre: album.genre,
      cover_art_url: album.cover_art_url,
    })
    setResults([])
    setTerm('')

    setInCollection(await existsIn('albums', album.artist, album.title))
    if (table === 'wishlist') {
      setInWishlist(await existsIn('wishlist', album.artist, album.title))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const artist = form.artist.trim()
    const title = form.title.trim()

    // Re-check right before saving in case the debounced check above hasn't
    // caught up with the latest edits.
    const duplicate = await existsIn(table, artist, title)
    if (duplicate) {
      const noun = table === 'wishlist' ? 'wishlist' : 'collection'
      const proceed = window.confirm(
        `"${title}" by ${artist} already appears to be in your ${noun}. Add it anyway?`
      )
      if (!proceed) return
    }

    setSaving(true)
    const { error } = await supabase.from(table).insert({
      artist,
      title,
      year: form.year ? Number(form.year) : null,
      genre: form.genre.trim() || null,
      cover_art_url: form.cover_art_url.trim() || null,
    })
    setSaving(false)
    if (error) {
      alert(`Could not save: ${error.message}`)
      return
    }
    navigate(cfg.listPath)
  }

  const fieldClass =
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500 placeholder-zinc-500'

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold mb-6">{cfg.addHeading}</h1>

          <div className="mb-6">
            <label className="block text-sm font-medium text-zinc-400 mb-1.5">
              Search Apple Music
            </label>
            <input
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Type artist or album title..."
              autoComplete="off"
              className={fieldClass}
            />
            {results.length > 0 && (
              <div className="mt-2 grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto">
                {results.map((album, i) => (
                  <button
                    key={`${album.artist}-${album.title}-${i}`}
                    type="button"
                    onClick={() => selectAlbum(album)}
                    className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg p-2.5 text-left transition-colors border border-zinc-700 w-full"
                  >
                    {album.thumb ? (
                      <img src={album.thumb} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 bg-zinc-600 rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{album.title}</div>
                      <div className="text-zinc-400 text-xs truncate">{album.artist}</div>
                      {album.year && <div className="text-zinc-500 text-xs">{album.year}</div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {inCollection && <DuplicateWarning>Already in your collection.</DuplicateWarning>}
          {table === 'wishlist' && inWishlist && (
            <DuplicateWarning>Already in your wishlist.</DuplicateWarning>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="artist">
                Artist
              </label>
              <input
                type="text"
                id="artist"
                required
                value={form.artist}
                onChange={(e) => update('artist', e.target.value)}
                className={fieldClass}
                placeholder="Artist name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="title">
                Album Title
              </label>
              <input
                type="text"
                id="title"
                required
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
                className={fieldClass}
                placeholder="Album title"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="year">
                  Year
                </label>
                <input
                  type="number"
                  id="year"
                  min="1900"
                  max="2099"
                  value={form.year}
                  onChange={(e) => update('year', e.target.value)}
                  className={fieldClass}
                  placeholder="Year"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5" htmlFor="genre">
                  Genre
                </label>
                <input
                  type="text"
                  id="genre"
                  value={form.genre}
                  onChange={(e) => update('genre', e.target.value)}
                  className={fieldClass}
                  placeholder="Genre"
                />
              </div>
            </div>

            {form.cover_art_url && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1.5">Cover Art</label>
                <img
                  src={form.cover_art_url}
                  alt="Cover art"
                  className="w-24 h-24 rounded-lg object-cover"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white py-2.5 rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving…' : cfg.saveLabel}
              </button>
              <Link
                to={cfg.listPath}
                className="px-6 py-2.5 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
