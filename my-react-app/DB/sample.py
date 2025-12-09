from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
import os
from dotenv import load_dotenv
from typing import List, Optional
from pydantic import BaseModel

# 環境変数の読み込み
load_dotenv()

# Supabaseの接続情報
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

# Supabaseクライアントの作成
supabase = create_client(supabase_url, supabase_key)

# Pydanticモデル定義
class User(BaseModel):
    id: str
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    is_online: bool = False
    is_discoverable: bool = True
    ytmusic_connected: bool = False

app = FastAPI()

# CORS設定
origins = [
    "http://localhost:3000",
    "https://localhost:3001",
    "https://192.168.86.21:3001",  
    "http://192.168.86.21:3001",  
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 基本的なAPIエンドポイント
@app.get("/api/data")
async def get_data():
    """ReactフロントエンドにJSONデータを提供するエンドポイント。"""
    return {"message": "Hello from FastAPI Backend!"}

# Supabaseからユーザー一覧を取得するエンドポイント
@app.get("/api/users", response_model=List[User])
async def get_users():
    """全ユーザーのリストを返す"""
    try:
        response = supabase.table('users').select('*').execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ユーザーデータの取得中にエラー発生: {str(e)}")

# 特定のユーザーを取得するエンドポイント
@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    """指定されたIDのユーザー情報を返す"""
    try:
        response = supabase.table('users').select('*').eq('id', user_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail=f"ID {user_id} のユーザーが見つかりません")
        return response.data[0]
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"ユーザーデータの取得中にエラー発生: {str(e)}")

# オンラインユーザーを取得するエンドポイント
@app.get("/api/users/online", response_model=List[User])
async def get_online_users():
    """現在オンラインのユーザーのリストを返す"""
    try:
        response = supabase.table('users').select('*').eq('is_online', True).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"オンラインユーザーデータの取得中にエラー発生: {str(e)}")

# 新しいユーザーを作成するエンドポイント
@app.post("/api/users", response_model=User)
async def create_user(user: User):
    """新しいユーザーを作成する"""
    try:
        response = supabase.table('users').insert(user.dict()).execute()
        if not response.data:
            raise HTTPException(status_code=400, detail="ユーザーの作成に失敗しました")
        return response.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ユーザー作成中にエラー発生: {str(e)}")

# サーバー起動コード
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)