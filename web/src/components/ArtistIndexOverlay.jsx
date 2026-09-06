import { useEffect, useMemo, useRef } from 'react'

// Full-screen alphabetical zoom-out. Swipe left (or tap "Back") to return to
// the album grid without changing position; tap an artist to jump the grid to
// their first album.
export default function ArtistIndexOverlay({ artists, activeArtist, onSelect, onClose }) {
  const touchRef = useRef(null)
  const activeRowRef = useRef(null)

  const groups = useMemo(() => {
    const map = new Map()
    for (const a of artists) {
      const first = a.sortKey[0]?.toUpperCase() || '#'
      const letter = /[A-Z]/.test(first) ? first : '#'
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter).push(a)
    }
    return [...map.entries()]
  }, [artists])

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  function handleTouchStart(e) {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }

  function handleTouchEnd(e) {
    if (!touchRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - touchRef.current.x
    const dy = t.clientY - touchRef.current.y
    touchRef.current = null
    if (dx < -70 && Math.abs(dx) > Math.abs(dy) * 1.5) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-zinc-900 overflow-y-auto touch-pan-y"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="sticky top-0 bg-zinc-950 border-b border-zinc-800 px-4 py-3 flex items-center justify-between z-10">
        <h2 className="font-display text-xl tracking-wide">Artists</h2>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white text-sm transition-colors"
        >
          Back to albums
        </button>
      </div>
      <div className="max-w-md mx-auto px-4 py-2 pb-10">
        {groups.map(([letter, list]) => (
          <div key={letter}>
            <div className="text-rose-500 font-display text-lg tracking-wide pt-4 pb-1">
              {letter}
            </div>
            <ul className="divide-y divide-zinc-800">
              {list.map((a) => (
                <li key={a.name} ref={a.name === activeArtist ? activeRowRef : null}>
                  <button
                    onClick={() => onSelect(a.name)}
                    className={`w-full text-left py-2.5 text-sm transition-colors ${
                      a.name === activeArtist
                        ? 'text-rose-400 font-medium'
                        : 'text-zinc-200 hover:text-white'
                    }`}
                  >
                    {a.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
