from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Dict
from pydantic import BaseModel
import os
from dotenv import load_dotenv
from supabase import create_client
from pathlib import Path
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

# ★注意: 認証実装後、このDUMMY_SONGSは認証されたユーザーごとに管理するべきです。
DUMMY_SONGS = []

class SongRequest(BaseModel):
    title: str
    artist: str
    sharedBy: str
    distance: str
    videoId: str = None 
    lat: float = None # 緯度を追加
    lng: float = None # 経度を追加

# --- 認証リクエストのPydanticモデル定義 ---
class AuthRequest(BaseModel):
    email: str
    password: str
    username: str = None # サインアップ時のみ使用


# -------------------------------------------------------------------------
# Supabase 初期化
# -------------------------------------------------------------------------

# 現在のスクリプトのディレクトリを取得
current_dir = Path(__file__).parent.absolute()
# .env ファイルのパスを指定
dotenv_path = current_dir / '.env'
# .env ファイルを読み込む
load_dotenv(dotenv_path)

# -------------------------------------------------------------------------
# Supabase 初期化
# -------------------------------------------------------------------------

# 現在のスクリプトのディレクトリを取得
current_dir = Path(__file__).parent.absolute()
# .env ファイルのパスを指定
dotenv_path = current_dir / '.env'
# .env ファイルを読み込む
load_dotenv(dotenv_path)

# Supabase クライアントの初期化
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("⚠️ Supabase環境変数が設定されていません")
    use_supabase = False
else:
    try:
        supabase = create_client(supabase_url, supabase_key)
        use_supabase = True
        print("✅ Supabase 初期化成功")
    except Exception as e:
        print(f"⚠️ Supabaseの初期化に失敗: {e}")
        use_supabase = False

@app.post("/api/auth/signup")
async def signup_user(req: AuthRequest):
    """ユーザーをSupabaseにサインアップする。トリガー関数が自動的にusersテーブルにユーザー情報を追加。"""
    if not use_supabase:
        return JSONResponse(content={"error": "Supabase not configured"}, status_code=500)
    
    if not req.username:
        return JSONResponse(content={"error": "ユーザー名を入力してください"}, status_code=400)
    
    try:
        # Supabase Authでアカウント作成（ユーザー名をメタデータとして追加）
        response = supabase.auth.sign_up(
            {
                "email": req.email,
                "password": req.password,
                "options": {
                    "data": {
                        "username": req.username  # トリガー関数がこのメタデータを使用
                    }
                }
            }
        )
        
        # sessionオブジェクトを辞書に変換
        session_data = None
        if response.session:
            session_data = {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                # 必要に応じて他のセッション情報を追加
            }
        
        # 成功レスポンス
        return JSONResponse(content={
            "user_id": response.user.id, 
            "session": session_data
        }, status_code=200)

    except Exception as e:
        # Supabaseからのエラーメッセージをキャッチして返す
        error_message = str(e).split('message=')[-1].split(',')[0].strip("'\"")
        print(f"サインアップエラー: {e}")
        return JSONResponse(content={"error": error_message or "サインアップに失敗しました"}, status_code=400)

@app.post("/api/auth/signin")
async def signin_user(req: AuthRequest):
    """ユーザーをSupabaseにサインインさせる。成功後、ユーザー名を取得して返す。"""
    if not use_supabase:
        return JSONResponse(content={"error": "Supabase not configured"}, status_code=500)

    try:
        # Supabase Authでサインイン
        response = supabase.auth.sign_in_with_password(
            {
                "email": req.email,
                "password": req.password,
            }
        )

        # ユーザーIDからユーザー名を取得
        username = None
        if response.user:
            profile_response = supabase.table('users').select('username').eq('id', response.user.id).single().execute()
            if profile_response.data:
                username = profile_response.data.get('username')
        
        # sessionオブジェクトを辞書に変換
        session_data = None
        if response.session:
            session_data = {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                # 必要に応じて他のセッション情報を追加
            }
        
        # 成功レスポンス
        return JSONResponse(content={
            "user_id": response.user.id,
            "session": session_data, 
            "username": username
        }, status_code=200)

    except Exception as e:
        error_message = str(e).split('message=')[-1].split(',')[0].strip("'\"")
        print(f"サインインエラー: {e}")
        return JSONResponse(content={"error": error_message or "サインインに失敗しました。メールアドレスとパスワードを確認してください。"}, status_code=400)
    
    
# -------------------------------------------------------------------------
# 既存のAPIエンドポイント
# -------------------------------------------------------------------------
# ★注意: 認証後、これらのエンドポイントにはトークン検証ミドルウェアが必要です。
# 現状はデモのため、認証ロジックを省略しています。

@app.get("/api/songs")
async def get_songs():
    """近くのユーザーの曲リストを返す (ダミー)"""
    return JSONResponse(content=DUMMY_SONGS)

@app.post("/api/songs")
async def add_song(song: SongRequest):
    """自分の曲をシェアする (ダミー)"""
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
        # ... 既存のytmusicapi検索ロジック ...
        results = yt.search("J-Pop Hits MV", filter="videos", limit=100)
        songs = []
        for item in results:
            if 'videoId' in item:
                songs.append({
                    "id": item['videoId'],
                    "title": item['title'],
                    "artist": item['artists'][0]['name'] if item.get('artists') else "Unknown",
                    "image": item['thumbnails'][-1]['url']
                })
        if len(songs) < 5:
             return JSONResponse(content=BACKUP_SONGS)
        return JSONResponse(content=songs[:15]) # 上位15件に制限
    except Exception as e:
        print("❌ API Error Detail:", traceback.format_exc())
        return JSONResponse(content=BACKUP_SONGS)

@app.get("/api/search")
async def search(q: str):
    """ユーザーが入力したキーワードで検索"""
    if not use_api:
        return JSONResponse(content=[])

    try:
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
        return JSONResponse(content=songs)
    except Exception as e:
        print("Search Error:", e)
        return JSONResponse(content=[])

@app.get("/api/users")
async def get_users():
    """Supabaseからユーザー情報を取得して表示 (デモ用)"""
    if not use_supabase:
        return JSONResponse(content={"error": "Supabase not configured"}, status_code=500)
    
    try:
        # usersテーブルからIDとユーザー名を取得
        response = supabase.table('users').select('id, username').execute()
        return JSONResponse(content=response.data)
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, proxy_headers=False)