from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
from dotenv import load_dotenv
from supabase import create_client

app = FastAPI()

# CORSの設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 環境変数の読み込み
load_dotenv()

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

@app.get("/api/users")
async def get_users():
    """Supabaseからユーザー情報を取得して表示"""
    if not use_supabase:
        return JSONResponse(content={"error": "Supabase not configured"}, status_code=500)
    
    try:
        response = supabase.table('users').select('*').execute()
        return JSONResponse(content=response.data)
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)