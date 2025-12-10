from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict
from pydantic import BaseModel
import traceback

try:
    from ytmusicapi import YTMusic
    yt = YTMusic()
    use_api = True
    print("✅ ytmusicapi initialized successfully")
except Exception as e:
    print(f"⚠️ ytmusicapiの起動に失敗: {e}")
    use_api = False

app = FastAPI()

origins = ["*"] 
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BACKUP_SONGS = [
    { "id": "ZRtdQ81jPUQ", "title": "アイドル", "artist": "YOASOBI", "image": "https://img.youtube.com/vi/ZRtdQ81jPUQ/mqdefault.jpg" },
    { "id": "H6FUBWGSOIc", "title": "Bling-Bang-Bang-Born", "artist": "Creepy Nuts", "image": "https://img.youtube.com/vi/H6FUBWGSOIc/mqdefault.jpg" },
    { "id": "g8DFX_i38c0", "title": "怪獣の花唄", "artist": "Vaundy", "image": "https://img.youtube.com/vi/g8DFX_i38c0/mqdefault.jpg" },
    { "id": "i1wofkI11g8", "title": "ケセラセラ (Live)", "artist": "Mrs. GREEN APPLE", "image": "https://img.youtube.com/vi/i1wofkI11g8/mqdefault.jpg" },
    { "id": "ony539T074w", "title": "白日", "artist": "King Gnu", "image": "https://img.youtube.com/vi/ony539T074w/mqdefault.jpg" },
    { "id": "1FliVTkA_8E", "title": "新時代 (Live)", "artist": "Ado", "image": "https://img.youtube.com/vi/1FliVTkA_8E/mqdefault.jpg" },
    { "id": "hN5MBlGv2Ac", "title": "Subtitle", "artist": "Official髭男dism", "image": "https://img.youtube.com/vi/hN5MBlGv2Ac/mqdefault.jpg" },
    { "id": "mpzI5bC4d-U", "title": "SPECIALZ", "artist": "King Gnu", "image": "https://img.youtube.com/vi/mpzI5bC4d-U/mqdefault.jpg" },
    { "id": "anHcU5s3Y5o", "title": "晩餐歌", "artist": "tuki.", "image": "https://img.youtube.com/vi/anHcU5s3Y5o/mqdefault.jpg" },
    { "id": "y8SPcdfdPSP", "title": "ドライフラワー", "artist": "優里", "image": "https://img.youtube.com/vi/y8SPcdfdPSP/mqdefault.jpg" },
    { "id": "BS5YyieaDgp", "title": "幾億光年", "artist": "Omoinotake", "image": "https://img.youtube.com/vi/BS5YyieaDgp/mqdefault.jpg" },
    { "id": "9aV3_z2aWbQ", "title": "タイムパラドックス", "artist": "Vaundy", "image": "https://img.youtube.com/vi/9aV3_z2aWbQ/mqdefault.jpg" },
    { "id": "8ps6c867M7k", "title": "唱", "artist": "Ado", "image": "https://img.youtube.com/vi/8ps6c867M7k/mqdefault.jpg" },
    { "id": "j1hft9Wjy94", "title": "花になって", "artist": "緑黄色社会", "image": "https://img.youtube.com/vi/j1hft9Wjy94/mqdefault.jpg" },
]

DUMMY_SONGS = []

class SongRequest(BaseModel):
    title: str
    artist: str
    sharedBy: str
    distance: str
    videoId: str = None 



@app.get("/api/songs")
async def get_songs():
    """近くのユーザーの曲リストを返す"""
    return JSONResponse(content=DUMMY_SONGS)

@app.post("/api/songs")
async def add_song(song: SongRequest):
    """自分の曲をシェアする"""
    new_song = song.dict()
    new_song["id"] = len(DUMMY_SONGS) + 1
    DUMMY_SONGS.append(new_song)
    print(f"Share received: {new_song['title']}")
    return new_song

@app.get("/api/charts")
async def get_charts():
    """ホーム画面用: 人気アーティストのMVを検索してトレンドとして返す"""
    if not use_api:
        return JSONResponse(content=BACKUP_SONGS)

    try:
        print("Searching for J-Pop Hits...")
        search_query = "YOASOBI Mrs. GREEN APPLE Vaundy Ado King Gnu Creepy Nuts Official髭男dism 優里 back number MV"
        results = yt.search(search_query, filter="videos", limit=100)
        
        if not results:
            raise Exception("Search results empty")

        songs = []
        for item in results:
            title = item['title']
            if "メドレー" in title or "BGM" in title or "作業用" in title or "Mix" in title:
                continue

            if 'videoId' in item:
                songs.append({
                    "id": item['videoId'],
                    "title": item['title'],
                    "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                    "image": item['thumbnails'][-1]['url']
                })
        
        print(f"✅ Success! Got {len(songs)} filtered songs.")
        if len(songs) < 5:
             return JSONResponse(content=BACKUP_SONGS)
        return JSONResponse(content=songs)

    except Exception as e:
        print("❌ API Error Detail:", traceback.format_exc())
        return JSONResponse(content=BACKUP_SONGS)

@app.get("/api/search")
async def search(q: str):
    """ユーザーが入力したキーワードで検索"""
    if not use_api:
        return JSONResponse(content=[])

    try:
        print(f"Searching for: {q}")
        results = yt.search(q, filter="videos", limit=20)
        
        songs = []
        for item in results:
            if 'videoId' in item:
                songs.append({
                    "id": item['videoId'],
                    "title": item['title'],
                    "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                    "image": item['thumbnails'][-1]['url']
                })
        
        print(f"Found {len(songs)} results")
        return JSONResponse(content=songs)
    except Exception as e:
        print("Search Error:", e)
        return JSONResponse(content=[])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, proxy_headers=False)