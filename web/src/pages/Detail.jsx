import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import Header from '../components/Header'

export default function Detail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [album, setAlbum] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return
        if (!data) {
          navigate('/', { replace: true })
          return
        }
        setAlbum(data)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id, navigate])

  async function handleRemove() {
    if (!confirm('Remove this record from your collection?')) return
    await supabase.from('albums').delete().eq('id', id)
    navigate('/')
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="max-w-5xl mx-auto px-4 py-6 text-zinc-500 text-sm">Loading…</main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="max-w-lg mx-auto">
          <Link
            to="/"
            className="text-zinc-400 hover:text-white text-sm inline-flex items-center gap-1 transition-colors mb-6"
          >
            &larr; Back to collection
          </Link>

          <div className="bg-zinc-800 rounded-xl overflow-hidden mt-2">
            {album.cover_art_url ? (
              <img
                src={album.cover_art_url}
                alt={album.title}
                className="w-full object-cover"
                style={{ maxHeight: '400px' }}
              />
            ) : (
              <div className="w-full h-64 bg-zinc-700 flex items-center justify-center">
                <span className="text-zinc-500 text-6xl font-bold tracking-widest">LP</span>
              </div>
            )}

            <div className="p-6">
              <h1 className="text-2xl font-bold leading-tight">{album.title}</h1>
              <p className="text-zinc-300 text-lg mt-1">{album.artist}</p>
              <div className="flex gap-4 mt-3 text-sm text-zinc-400">
                {album.year && <span>{album.year}</span>}
                {album.genre && <span>{album.genre}</span>}
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-700">
                <button
                  onClick={handleRemove}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  Remove from collection
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
