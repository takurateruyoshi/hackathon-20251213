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


# FastAPIの操作方法

* FastAPIの起動に必要なライブラリをインストール:
    * pip install fastapi uvicorn
* webサーバーを起動:
    * uvicorn main:app --reload
* 操作中のFastAPIを閉じ一時停止
    * [Ctrl] + [Z]
* 再開
    * bg
* 開かれているFastAPIを確認する
    * lsof -i :8000 
* 開かれているFastAPIを閉じる
    * kill -9 [PID]
    * `lsof -i :8000 | grep python | awk '{print "kill -9 " $2}'`

## バイナリ　　API操作について
* バイナリ操作
    * @app.get("<path>") : GET
    * @app.post("<path>") : POST
    * @app.put("<path>") : PUT
    * @app.delete("<path>") : DELETE


# reactの操作方法

* reactのパッケージをインストール
    * npx create-react-app my-react-app
* FastAPIとの連携用のライブラリをインストール
    * npm install axios
* http通信の有効化*今回は使わないcd
    * npm start
* SSL通信(https通信)の有効化と実行
    * HTTPS=true npm start

# ngrokの操作方法

https://dashboard.ngrok.com
* ngrokをHomeberwにインストール
    * brew install ngrok
* ngrokを構成ファイルに追加
    * これは実行する人固有のコードなので自分でアカウント登録する必要がある
    * ngrok config add-authtoken 36XbM4tZwMC6QZY9dJI16FJ0wJa_6622KACDFELoAqhiRH8vW
* ngrokを実行
    * 実行するとターミナルがngrokの画面になるので左のボタンからターミナルを開き他の操作を実行する必要がある
    * ngrok http 8000
* 起動時に必要な操作
    * 毎回新しいリンクが生成されるのでmain.pyのCORS設定(アクセスを許可するリンク)に追加する。

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

# 追加ライブラリ
pip install ytmusicapi

npm install react-youtube react-icons react-leaflet leaflet
