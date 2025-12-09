from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse # ✅ これをインポート
from typing import List, Dict

app = FastAPI()

# 💡 DUMMY_SONGSの定義は省略しませんが、今回は割愛します

DUMMY_SONGS: List[Dict] = [
    { "id": 1, "title": "Pretender", "artist": "Official髭男dism", "sharedBy": "Taro", "distance": "10m" },
    { "id": 2, "title": "アイドル", "artist": "YOASOBI", "sharedBy": "Hanako", "distance": "50m" },
    { "id": 3, "title": "怪獣の花唄", "artist": "Vaundy", "sharedBy": "Jiro", "distance": "120m" },
]


# --- CORS設定 ---
# ⚠️ ngrokのURLが最新であることを確認してください
origins = [
    "http://localhost:3000",
    "https://localhost:3001",   
    "http://localhost:3001", 
    "https://192.168.86.21:3001",
    "https://unapperceived-coolly-darian.ngrok-free.dev"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ エンドポイント: /api/songs
@app.get("/api/songs")
async def get_songs():
    """FastAPIでレスポンスの形式をJSONに強制します。"""
    # 💡 PythonのリストをJSONResponseオブジェクトでラップして返します。
    #    これにより、Content-Type: application/json が保証されます。
    return JSONResponse(content=DUMMY_SONGS) 

@app.get("/")
async def get_songs():
    """FastAPIでレスポンスの形式をJSONに強制します。"""
    # 💡 PythonのリストをJSONResponseオブジェクトでラップして返します。
    #    これにより、Content-Type: application/json が保証されます。
    return "Hello World"



# 起動コード (Hostヘッダー無視のオプションを有効のままにしておきます)
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, proxy_headers=False) # ✅ proxy_headers=Falseを継続