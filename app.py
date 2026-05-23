import os
import requests
from contextlib import contextmanager
from flask import Flask, render_template, request, redirect, url_for
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')

_database_url = os.environ.get('DATABASE_URL', '')
if _database_url.startswith('postgres://'):
    _database_url = _database_url.replace('postgres://', 'postgresql://', 1)


@contextmanager
def db():
    conn = psycopg2.connect(_database_url, cursor_factory=RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS albums (
                    id SERIAL PRIMARY KEY,
                    artist TEXT NOT NULL,
                    title TEXT NOT NULL,
                    year INTEGER,
                    genre TEXT,
                    cover_art_url TEXT,
                    date_added TIMESTAMPTZ DEFAULT NOW()
                )
            ''')


with app.app_context():
    init_db()


@app.route('/')
def index():
    q = request.args.get('q', '').strip()
    genre = request.args.get('genre', '').strip()
    artist = request.args.get('artist', '').strip()

    filters = []
    params = []
    if q:
        filters.append("(LOWER(artist) LIKE %s OR LOWER(title) LIKE %s)")
        params.extend([f'%{q.lower()}%', f'%{q.lower()}%'])
    if genre:
        filters.append("genre = %s")
        params.append(genre)
    if artist:
        filters.append("artist = %s")
        params.append(artist)

    where = f"WHERE {' AND '.join(filters)}" if filters else ""

    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"SELECT * FROM albums {where} ORDER BY artist, title", params)
            albums = cur.fetchall()
            cur.execute("SELECT DISTINCT genre FROM albums WHERE genre IS NOT NULL ORDER BY genre")
            genres = [r['genre'] for r in cur.fetchall()]
            cur.execute("SELECT DISTINCT artist FROM albums ORDER BY artist")
            artists = [r['artist'] for r in cur.fetchall()]

    if request.headers.get('HX-Request'):
        return render_template('partials/album_list.html', albums=albums)

    return render_template('index.html', albums=albums, genres=genres, artists=artists,
                           q=q, selected_genre=genre, selected_artist=artist)


@app.route('/add', methods=['GET', 'POST'])
def add():
    if request.method == 'POST':
        artist = request.form['artist'].strip()
        title = request.form['title'].strip()
        year = request.form.get('year', '').strip() or None
        genre = request.form.get('genre', '').strip() or None
        cover_art_url = request.form.get('cover_art_url', '').strip() or None

        with db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO albums (artist, title, year, genre, cover_art_url) VALUES (%s, %s, %s, %s, %s)",
                    (artist, title, year, genre, cover_art_url)
                )
        return redirect(url_for('index'))

    return render_template('add.html')


@app.route('/itunes-search')
def itunes_search():
    q = request.args.get('q', '').strip()
    if not q:
        return ''

    try:
        resp = requests.get(
            'https://itunes.apple.com/search',
            params={'term': q, 'entity': 'album', 'limit': 8},
            timeout=5
        )
        results = resp.json().get('results', [])
    except Exception:
        return '<p class="text-red-400 text-sm mt-2">Search unavailable — fill in manually.</p>'

    albums = []
    for r in results:
        year = r.get('releaseDate', '')[:4] if r.get('releaseDate') else ''
        art = r.get('artworkUrl100', '').replace('100x100bb', '600x600bb')
        albums.append({
            'artist': r.get('artistName', ''),
            'title': r.get('collectionName', ''),
            'year': year,
            'genre': r.get('primaryGenreName', ''),
            'cover_art_url': art,
            'thumb': r.get('artworkUrl100', ''),
        })

    return render_template('partials/search_results.html', albums=albums)


@app.route('/records/<int:id>')
def detail(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM albums WHERE id = %s", (id,))
            album = cur.fetchone()
    if not album:
        return redirect(url_for('index'))
    return render_template('detail.html', album=album)


@app.route('/records/<int:id>/delete', methods=['POST'])
def delete(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM albums WHERE id = %s", (id,))
    return redirect(url_for('index'))


if __name__ == '__main__':
    app.run(debug=True, port=8080)
