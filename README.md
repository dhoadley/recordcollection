# My Records

[![Vercel Deploy](https://deploy-badge.vercel.app/?url=https%3A%2F%2Frecordcollection-psi.vercel.app&name=production)](https://recordcollection-psi.vercel.app)

A personal vinyl record collection and wishlist tracker. Browse your
collection as a grid of cover art, search and filter by artist or genre,
and keep a wishlist you can "buy" straight into the collection.

## Features

- **Collection & wishlist** — browse, search, and filter your records;
  move an item from wishlist to collection in one tap.
- **Add/edit records** — look up artist, title, year, genre, and cover art
  via Apple Music and MusicBrainz, or upload your own photo as cover art.
- **Swipe-to-index browsing** — swipe right on the grid to zoom out to a
  full alphabetical artist list, synced to your scroll position; swipe left
  or tap an artist to jump straight back into the grid.
- **Tracklist lookup** — jump from an album's detail view to a Discogs
  search for its tracklist.
- **Duplicate checking** — flags likely duplicates before saving a new
  entry.
- **Mobile-first** — installable to an iPhone home screen with a custom
  icon, tuned for one-handed browsing.

## Tech stack

React + Vite frontend, [Supabase](https://supabase.com) (Postgres + Auth)
as the backend, deployed on [Vercel](https://vercel.com). No server to run —
everything talks to Supabase and public metadata APIs directly from the
browser.

## Development & deployment

The app lives in [`web/`](./web). See [`web/README.md`](./web/README.md) for
local setup, Supabase configuration, and deploying to Vercel.
