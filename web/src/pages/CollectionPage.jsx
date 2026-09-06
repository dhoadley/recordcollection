import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { TABLES } from '../lib/tables'
import { defaultSortArtist } from '../lib/sorting'
import Header from '../components/Header'
import DetailModal from '../components/DetailModal'
import ArtistIndexOverlay from '../components/ArtistIndexOverlay'

const SWIPE_THRESHOLD = 70

export default function CollectionPage({ table }) {
  const cfg = TABLES[table]
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('')
  const [artist, setArtist] = useState('')
  const [selected, setSelected] = useState(null)
  const [indexOpen, setIndexOpen] = useState(false)
  const [activeArtist, setActiveArtist] = useState(null)
  const itemRefs = useRef(new Map())
  const gridTouchRef = useRef(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('sort_artist')
      .order('title')
    if (!error) setRows(data || [])
    setLoading(false)
  }, [table])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  const genres = useMemo(
    () =>
      [...new Set(rows.map((r) => r.genre).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  )
  const artists = useMemo(() => {
    const sortKeys = new Map()
    for (const r of rows) {
      if (r.artist && !sortKeys.has(r.artist)) {
        sortKeys.set(r.artist, r.sort_artist || defaultSortArtist(r.artist))
      }
    }
    return [...sortKeys.keys()].sort((a, b) => sortKeys.get(a).localeCompare(sortKeys.get(b)))
  }, [rows])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return rows.filter((r) => {
      if (needle) {
        const hay = `${r.artist} ${r.title}`.toLowerCase()
        if (!hay.includes(needle)) return false
      }
      if (genre && r.genre !== genre) return false
      if (artist && r.artist !== artist) return false
      return true
    })
  }, [rows, q, genre, artist])

  // Distinct artists within the current search/genre filters, in the same
  // order as the grid, so the index and grid stay positionally in sync.
  const filteredArtists = useMemo(() => {
    const sortKeys = new Map()
    for (const r of filtered) {
      if (r.artist && !sortKeys.has(r.artist)) {
        sortKeys.set(r.artist, r.sort_artist || defaultSortArtist(r.artist))
      }
    }
    return [...sortKeys.entries()]
      .map(([name, sortKey]) => ({ name, sortKey }))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
  }, [filtered])

  function getCurrentTopArtist() {
    const headerOffset = 90
    for (const item of filtered) {
      const node = itemRefs.current.get(item.id)
      if (!node) continue
      if (node.getBoundingClientRect().bottom > headerOffset) return item.artist
    }
    return filtered[0]?.artist ?? null
  }

  function openIndex() {
    setActiveArtist(getCurrentTopArtist())
    setIndexOpen(true)
  }

  function jumpToArtist(name) {
    setIndexOpen(false)
    const targetId = filtered.find((r) => r.artist === name)?.id
    if (targetId == null) return
    requestAnimationFrame(() => {
      itemRefs.current.get(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function handleGridTouchStart(e) {
    const t = e.touches[0]
    gridTouchRef.current = { x: t.clientX, y: t.clientY }
  }

  function handleGridTouchEnd(e) {
    if (!gridTouchRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - gridTouchRef.current.x
    const dy = t.clientY - gridTouchRef.current.y
    gridTouchRef.current = null
    if (dx > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) openIndex()
  }

  const inputClass =
    'bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-rose-500 placeholder-zinc-500'

  return (
    <>
      <Header
        action={
          <Link
            to={cfg.addPath}
            className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            {cfg.addLabel}
          </Link>
        }
      />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search artist or title..."
            className={`flex-1 ${inputClass}`}
          />
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className={`${inputClass} text-zinc-100`}
          >
            <option value="">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className={`${inputClass} text-zinc-100`}
          >
            <option value="">All artists</option>
            {artists.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-zinc-500 text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <p className="text-lg mb-2">{cfg.emptyText}</p>
            <Link to={cfg.addPath} className="text-rose-500 hover:text-rose-400 text-sm transition-colors">
              {cfg.emptyCta}
            </Link>
          </div>
        ) : (
          <>
            <p className="text-zinc-500 text-sm mb-4">
              {filtered.length} {cfg.countNoun}
              {filtered.length !== 1 ? 's' : ''}
            </p>
            <div
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 touch-pan-y"
              onTouchStart={handleGridTouchStart}
              onTouchEnd={handleGridTouchEnd}
            >
              {filtered.map((item) => (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(item.id, el)
                    else itemRefs.current.delete(item.id)
                  }}
                  onClick={() => setSelected(item)}
                  className="scroll-mt-20 cursor-pointer bg-zinc-800 rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/50 hover:ring-1 hover:ring-rose-500/30"
                >
                  {item.cover_art_url ? (
                    <img
                      src={item.cover_art_url}
                      alt={item.title}
                      className="w-full aspect-square object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-zinc-700 flex items-center justify-center">
                      <span className="text-zinc-500 text-3xl font-bold tracking-widest">LP</span>
                    </div>
                  )}
                  <div className="p-3">
                    <div className="font-medium text-sm truncate">{item.title}</div>
                    <div className="text-zinc-400 text-xs truncate mt-0.5">{item.artist}</div>
                    {item.year && <div className="text-zinc-500 text-xs mt-0.5">{item.year}</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {!loading && filtered.length > 0 && !indexOpen && (
        <button
          onClick={openIndex}
          aria-label="Jump to artist index"
          className="fixed right-0 top-1/2 -translate-y-1/2 z-20 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-300 text-xs font-display tracking-widest py-3 px-1 rounded-l-md shadow-lg"
        >
          A–Z
        </button>
      )}

      {indexOpen && (
        <ArtistIndexOverlay
          artists={filteredArtists}
          activeArtist={activeArtist}
          onSelect={jumpToArtist}
          onClose={() => setIndexOpen(false)}
        />
      )}

      {selected && (
        <DetailModal
          table={table}
          item={selected}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
    </>
  )
}
