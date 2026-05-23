import os
import requests
from contextlib import contextmanager
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, session
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
            cur.execute('''
                CREATE TABLE IF NOT EXISTS wishlist (
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


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated


@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('logged_in'):
        return redirect(url_for('index'))
    error = False
    if request.method == 'POST':
        if request.form.get('password') == os.environ.get('APP_PASSWORD'):
            session['logged_in'] = True
            return redirect(url_for('index'))
        error = True
    return render_template('login.html', error=error)


@app.route('/logout', methods=['POST'])
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/')
@login_required
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
@login_required
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
@login_required
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


@app.route('/records/<int:id>/modal')
@login_required
def album_modal(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM albums WHERE id = %s", (id,))
            album = cur.fetchone()
    if not album:
        return ''
    return render_template('partials/album_modal.html', album=album)


@app.route('/records/<int:id>')
@login_required
def detail(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM albums WHERE id = %s", (id,))
            album = cur.fetchone()
    if not album:
        return redirect(url_for('index'))
    return render_template('detail.html', album=album)


@app.route('/records/<int:id>/delete', methods=['POST'])
@login_required
def delete(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM albums WHERE id = %s", (id,))
    return redirect(url_for('index'))


def _musicbrainz_covers(q):
    try:
        resp = requests.get(
            'https://musicbrainz.org/ws/2/release',
            params={'query': q, 'fmt': 'json', 'limit': 16},
            headers={'User-Agent': 'RecordCollection/1.0 (dave.hoadley@gmail.com)'},
            timeout=8
        )
        releases = resp.json().get('releases', [])
    except Exception:
        return []
    covers = []
    for r in releases:
        mbid = r.get('id')
        if mbid:
            covers.append({
                'thumb': f'https://coverartarchive.org/release/{mbid}/front-250',
                'full': f'https://coverartarchive.org/release/{mbid}/front-500',
            })
    return covers


@app.route('/records/<int:id>/art-search')
@login_required
def records_art_search(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT artist, title FROM albums WHERE id = %s", (id,))
            album = cur.fetchone()
    if not album:
        return ''
    return render_template('partials/art_search_modal.html',
                           table='records', id=id,
                           artist=album['artist'], title=album['title'])


@app.route('/records/<int:id>/art', methods=['POST'])
@login_required
def records_update_art(id):
    url = request.form.get('cover_art_url', '').strip()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE albums SET cover_art_url = %s WHERE id = %s", (url, id))
    return ('', 204)


@app.route('/wishlist/<int:id>/art-search')
@login_required
def wishlist_art_search(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT artist, title FROM wishlist WHERE id = %s", (id,))
            item = cur.fetchone()
    if not item:
        return ''
    return render_template('partials/art_search_modal.html',
                           table='wishlist', id=id,
                           artist=item['artist'], title=item['title'])


@app.route('/wishlist/<int:id>/art', methods=['POST'])
@login_required
def wishlist_update_art(id):
    url = request.form.get('cover_art_url', '').strip()
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("UPDATE wishlist SET cover_art_url = %s WHERE id = %s", (url, id))
    return ('', 204)


@app.route('/musicbrainz-art')
@login_required
def musicbrainz_art():
    q = request.args.get('q', '').strip()
    table = request.args.get('table', 'records')
    id = request.args.get('id', 0)
    covers = _musicbrainz_covers(q) if q else []
    return render_template('partials/art_results.html', covers=covers, table=table, id=id)


@app.route('/collection-check')
@login_required
def collection_check():
    artist = request.args.get('artist', '').strip()
    title = request.args.get('title', '').strip()
    if not artist or not title:
        return ''
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM albums WHERE LOWER(artist) = LOWER(%s) AND LOWER(title) = LOWER(%s) LIMIT 1",
                (artist, title)
            )
            found = cur.fetchone()
    if found:
        return (
            '<div class="bg-amber-900/40 border border-amber-600/50 '
            'rounded-lg px-3 py-2.5 mt-2 text-sm text-amber-300">'
            'Already in your collection.</div>'
        )
    return ''


@app.route('/wishlist-check')
@login_required
def wishlist_check():
    artist = request.args.get('artist', '').strip()
    title = request.args.get('title', '').strip()
    if not artist or not title:
        return ''
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM wishlist WHERE LOWER(artist) = LOWER(%s) AND LOWER(title) = LOWER(%s) LIMIT 1",
                (artist, title)
            )
            found = cur.fetchone()
    if found:
        return (
            '<div class="bg-amber-900/40 border border-amber-600/50 '
            'rounded-lg px-3 py-2.5 mt-2 text-sm text-amber-300">'
            'Already in your wishlist.</div>'
        )
    return ''


@app.route('/wishlist')
@login_required
def wishlist():
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
            cur.execute(f"SELECT * FROM wishlist {where} ORDER BY artist, title", params)
            items = cur.fetchall()
            cur.execute("SELECT DISTINCT genre FROM wishlist WHERE genre IS NOT NULL ORDER BY genre")
            genres = [r['genre'] for r in cur.fetchall()]
            cur.execute("SELECT DISTINCT artist FROM wishlist ORDER BY artist")
            artists = [r['artist'] for r in cur.fetchall()]

    if request.headers.get('HX-Request'):
        return render_template('partials/wishlist_list.html', items=items)

    return render_template('wishlist.html', items=items, genres=genres, artists=artists,
                           q=q, selected_genre=genre, selected_artist=artist)


@app.route('/wishlist/add', methods=['GET', 'POST'])
@login_required
def wishlist_add():
    if request.method == 'POST':
        artist = request.form['artist'].strip()
        title = request.form['title'].strip()
        year = request.form.get('year', '').strip() or None
        genre = request.form.get('genre', '').strip() or None
        cover_art_url = request.form.get('cover_art_url', '').strip() or None

        with db() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "INSERT INTO wishlist (artist, title, year, genre, cover_art_url) VALUES (%s, %s, %s, %s, %s)",
                    (artist, title, year, genre, cover_art_url)
                )
        return redirect(url_for('wishlist'))

    return render_template('wishlist_add.html')


@app.route('/wishlist/<int:id>/modal')
@login_required
def wishlist_modal(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM wishlist WHERE id = %s", (id,))
            item = cur.fetchone()
    if not item:
        return ''
    return render_template('partials/wishlist_modal.html', item=item)


@app.route('/wishlist/<int:id>/buy', methods=['POST'])
@login_required
def wishlist_buy(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM wishlist WHERE id = %s", (id,))
            item = cur.fetchone()
            if item:
                cur.execute(
                    "INSERT INTO albums (artist, title, year, genre, cover_art_url) VALUES (%s, %s, %s, %s, %s)",
                    (item['artist'], item['title'], item['year'], item['genre'], item['cover_art_url'])
                )
                cur.execute("DELETE FROM wishlist WHERE id = %s", (id,))
    return redirect(url_for('index'))


@app.route('/wishlist/<int:id>/delete', methods=['POST'])
@login_required
def wishlist_delete(id):
    with db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM wishlist WHERE id = %s", (id,))
    return redirect(url_for('wishlist'))


if __name__ == '__main__':
    app.run(debug=True, port=8080)
