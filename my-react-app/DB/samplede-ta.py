import os
from dotenv import load_dotenv
from supabase import create_client
from pathlib import Path
import time
from datetime import datetime, timedelta

# 環境変数の読み込み
current_dir = Path(__file__).parent.absolute()
dotenv_path = current_dir / '.env'
load_dotenv(dotenv_path)

supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

print(f"URL: {supabase_url}")
print(f"Key exists: {supabase_key is not None}")

if not supabase_url or not supabase_key:
    raise ValueError("環境変数が正しく設定されていません")

# Supabase クライアントの初期化
supabase = create_client(supabase_url, supabase_key)
print("Supabase client initialized successfully!")

# --------------------------------
# テストユーザー「仮 太郎」のデータを作成
# --------------------------------

# シンプルにパスワードを設定
password = "test_password123"

try:
    # 挿入するユーザーデータ（パスワードは平文）
    user_data = {
        "username": "kari_taro",
        "display_name": "仮 太郎",
        "bio": "これは仮太郎のプロフィールです。",
        "password": password,  # 平文のパスワードをそのまま保存
        "is_online": False,
        "is_broadcasting": False,
        "is_discoverable": True,
        # 注: idはPostgresのuuid_generate_v4()がデフォルトで生成します
    }
    
    # Supabaseにデータを挿入
    response = supabase.table('users').insert(user_data).execute()
    
    # レスポンスの確認
    data = response.data
    if data and len(data) > 0:
        print("\nユーザー「仮 太郎」が正常に追加されました。")
        print(f"ユーザーID: {data[0]['id'] if 'id' in data[0] else '不明'}")
        print(f"ユーザー名: kari_taro")
        print(f"パスワード: {password}")
    else:
        print("\nユーザー追加に失敗しました。")
        print(f"エラー: {response.error}")
    
except Exception as e:
    print(f"\nエラーが発生しました: {e}")