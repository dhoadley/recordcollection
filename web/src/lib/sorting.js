// Strips a single leading "The"/"A"/"An" so artists file the way a record
// store would (e.g. "The Cure" -> "Cure"). Only one leading article is ever
// stripped, so a band literally named "The The" correctly stays under T.
const ARTICLE_RE = /^(the|a|an)\s+/i

export function defaultSortArtist(artist) {
  const trimmed = (artist || '').trim()
  const stripped = trimmed.replace(ARTICLE_RE, '').trim()
  return stripped || trimmed
}
