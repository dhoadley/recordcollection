import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { TABLES } from '../lib/tables'
import Header from '../components/Header'
import DetailModal from '../components/DetailModal'

export default function CollectionPage({ table }) {
  const cfg = TABLES[table]
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [genre, setGenre] = useState('')
  const [artist, setArtist] = useState('')
  const [selected, setSelected] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('artist')
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
  const artists = useMemo(
    () =>
      [...new Set(rows.map((r) => r.artist).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b)
      ),
    [rows]
  )

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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelected(item)}
                  className="cursor-pointer bg-zinc-800 rounded-lg overflow-hidden transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-black/50 hover:ring-1 hover:ring-rose-500/30"
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
