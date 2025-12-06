# hackathon-20251213

# 実行手順

## 仮想環境の実装
python -m venv .venv
. .venv/bin/activate
pip install fastapi uvicorn

## main.py(fastAPI)の実行
uvicorn main:app --reload

## reactの設定
npx create-react-app my-react-app
cd my-react-app
npm install axios

# FastAPI
FastAPIの起動に必要なライブラリをインストール:
pip install fastapi uvicorn
webサーバーを起動:
uvicorn main:app --reload

## バイナリ
・@app.get("<path>") : GET
・@app.post("<path>") : POST
・@app.put("<path>") : PUT
・@app.delete("<path>") : DELETE

# react
reactのパッケージをインストール
npx create-react-app my-react-app
FastAPIとの連携用のライブラリをインストール
npm install axios