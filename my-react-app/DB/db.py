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

# テーブル作成用のSQLを出力
def create_ytmusic_proximity_tables():
    sql_statements = [
        """
        CREATE TABLE users (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            auth_id TEXT UNIQUE,
            username VARCHAR(255) NOT NULL,
            display_name VARCHAR(255),
            avatar_url TEXT,
            bio TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_online BOOLEAN DEFAULT FALSE,
            is_broadcasting BOOLEAN DEFAULT FALSE,
            is_discoverable BOOLEAN DEFAULT TRUE,
            ytmusic_connected BOOLEAN DEFAULT FALSE,
            ytmusic_token JSONB
        );
        """,
        """
        CREATE TABLE current_playback (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            track_video_id VARCHAR(20) NOT NULL,
            track_title VARCHAR(255) NOT NULL,
            artist_name VARCHAR(255) NOT NULL,
            album_name VARCHAR(255),
            thumbnail_url TEXT,
            duration_seconds INTEGER,
            current_position_seconds INTEGER,
            is_playing BOOLEAN DEFAULT TRUE,
            started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            youtube_url TEXT
        );
        """,
        """
        CREATE TABLE user_locations (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            location_name VARCHAR(255),
            accuracy_meters DOUBLE PRECISION,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_sharing_location BOOLEAN DEFAULT FALSE
        );
        """,
        """
        CREATE TABLE nearby_listeners (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            nearby_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            distance_meters DOUBLE PRECISION,
            discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_listening_together BOOLEAN DEFAULT FALSE,
            UNIQUE(user_id, nearby_user_id)
        );
        """,
        """
        CREATE TABLE listening_sessions (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            host_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            session_name VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ended_at TIMESTAMP WITH TIME ZONE,
            max_distance_meters INTEGER DEFAULT 100,
            is_private BOOLEAN DEFAULT FALSE,
            current_track_video_id VARCHAR(20)
        );
        """,
        """
        CREATE TABLE session_participants (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            session_id UUID REFERENCES listening_sessions(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            left_at TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            is_synced BOOLEAN DEFAULT TRUE,
            UNIQUE(session_id, user_id)
        );
        """,
        """
        CREATE TABLE ytmusic_history (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            track_video_id VARCHAR(20) NOT NULL,
            track_title VARCHAR(255) NOT NULL,
            artist_name VARCHAR(255) NOT NULL,
            album_name VARCHAR(255),
            played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            session_id UUID REFERENCES listening_sessions(id) ON DELETE SET NULL,
            shared_from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            duration_seconds INTEGER,
            was_listened_completely BOOLEAN DEFAULT FALSE
        );
        """,
        """
        CREATE TABLE user_music_profiles (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            favorite_genres JSONB DEFAULT '[]',
            favorite_artists JSONB DEFAULT '[]',
            listening_pattern JSONB DEFAULT '{}',
            mood_preferences JSONB DEFAULT '{}',
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        """
        CREATE TABLE user_connections (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            connected_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            connection_type VARCHAR(50) NOT NULL,
            first_met_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            times_listened_together INTEGER DEFAULT 1,
            music_compatibility_score FLOAT DEFAULT 0.0,
            last_listened_together TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(user_id, connected_user_id)
        );
        """,
        """
        CREATE TABLE track_messages (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
            session_id UUID REFERENCES listening_sessions(id) ON DELETE CASCADE,
            track_video_id VARCHAR(20) NOT NULL,
            message_text TEXT NOT NULL,
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            position_seconds INTEGER
        );
        """,
        """
        CREATE TABLE playlists (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            is_public BOOLEAN DEFAULT false,
            created_from_session UUID REFERENCES listening_sessions(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        """
        CREATE TABLE playlist_tracks (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
            track_video_id VARCHAR(20) NOT NULL,
            track_title VARCHAR(255) NOT NULL,
            artist_name VARCHAR(255) NOT NULL,
            position INTEGER NOT NULL,
            added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            added_from_user_id UUID REFERENCES users(id) ON DELETE SET NULL
        );
        """,
        """
        CREATE TABLE notifications (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(50) NOT NULL,
            message TEXT NOT NULL,
            related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
            related_session_id UUID REFERENCES listening_sessions(id) ON DELETE SET NULL,
            related_track_video_id VARCHAR(20),
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """,
        """
        CREATE TABLE user_settings (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
            discovery_radius_meters INTEGER DEFAULT 100,
            auto_join_sessions BOOLEAN DEFAULT FALSE,
            share_listening_history BOOLEAN DEFAULT TRUE,
            show_current_track BOOLEAN DEFAULT TRUE,
            allow_messages_from VARCHAR(20) DEFAULT 'connections',
            notification_preferences JSONB DEFAULT '{"nearby_listeners": true, "session_invites": true, "messages": true}'
        );
        """,
        """
        CREATE TABLE ytmusic_data_cache (
            id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
            track_video_id VARCHAR(20) UNIQUE NOT NULL,
            track_data JSONB NOT NULL,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expiry TIMESTAMP WITH TIME ZONE
        );
        """
    ]
    
    print("以下のSQLをSupabaseのSQLエディタで実行してデータベースを作成してください：")
    
    for i, sql in enumerate(sql_statements, 1):
        print(f"\n-- テーブル {i} --")
        print(sql)

if __name__ == "__main__":
    print("\n=== YTMusic 近距離共有アプリ データベース設計 ===\n")
    create_ytmusic_proximity_tables()
    print("\n=== SQLの出力完了 ===")