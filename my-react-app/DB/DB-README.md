YTMusic近距離共有アプリ データベース設計図（日本語版）
1. ユーザーテーブル (users)
id: UUID [主キー] - ユーザーの一意識別子
auth_id: TEXT [一意] - 認証システムのID
username: VARCHAR(255) [必須] - ユーザー名
display_name: VARCHAR(255) - 表示名
avatar_url: TEXT - プロフィール画像のURL
bio: TEXT - 自己紹介文
created_at: TIMESTAMP WITH TIME ZONE - アカウント作成日時
last_active_at: TIMESTAMP WITH TIME ZONE - 最終アクティブ日時
is_online: BOOLEAN - オンライン状態
is_broadcasting: BOOLEAN - 音楽配信中か
is_discoverable: BOOLEAN - 他のユーザーから発見可能か
ytmusic_connected: BOOLEAN - YTMusic連携済みか
ytmusic_token: JSONB - YTMusic APIのトークン情報

2. 現在の再生状態テーブル (current_playback)
id: UUID [主キー] - レコードの一意識別子
user_id: UUID [外部キー→users.id、一意] - ユーザーID
track_video_id: VARCHAR(20) [必須] - YouTube動画ID
track_title: VARCHAR(255) [必須] - 曲のタイトル
artist_name: VARCHAR(255) [必須] - アーティスト名
album_name: VARCHAR(255) - アルバム名
thumbnail_url: TEXT - サムネイル画像URL
duration_seconds: INTEGER - 曲の長さ（秒）
current_position_seconds: INTEGER - 現在の再生位置（秒）
is_playing: BOOLEAN - 再生中か一時停止中か
started_at: TIMESTAMP WITH TIME ZONE - 再生開始時間
last_updated: TIMESTAMP WITH TIME ZONE - 最終更新時間
youtube_url: TEXT - YouTube完全URL

3. 位置情報テーブル (user_locations)
id: UUID [主キー] - レコードの一意識別子
user_id: UUID [外部キー→users.id、一意] - ユーザーID
latitude: DOUBLE PRECISION - 緯度
longitude: DOUBLE PRECISION - 経度
location_name: VARCHAR(255) - 場所の名前（例：渋谷駅）
accuracy_meters: DOUBLE PRECISION - 位置精度（メートル）
last_updated: TIMESTAMP WITH TIME ZONE - 最終更新時間
is_sharing_location: BOOLEAN - 位置情報共有中か

4. 近くのリスナーテーブル (nearby_listeners)
id: UUID [主キー] - レコードの一意識別子
user_id: UUID [外部キー→users.id] - ユーザーID
nearby_user_id: UUID [外部キー→users.id] - 近くにいるユーザーID
distance_meters: DOUBLE PRECISION - 距離（メートル）
discovered_at: TIMESTAMP WITH TIME ZONE - 発見された時間
last_updated: TIMESTAMP WITH TIME ZONE - 最終更新時間
is_listening_together: BOOLEAN - 一緒に聴いているか
[user_id, nearby_user_id] [複合一意制約] - ユーザーペアの重複防止

5. リスニングセッションテーブル (listening_sessions)
id: UUID [主キー] - セッションの一意識別子
host_user_id: UUID [外部キー→users.id] - ホストユーザーID
session_name: VARCHAR(255) - セッション名
is_active: BOOLEAN - セッションがアクティブか
created_at: TIMESTAMP WITH TIME ZONE - 作成日時
ended_at: TIMESTAMP WITH TIME ZONE - 終了日時
max_distance_meters: INTEGER - 最大距離（メートル）
is_private: BOOLEAN - プライベートセッションか
current_track_video_id: VARCHAR(20) - 現在再生中の曲のID

6. セッション参加者テーブル (session_participants)
id: UUID [主キー] - レコードの一意識別子
session_id: UUID [外部キー→listening_sessions.id] - セッションID
user_id: UUID [外部キー→users.id] - ユーザーID
joined_at: TIMESTAMP WITH TIME ZONE - 参加日時
left_at: TIMESTAMP WITH TIME ZONE - 退出日時
is_active: BOOLEAN - アクティブな参加者か
is_synced: BOOLEAN - 音楽が同期されているか
[session_id, user_id] [複合一意制約] - セッション内の重複参加防止

7. YouTube Music再生履歴テーブル (ytmusic_history)
id: UUID [主キー] - レコードの一意識別子
user_id: UUID [外部キー→users.id] - ユーザーID
track_video_id: VARCHAR(20) [必須] - YouTube動画ID
track_title: VARCHAR(255) [必須] - 曲のタイトル
artist_name: VARCHAR(255) [必須] - アーティスト名
album_name: VARCHAR(255) - アルバム名
played_at: TIMESTAMP WITH TIME ZONE - 再生日時
session_id: UUID [外部キー→listening_sessions.id] - 再生されたセッションID
shared_from_user_id: UUID [外部キー→users.id] - 共有元ユーザーID
duration_seconds: INTEGER - 再生時間（秒）
was_listened_completely: BOOLEAN - 最後まで聴いたか

8. ユーザーの音楽趣味プロファイル (user_music_profiles)
id: UUID [主キー] - プロファイルの一意識別子
user_id: UUID [外部キー→users.id、一意] - ユーザーID
favorite_genres: JSONB - 好きな音楽ジャンルのリスト
favorite_artists: JSONB - 好きなアーティストのリスト
listening_pattern: JSONB - 聴取パターン（例：{"朝": 30, "夜": 60}）
mood_preferences: JSONB - 好みのムード（例：{"元気": 0.7, "リラックス": 0.3}）
last_updated: TIMESTAMP WITH TIME ZONE - 最終更新時間

9. ユーザー接続テーブル (user_connections)
id: UUID [主キー] - レコードの一意識別子
user_id: UUID [外部キー→users.id] - ユーザーID
connected_user_id: UUID [外部キー→users.id] - 接続先ユーザーID
connection_type: VARCHAR(50) [必須] - 接続タイプ（友達、お気に入り、ブロック等）
first_met_at: TIMESTAMP WITH TIME ZONE - 初めて出会った時間
times_listened_together: INTEGER - 一緒に聴いた回数
music_compatibility_score: FLOAT - 音楽の相性スコア
last_listened_together: TIMESTAMP WITH TIME ZONE - 最後に一緒に聴いた時間
[user_id, connected_user_id] [複合一意制約] - ユーザー接続の重複防止

10. トラックメッセージテーブル (track_messages)
id: UUID [主キー] - メッセージの一意識別子
sender_id: UUID [外部キー→users.id] - 送信者ID
session_id: UUID [外部キー→listening_sessions.id] - セッションID
track_video_id: VARCHAR(20) [必須] - メッセージが関連する曲のID
message_text: TEXT [必須] - メッセージ内容
sent_at: TIMESTAMP WITH TIME ZONE - 送信時間
position_seconds: INTEGER - 曲内の位置（秒）

11. プレイリストテーブル (playlists)
id: UUID [主キー] - プレイリストの一意識別子
user_id: UUID [外部キー→users.id] - 所有者ID
title: VARCHAR(255) [必須] - プレイリスト名
description: TEXT - プレイリストの説明
is_public: BOOLEAN - 公開プレイリストか
created_from_session: UUID [外部キー→listening_sessions.id] - 作成元セッション
created_at: TIMESTAMP WITH TIME ZONE - 作成日時
updated_at: TIMESTAMP WITH TIME ZONE - 更新日時

12. プレイリスト曲テーブル (playlist_tracks)
id: UUID [主キー] - レコードの一意識別子
playlist_id: UUID [外部キー→playlists.id] - プレイリストID
track_video_id: VARCHAR(20) [必須] - YouTube動画ID
track_title: VARCHAR(255) [必須] - 曲のタイトル
artist_name: VARCHAR(255) [必須] - アーティスト名
position: INTEGER [必須] - プレイリスト内の順序
added_at: TIMESTAMP WITH TIME ZONE - 追加日時
added_from_user_id: UUID [外部キー→users.id] - 追加したユーザーID

13. 通知テーブル (notifications)
id: UUID [主キー] - 通知の一意識別子
user_id: UUID [外部キー→users.id] - 通知先ユーザーID
type: VARCHAR(50) [必須] - 通知タイプ（近くのリスナー、セッション招待など）
message: TEXT [必須] - 通知メッセージ
related_user_id: UUID [外部キー→users.id] - 関連ユーザーID
related_session_id: UUID [外部キー→listening_sessions.id] - 関連セッションID
related_track_video_id: VARCHAR(20) - 関連曲ID
is_read: BOOLEAN - 既読状態
created_at: TIMESTAMP WITH TIME ZONE - 作成日時
14. ユーザー設定テーブル (user_settings)

id: UUID [主キー] - 設定の一意識別子
user_id: UUID [外部キー→users.id、一意] - ユーザーID
discovery_radius_meters: INTEGER - 発見半径（メートル）
auto_join_sessions: BOOLEAN - セッションに自動参加するか
share_listening_history: BOOLEAN - 再生履歴を共有するか
show_current_track: BOOLEAN - 現在の再生曲を表示するか
allow_messages_from: VARCHAR(20) - メッセージ許可（全員、接続のみ、なし）
notification_preferences: JSONB - 通知設定

15. YTMusicデータキャッシュテーブル (ytmusic_data_cache)
id: UUID [主キー] - キャッシュの一意識別子
track_video_id: VARCHAR(20) [必須、一意] - YouTube動画ID
track_data: JSONB [必須] - 曲の詳細情報
last_updated: TIMESTAMP WITH TIME ZONE - 最終更新時間
expiry: TIMESTAMP WITH TIME ZONE - 有効期限

16.共有曲テーブル (shared_songs)
id: UUID [主キー, DEFAULT uuid_generate_v4()] - 共有曲の一意識別子
title: VARCHAR(255) [必須] - 曲のタイトル
artist: VARCHAR(255) [必須] - アーティスト名
shared_by_user_id: UUID [外部キー→users.id] - 共有したユーザーID
distance: VARCHAR(50) [DEFAULT '0m'] - 共有者からの距離
video_id: VARCHAR(50) - YouTube/動画ID
lat: DOUBLE PRECISION - 共有位置の緯度
lng: DOUBLE PRECISION - 共有位置の経度
created_at: TIMESTAMP WITH TIME ZONE [DEFAULT NOW()] - 共有日時
UNIQUE(shared_by_user_id) - 各ユーザーは1曲のみ共有可能
is_playing: BOOLEAN [DEFAULT TRUE] - 再生中かどうかのフラグ