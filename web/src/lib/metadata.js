// Client-side metadata lookups.
//
// - Apple Music (iTunes Search API) does NOT send CORS headers, but it supports
//   JSONP via a `callback` param, so we load it with a <script> tag.
// - MusicBrainz / Cover Art Archive send `Access-Control-Allow-Origin: *`, so a
//   normal fetch works.

let jsonpCounter = 0

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = `__itunes_cb_${Date.now()}_${jsonpCounter++}`
    const script = document.createElement('script')
    const timeout = setTimeout(() => {
      cleanup()
      reject(new Error('iTunes request timed out'))
    }, 8000)

    function cleanup() {
      clearTimeout(timeout)
      delete window[cbName]
      script.remove()
    }

    window[cbName] = (data) => {
      cleanup()
      resolve(data)
    }
    script.onerror = () => {
      cleanup()
      reject(new Error('iTunes request failed'))
    }
    script.src = `${url}${url.includes('?') ? '&' : '?'}callback=${cbName}`
    document.body.appendChild(script)
  })
}

// Search Apple Music for albums. Returns a list of candidate records.
export async function searchAppleMusic(term) {
  const q = term.trim()
  if (!q) return []
  const url =
    'https://itunes.apple.com/search?' +
    new URLSearchParams({ term: q, entity: 'album', limit: '8' })
  const data = await jsonp(url)
  const results = data?.results || []
  return results.map((r) => {
    const year = r.releaseDate ? r.releaseDate.slice(0, 4) : ''
    const art = (r.artworkUrl100 || '').replace('100x100bb', '600x600bb')
    return {
      artist: r.artistName || '',
      title: r.collectionName || '',
      year,
      genre: r.primaryGenreName || '',
      cover_art_url: art,
      thumb: r.artworkUrl100 || '',
    }
  })
}

// Search MusicBrainz releases and map them to Cover Art Archive image URLs.
export async function searchMusicBrainzCovers(query) {
  const q = query.trim()
  if (!q) return []
  const url =
    'https://musicbrainz.org/ws/2/release?' +
    new URLSearchParams({ query: q, fmt: 'json', limit: '16' })
  let releases = []
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await resp.json()
    releases = data?.releases || []
  } catch {
    return []
  }
  return releases
    .filter((r) => r.id)
    .map((r) => ({
      thumb: `https://coverartarchive.org/release/${r.id}/front-250`,
      full: `https://coverartarchive.org/release/${r.id}/front-500`,
    }))
}
