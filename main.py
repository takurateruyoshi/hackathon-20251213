from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from supabase import create_client
from pathlib import Path
import traceback
from datetime import datetime

# --- 初期設定 ---
try:
    from ytmusicapi import YTMusic
    # 日本のチャートを取得するために地域を設定
    yt = YTMusic(language='ja', location='JP')
    use_api = True
    print("✅ ytmusicapi initialized (JP mode)")
except:
    use_api = False

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Supabase設定 ---
current_dir = Path(__file__).parent.absolute()
load_dotenv(current_dir / '.env')
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
use_supabase = bool(supabase_url and supabase_key)
if use_supabase:
    supabase = create_client(supabase_url, supabase_key)

# --- バックアップデータ ---
BACKUP_SONGS = [
    { "id": "ZRtdQ81jPUQ", "title": "アイドル", "artist": "YOASOBI", "image": "https://img.youtube.com/vi/ZRtdQ81jPUQ/mqdefault.jpg" },
    { "id": "H6FUBWGSOIc", "title": "Bling-Bang-Bang-Born", "artist": "Creepy Nuts", "image": "https://img.youtube.com/vi/H6FUBWGSOIc/mqdefault.jpg" },
    { "id": "g8DFX_i38c0", "title": "怪獣の花唄", "artist": "Vaundy", "image": "https://img.youtube.com/vi/g8DFX_i38c0/mqdefault.jpg" },
    { "id": "anHcU5s3Y5o", "title": "晩餐歌", "artist": "tuki.", "image": "https://img.youtube.com/vi/anHcU5s3Y5o/mqdefault.jpg" },
    { "id": "mpzI5bC4d-U", "title": "SPECIALZ", "artist": "King Gnu", "image": "https://img.youtube.com/vi/mpzI5bC4d-U/mqdefault.jpg" },
]
DUMMY_SONGS = []

# --- Pydanticモデル定義 ---
class AuthRequest(BaseModel):
    email: str
    password: str
    username: str = None

class SongRequest(BaseModel):
    title: str
    artist: str
    sharedBy: str
    distance: str = "0m"
    videoId: str
    lat: float = None
    lng: float = None
    isPlaying: bool = True

class PlaylistCreate(BaseModel):
    title: str
    description: str = None

class SongAdd(BaseModel):
    track_video_id: str
    track_title: str
    artist_name: str
    position: int = 0

# --- ヘルパー関数 ---
def snake_to_camel(data):
    if isinstance(data, list): return [snake_to_camel(i) for i in data]
    if isinstance(data, dict):
        new_d = {}
        for k, v in data.items():
            parts = k.split('_')
            new_key = parts[0] + ''.join(x.title() for x in parts[1:])
            new_d[new_key] = snake_to_camel(v)
        return new_d
    return data

# --- 認証API ---
@app.post("/api/auth/signup")
async def signup_user(req: AuthRequest):
    if not use_supabase: return JSONResponse({"error": "No DB"}, 500)
    try:
        res = supabase.auth.sign_up({
            "email": req.email, "password": req.password,
            "options": {"data": {"username": req.username}}
        })
        session = {"access_token": res.session.access_token} if res.session else None
        return JSONResponse({"user_id": res.user.id, "session": session}, 200)
    except Exception as e:
        return JSONResponse({"error": str(e)}, 400)

@app.post("/api/auth/signin")
async def signin_user(req: AuthRequest):
    if not use_supabase: return JSONResponse({"error": "No DB"}, 500)
    try:
        res = supabase.auth.sign_in_with_password({"email": req.email, "password": req.password})
        username = None
        if res.user:
            user_data = supabase.table('users').select('username').eq('id', res.user.id).single().execute()
            username = user_data.data.get('username') if user_data.data else None
        session = {"access_token": res.session.access_token} if res.session else None
        return JSONResponse({"session": session, "username": username}, 200)
    except Exception as e:
        return JSONResponse({"error": "Login failed"}, 400)

# --- 共有API ---
@app.get("/api/songs")
async def get_songs():
    if not use_supabase: return JSONResponse(DUMMY_SONGS)
    try:
        res = supabase.table("shared_songs").select("*").execute()
        data = []
        for s in res.data:
            vid = s.get("videoid")
            # 画像URLの安全化
            img = f"https://img.youtube.com/vi/{vid}/mqdefault.jpg" if vid and len(vid) > 5 else "https://via.placeholder.com/120x90?text=No+Image"
            data.append({
                "id": vid,
                "title": s.get("title"),
                "artist": s.get("artist"),
                "sharedBy": s.get("sharedby"),
                "distance": s.get("distance", "0m"),
                "videoId": vid,
                "lat": s.get("lat"),
                "lng": s.get("lng"),
                "image": img
            })
        return JSONResponse(data)
    except: return JSONResponse(DUMMY_SONGS)

@app.post("/api/songs")
async def add_song(song: SongRequest):
    if not use_supabase: return JSONResponse({"error": "No DB"}, 500)
    try:
        data = {
            "title": song.title, "artist": song.artist, "sharedby": song.sharedBy,
            "distance": song.distance, "videoid": song.videoId,
            "lat": song.lat, "lng": song.lng, "timestamp": datetime.now().isoformat()
        }
        existing = supabase.table("shared_songs").select("id").eq("sharedby", song.sharedBy).execute()
        if existing.data:
            supabase.table("shared_songs").update(data).eq("id", existing.data[0]['id']).execute()
        else:
            supabase.table("shared_songs").insert(data).execute()
        return JSONResponse({"status": "ok"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

# --- チャートAPI (日本トレンド) ---
@app.get("/api/charts")
async def get_charts():
    if not use_api: return JSONResponse(BACKUP_SONGS)
    try:
        charts = yt.get_charts(country='JP')
        results = charts.get('videos', {}).get('items', [])
        
        songs = []
        for item in results:
            if 'videoId' in item:
                songs.append({
                    "id": item['videoId'],
                    "title": item['title'],
                    "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                    "image": item['thumbnails'][-1]['url']
                })
        
        # 取得できなかった場合のフォールバック検索
        if not songs:
            res = yt.search("J-Pop Top Hits", filter="videos", limit=20)
            for item in res:
                if 'videoId' in item:
                    songs.append({
                        "id": item['videoId'],
                        "title": item['title'],
                        "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                        "image": item['thumbnails'][-1]['url']
                    })

        return JSONResponse(songs[:20])
    except Exception as e:
        print(f"Chart Error: {e}")
        return JSONResponse(BACKUP_SONGS)

@app.get("/api/search")
async def search(q: str):
    if not use_api: return JSONResponse([])
    try:
        res = yt.search(q, filter="videos", limit=20)
        songs = [{"id": i['videoId'], "title": i['title'], "artist": i['artists'][0]['name'], "image": i['thumbnails'][-1]['url']} for i in res if 'videoId' in i]
        return JSONResponse(songs)
    except: return JSONResponse([])

# --- プレイリストAPI ---
@app.get("/api/playlists")
async def get_playlists(request: Request):
    auth = request.headers.get("Authorization")
    if not auth: return JSONResponse({"error": "Unauthorized"}, 401)
    try:
        token = auth.split(' ')[1]
        user = supabase.auth.get_user(token)
        user_id = user.user.id
        
        playlists = supabase.table("playlists").select("*").eq("user_id", user_id).execute()
        result = []
        for pl in playlists.data:
            count = supabase.table("playlist_tracks").select("*", count="exact").eq("playlist_id", pl["id"]).execute()
            pl["songs_count"] = count.count
            result.append(pl)
        return JSONResponse(snake_to_camel(result))
    except: return JSONResponse([], 200)

@app.post("/api/playlists")
async def create_playlist(playlist: PlaylistCreate, request: Request):
    auth = request.headers.get("Authorization")
    if not auth: return JSONResponse({"error": "Unauthorized"}, 401)
    try:
        token = auth.split(' ')[1]
        user = supabase.auth.get_user(token)
        data = {"title": playlist.title, "description": playlist.description, "user_id": user.user.id, "is_public": True}
        res = supabase.table("playlists").insert(data).execute()
        return JSONResponse(snake_to_camel(res.data[0]))
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

@app.get("/api/playlists/{playlist_id}")
async def get_playlist_detail(playlist_id: str, request: Request):
    auth = request.headers.get("Authorization")
    if not auth: return JSONResponse({"error": "Unauthorized"}, 401)
    try:
        pl = supabase.table("playlists").select("*").eq("id", playlist_id).execute()
        if not pl.data: return JSONResponse({"error": "Not found"}, 404)
        
        data = pl.data[0]
        songs = supabase.table("playlist_tracks").select("*").eq("playlist_id", playlist_id).order("position").execute()
        data["songs"] = songs.data
        return JSONResponse(snake_to_camel(data))
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

@app.post("/api/playlists/{playlist_id}/songs")
async def add_song_to_playlist(playlist_id: str, song: SongAdd, request: Request):
    auth = request.headers.get("Authorization")
    if not auth: return JSONResponse({"error": "Unauthorized"}, 401)
    try:
        token = auth.split(' ')[1]
        user = supabase.auth.get_user(token)
        data = {
            "playlist_id": playlist_id,
            "track_video_id": song.track_video_id,
            "track_title": song.track_title,
            "artist_name": song.artist_name,
            "position": song.position,
            "added_from_user_id": user.user.id
        }
        res = supabase.table("playlist_tracks").insert(data).execute()
        return JSONResponse(snake_to_camel(res.data[0]))
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

# --- 削除機能 ---
@app.delete("/api/playlists/{playlist_id}")
async def delete_playlist(playlist_id: str, request: Request):
    auth = request.headers.get("Authorization")
    if not auth: return JSONResponse({"error": "Unauthorized"}, 401)
    try:
        token = auth.split(' ')[1]
        user = supabase.auth.get_user(token)
        # 曲を削除してからプレイリスト本体を削除
        supabase.table("playlist_tracks").delete().eq("playlist_id", playlist_id).execute()
        supabase.table("playlists").delete().eq("id", playlist_id).eq("user_id", user.user.id).execute()
        return JSONResponse({"status": "deleted"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

@app.delete("/api/playlists/{playlist_id}/songs/{video_id}")
async def remove_song_from_playlist(playlist_id: str, video_id: str, request: Request):
    auth = request.headers.get("Authorization")
    if not auth: return JSONResponse({"error": "Unauthorized"}, 401)
    try:
        supabase.table("playlist_tracks").delete().eq("playlist_id", playlist_id).eq("track_video_id", video_id).execute()
        return JSONResponse({"status": "deleted"})
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)

# --- 他ユーザーの公開曲取得 ---
@app.get("/api/users/{username}/public-tracks")
async def get_user_public_tracks(username: str):
    if not use_supabase: return JSONResponse([])
    try:
        user_res = supabase.table("users").select("id").eq("username", username).execute()
        if not user_res.data: return JSONResponse([])
        
        target_user_id = user_res.data[0]['id']
        playlists = supabase.table("playlists").select("id").eq("user_id", target_user_id).eq("is_public", True).execute()
        
        tracks = []
        if playlists.data:
            first_playlist_id = playlists.data[0]['id']
            track_res = supabase.table("playlist_tracks").select("*").eq("playlist_id", first_playlist_id).limit(20).execute()
            for t in track_res.data:
                vid = t.get("track_video_id")
                img = f"https://img.youtube.com/vi/{vid}/mqdefault.jpg" if vid else "https://via.placeholder.com/120x90?text=No+Image"
                tracks.append({
                    "title": t.get("track_title"),
                    "artist": t.get("artist_name"),
                    "videoId": vid,
                    "image": img
                })
        return JSONResponse(tracks)
    except: return JSONResponse([])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, proxy_headers=False)