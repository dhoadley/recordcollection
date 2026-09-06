import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { TABLES } from '../lib/tables'
import ArtSearchModal from './ArtSearchModal'

export default function DetailModal({ table, item, onClose, onChanged }) {
  const [artOpen, setArtOpen] = useState(false)
  const navigate = useNavigate()

  // Lock body scroll while the modal is open.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  async function handleRemove() {
    const msg =
      table === 'wishlist'
        ? 'Remove from wishlist?'
        : 'Remove this record from your collection?'
    if (!confirm(msg)) return
    await supabase.from(table).delete().eq('id', item.id)
    onChanged()
    onClose()
  }

  function handleEdit() {
    navigate(TABLES[table].editPath(item.id))
    onClose()
  }

  async function handleBuy() {
    await supabase.from('albums').insert({
      artist: item.artist,
      title: item.title,
      year: item.year,
      genre: item.genre,
      cover_art_url: item.cover_art_url,
    })
    await supabase.from('wishlist').delete().eq('id', item.id)
    navigate('/')
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/75 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose()
        }}
      >
        <div className="bg-zinc-800 rounded-t-2xl sm:rounded-xl overflow-hidden w-full sm:max-w-sm">
          <div className="relative">
            {item.cover_art_url ? (
              <img
                src={item.cover_art_url}
                alt={item.title}
                className="w-full object-cover max-h-64 sm:max-h-72"
              />
            ) : (
              <div className="w-full h-48 bg-zinc-700 flex items-center justify-center">
                <span className="text-zinc-500 text-6xl font-display tracking-widest">LP</span>
              </div>
            )}
            <button
              onClick={() => setArtOpen(true)}
              className="absolute bottom-2 left-2 bg-black/50 hover:bg-black/70 text-white text-xs px-2 py-1 rounded-md transition-colors"
            >
              Change art
            </button>
            <button
              onClick={onClose}
              className="absolute top-3 right-3 bg-black/50 hover:bg-black/70 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg leading-none transition-colors"
            >
              &times;
            </button>
          </div>

          <div className="p-5">
            <h2 className="font-display text-2xl tracking-wide leading-tight">{item.title}</h2>
            <p className="text-zinc-300 mt-1">{item.artist}</p>
            <div className="flex gap-3 mt-2 text-sm text-zinc-500">
              {item.year && <span>{item.year}</span>}
              {item.genre && <span>{item.genre}</span>}
            </div>

            <a
              href={`https://www.discogs.com/search/?${new URLSearchParams({
                q: `${item.artist} ${item.title}`,
                type: 'release',
              })}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-rose-500 hover:text-rose-400 text-xs transition-colors"
            >
              Search Discogs for tracklist ↗
            </a>
          </div>

          <div className="px-5 pb-5 flex items-center justify-between border-t border-zinc-700 pt-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleRemove}
                className="text-red-400 hover:text-red-300 text-sm transition-colors"
              >
                Remove
              </button>
              <button
                onClick={handleEdit}
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Edit
              </button>
            </div>
            {table === 'wishlist' ? (
              <button
                onClick={handleBuy}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                I bought it!
              </button>
            ) : (
              <button
                onClick={onClose}
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>

      {artOpen && (
        <ArtSearchModal
          table={table}
          id={item.id}
          artist={item.artist}
          title={item.title}
          onClose={() => setArtOpen(false)}
          onSaved={() => {
            setArtOpen(false)
            onChanged()
            onClose()
          }}
        />
      )}
    </>
  )
}
