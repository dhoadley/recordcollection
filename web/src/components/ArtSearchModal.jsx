import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import { searchMusicBrainzCovers } from '../lib/metadata'

export default function ArtSearchModal({ table, id, artist, title, onClose, onSaved }) {
  const [query, setQuery] = useState(`${artist} ${title}`.trim())
  const [covers, setCovers] = useState([])
  const [loading, setLoading] = useState(true)
  const [hidden, setHidden] = useState({}) // thumbs that failed to load
  const debounceRef = useRef(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      const results = await searchMusicBrainzCovers(query)
      setCovers(results)
      setHidden({})
      setLoading(false)
    }, 500)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  async function selectArt(fullUrl) {
    await supabase.from(table).update({ cover_art_url: fullUrl }).eq('id', id)
    onSaved()
  }

  async function removeArt() {
    await supabase.from(table).update({ cover_art_url: null }).eq('id', id)
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 bg-black/85 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-zinc-800 rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-700 flex-shrink-0">
          <h3 className="font-medium text-sm">Change Cover Art</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl leading-none">
            &times;
          </button>
        </div>
        <div className="px-4 pt-3 flex-shrink-0">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            placeholder="Search MusicBrainz..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rose-500 placeholder-zinc-500"
          />
        </div>
        <div className="overflow-y-auto p-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={removeArt}
              className="aspect-square rounded-lg border-2 border-dashed border-zinc-600 hover:border-rose-500 flex flex-col items-center justify-center gap-1 text-zinc-500 hover:text-rose-400 transition-colors focus:outline-none"
            >
              <span className="text-2xl leading-none">&times;</span>
              <span className="text-[10px] uppercase tracking-wide">No art</span>
            </button>
            {!loading &&
              covers.map((cover, i) =>
                hidden[i] ? null : (
                  <button
                    key={cover.full}
                    type="button"
                    onClick={() => selectArt(cover.full)}
                    className="aspect-square rounded-lg overflow-hidden hover:ring-2 hover:ring-rose-500 transition-all focus:outline-none"
                  >
                    <img
                      src={cover.thumb}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={() => setHidden((h) => ({ ...h, [i]: true }))}
                    />
                  </button>
                )
              )}
          </div>
          {loading && <p className="text-zinc-500 text-sm text-center py-4">Searching…</p>}
          {!loading && covers.length === 0 && (
            <p className="text-zinc-500 text-sm text-center py-4">No other results found.</p>
          )}
        </div>
      </div>
    </div>
  )
}
