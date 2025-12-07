import os
from dotenv import load_dotenv
from supabase import create_client
from pathlib import Path

# 現在のスクリプトのディレクトリを取得
current_dir = Path(__file__).parent.absolute()

# .env ファイルのパスを指定
dotenv_path = current_dir / '.env'

# .env ファイルを読み込む
load_dotenv(dotenv_path)

# 環境変数から Supabase の接続情報を取得
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

# デバッグ出力
print(f"ENV Path: {dotenv_path}")
print(f"ENV file exists: {dotenv_path.exists()}")
print(f"URL: {supabase_url}")
print(f"Key: {supabase_key}")

# キーが存在することを確認
if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL または SUPABASE_KEY が設定されていません")

# Supabase クライアントの初期化
supabase = create_client(supabase_url, supabase_key)
print("Supabase client initialized successfully!")