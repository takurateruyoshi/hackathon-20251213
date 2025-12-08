# 実行手順

## 仮想環境の実装
python -m venv .venv
. .venv/bin/activate
pip install fastapi uvicorn

## main.py(fastAPI)の実行
uvicorn main:app --reload
[Ctrl] + [Z]
bg

## reactの設定
npx create-react-app my-react-app
cd my-react-app
npm install axios
HTTPS=true npm start


# FastAPI

・FastAPIの起動に必要なライブラリをインストール:
pip install fastapi uvicorn
・webサーバーを起動:
uvicorn main:app --reload

## 基本操作
・操作中のFastAPIを閉じ一時停止
[Ctrl] + [Z]
・再開
bg
・開かれているFastAPIを確認する
lsof -i :8000 
・開かれているFastAPIを閉じる
kill -9 [PID]
`lsof -i :8000 | grep python | awk '{print "kill -9 " $2}'`

## 
@app.get("<path>") : GET
@app.post("<path>") : POST
@app.put("<path>") : PUT
@app.delete("<path>") : DELETE


# react

・reactのパッケージをインストール
npx create-react-app my-react-app
FastAPIとの連携用のライブラリをインストール
npm install axios

# DB
# 環境変数の読み込み
current_dir = Path(__file__).parent.absolute()
dotenv_path = current_dir / '.env'
load_dotenv(dotenv_path)
# 環境変数から Supabase の接続情報を取得
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
# Supabase クライアントの初期化
supabase = create_client(supabase_url, supabase_key)
print("Supabase client initialized successfully!")

# .envファイルを作成し下記を記入すればDBの接続ができる。
SUPABASE_URL=
SUPABASE_KEY=
# db.pyはSQLコードを共有するためのもの
