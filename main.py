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
from datetime import datetime

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
# APIエンドポイント
# -------------------------------------------------------------------------
# ★注意: 認証後、これらのエンドポイントにはトークン検証ミドルウェアが必要です。
# 現状はデモのため、認証ロジックを省略しています。

# -------------------------------------------------------------------------
# 曲保存エンドポイント
# -------------------------------------------------------------------------
@app.get("/api/songs")
async def get_songs():
    """近くのユーザーの曲リストをSupabaseから取得する"""
    if not use_supabase:
        # Supabaseが使えない場合は、既存のバックアップデータまたは空リストを返す
        print("⚠️ Supabase not configured. Returning DUMMY_SONGS.")
        return JSONResponse(content=DUMMY_SONGS) 
        
    try:
        # 各ユーザーの最新の曲だけを返すようにする
        # 上書き保存の仕組みにより、各ユーザーにつき1曲だけ存在するはず
        response = supabase.table('shared_songs').select('*').execute()
        
        # レスポンスデータを正規化してフロントエンドのフォーマットに一致させる
        normalized_data = []
        for song in response.data:
            # データを正規化: videoIdをキャメルケースで統一
            normalized_song = {
                "id": song.get("id"),
                "title": song.get("title"),
                "artist": song.get("artist"),
                "sharedBy": song.get("sharedby"),  # キャメルケースに変換
                "distance": song.get("distance", "0m"),
                "videoId": song.get("videoid"),  # キャメルケースに変換
                "lat": song.get("lat"),
                "lng": song.get("lng"),
                "timestamp": song.get("timestamp")
            }
            normalized_data.append(normalized_song)
            
        # 正規化されたデータを返す
        return JSONResponse(content=normalized_data)

    except Exception as e:
        print(f"Supabase取得エラー: {e}")
        # エラー発生時も空のリストまたはバックアップデータを返す
        return JSONResponse(content=DUMMY_SONGS)
@app.post("/api/songs")
async def add_song(song: SongRequest):
    """自分の曲をSupabaseにシェアする（上書き保存）"""
    if not use_supabase:
        return JSONResponse(content={"error": "Supabase not configured"}, status_code=500)
    
    # Pydanticモデルから辞書を取得
    song_data = song.dict()
    
    shared_by = song_data.get("sharedBy")
    if not shared_by:
        return JSONResponse(content={"error": "sharedByは必須です"}, status_code=400)
    
    # 再生状態を取得（デフォルトはTrue）
    is_playing = song_data.get("isPlaying", True)
    
    # is_playingがFalseの場合、レコードを削除する
    if not is_playing:
        try:
            # ユーザーの既存レコードを削除
            delete_response = supabase.table('shared_songs').delete().eq('sharedby', shared_by).execute()
            print(f"Song record deleted for user {shared_by} (playback stopped)")
            return JSONResponse(content={"status": "deleted", "message": "再生を停止したため、共有を終了しました"})
        except Exception as e:
            print(f"Supabase削除エラー: {traceback.format_exc()}")
            return JSONResponse(content={"error": "共有曲の削除に失敗しました"}, status_code=500)
    
    # ここから下は再生中の処理（is_playing = True）
    
    # videoIdの検証
    video_id = song_data.get("videoId")
    if not video_id or not isinstance(video_id, str) or len(video_id) < 8:
        return JSONResponse(content={"error": "有効なvideoIdが必要です"}, status_code=400)
    
    print(f"保存するvideoId: {video_id}")  # デバッグ出力
    
    # Supabaseに挿入/更新するデータ
    data_to_upsert = {
        "title": song_data.get("title"),
        "artist": song_data.get("artist"),
        "sharedby": shared_by,  # 小文字に修正
        "distance": song_data.get("distance", "0m"),
        "videoid": video_id,  # 小文字に修正
        "lat": song_data.get("lat"),
        "lng": song_data.get("lng"),
        "timestamp": datetime.now().isoformat(),  # 現在の時刻を追加
        "is_playing": True  # 再生中フラグを設定
    }

    try:
        # まず同じユーザーの既存レコードがあるか確認
        existing_records = supabase.table('shared_songs').select('id').eq('sharedby', shared_by).execute()  # 小文字に修正
        
        if existing_records.data:
            # 既存レコードがある場合は更新
            record_id = existing_records.data[0]['id']
            response = supabase.table('shared_songs').update(data_to_upsert).eq('id', record_id).execute()
            print(f"Song updated for user {shared_by}: {song_data.get('title')}")
        else:
            # 新規レコードの場合は挿入
            response = supabase.table('shared_songs').insert(data_to_upsert).execute()
            print(f"New song shared by {shared_by}: {song_data.get('title')}")
        
        # 処理したレコードをフロントエンドフォーマットに変換
        processed_data = response.data[0] if response.data else {"status": "success"}
        
        # フロントエンド用に正規化
        if isinstance(processed_data, dict) and "videoid" in processed_data:
            processed_data["videoId"] = processed_data["videoid"]  # キャメルケース版を追加
        
        return JSONResponse(content=processed_data)

    except Exception as e:
        print(f"Supabase処理エラー: {traceback.format_exc()}")
        return JSONResponse(content={"error": "曲の共有に失敗しました"}, status_code=500)
# -------------------------------------------------------------------------
# APIエンドポイント
# -------------------------------------------------------------------------
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



# キーをスネークケースからキャメルケースに変換する関数
def snake_to_camel(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.title() for x in components[1:])

# データ構造全体を再帰的にキャメルケースに変換する関数
def normalize_to_camel_case(data):
    if isinstance(data, list):
        return [normalize_to_camel_case(item) for item in data]
    
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            camel_key = snake_to_camel(key)
            if isinstance(value, (dict, list)):
                result[camel_key] = normalize_to_camel_case(value)
            else:
                result[camel_key] = value
        return result
    
    return data

# プレイリスト作成エンドポイント
@app.post("/api/playlists")
async def create_playlist(playlist, request):
    authorization = request.headers.get("Authorization")
    if not authorization:
        return JSONResponse(content={"error": "認証が必要です"}, status_code=401)
    
    if not use_supabase:
        return JSONResponse(content={"error": "Supabase not configured"}, status_code=500)
    
    try:
        # トークンからユーザーIDを取得
        token = authorization.split(' ')[1]
        user = supabase.auth.get_user(token)
        user_id = user.user.id
        
        # プレイリストをデータベースに保存
        playlist_data = {
            "title": playlist.title,
            "description": playlist.description,
            "user_id": user_id
        }
        
        result = supabase.table("playlists").insert(playlist_data).execute()
        
        if len(result.data) > 0:
            # 作成されたプレイリスト情報を正規化して返す
            return normalize_to_camel_case(result.data[0])
        else:
            return JSONResponse(content={"error": "プレイリストの作成に失敗しました"}, status_code=500)
    
    except Exception as e:
        print(f"Error creating playlist: {e}")
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

# プレイリストに曲を追加するエンドポイント
@app.post("/api/playlists/{playlist_id}/songs")
async def add_song_to_playlist(playlist_id, song, request):
    authorization = request.headers.get("Authorization")
    if not authorization:
        return JSONResponse(content={"error": "認証が必要です"}, status_code=401)
    
    try:
        # トークンからユーザーIDを取得
        token = authorization.split(' ')[1]
        user = supabase.auth.get_user(token)
        user_id = user.user.id
        
        # プレイリストのオーナーを確認
        playlist = supabase.table("playlists").select("*").eq("id", playlist_id).eq("user_id", user_id).execute()
        
        if len(playlist.data) == 0:
            return JSONResponse(content={"error": "プレイリストが見つからないか、アクセス権限がありません"}, status_code=404)
        
        # 曲情報にプレイリストIDとユーザーIDを追加
        song_data = {
            **song,
            "playlist_id": playlist_id,
            "user_id": user_id
        }
        
        # 曲をデータベースに保存
        result = supabase.table("playlist_songs").insert(song_data).execute()
        
        if len(result.data) > 0:
            return normalize_to_camel_case(result.data[0])
        else:
            return JSONResponse(content={"error": "曲の追加に失敗しました"}, status_code=500)
    
    except Exception as e:
        print(f"Error adding song to playlist: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

# ユーザーのプレイリスト一覧を取得するエンドポイント
@app.get("/api/playlists")
async def get_playlists(request):
    authorization = request.headers.get("Authorization")
    if not authorization:
        return JSONResponse(content={"error": "認証が必要です"}, status_code=401)
    
    try:
        # トークンからユーザーIDを取得
        token = authorization.split(' ')[1]
        user = supabase.auth.get_user(token)
        user_id = user.user.id
        
        # ユーザーのプレイリストを取得
        playlists = supabase.table("playlists").select("*").eq("user_id", user_id).execute()
        
        # 各プレイリストの曲数を取得
        result = []
        for playlist in playlists.data:
            songs_count = supabase.table("playlist_songs").select("*", count="exact").eq("playlist_id", playlist["id"]).execute()
            playlist["songs_count"] = songs_count.count
            result.append(playlist)
        
        return normalize_to_camel_case(result)
    
    except Exception as e:
        print(f"Error fetching playlists: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

# 特定のプレイリストの詳細を取得するエンドポイント
@app.get("/api/playlists/{playlist_id}")
async def get_playlist_detail(playlist_id, request):
    authorization = request.headers.get("Authorization")
    if not authorization:
        return JSONResponse(content={"error": "認証が必要です"}, status_code=401)
    
    try:
        # トークンからユーザーIDを取得
        token = authorization.split(' ')[1]
        user = supabase.auth.get_user(token)
        user_id = user.user.id
        
        # プレイリスト情報を取得
        playlist = supabase.table("playlists").select("*").eq("id", playlist_id).execute()
        
        if len(playlist.data) == 0:
            return JSONResponse(content={"error": "プレイリストが見つかりません"}, status_code=404)
        
        playlist_data = playlist.data[0]
        
        # プレイリストの曲を取得
        songs = supabase.table("playlist_songs").select("*").eq("playlist_id", playlist_id).execute()
        
        playlist_data["songs"] = songs.data
        
        return normalize_to_camel_case(playlist_data)
    
    except Exception as e:
        print(f"Error fetching playlist detail: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)