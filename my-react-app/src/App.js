import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import YouTube from 'react-youtube';
// Font Awesomeのアイコンをまとめてインポート
import { 
  FaPlay, FaPause, FaChevronDown, FaList, FaHome, FaSearch, FaPlus, 
  FaMapMarkerAlt, FaTimes, FaUserFriends, FaArrowLeft, FaEllipsisV, 
  FaRedo, FaUndo, FaUserCircle, FaHeart, FaRegHeart, FaCommentDots, 
  FaPaperPlane, FaSignInAlt, FaMusic, FaCheckDouble 
} from 'react-icons/fa';
// Leaflet for ReactのコンポーネントとCSSをインポート
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leafletマーカーアイコンのデフォルト設定
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

import './App.css';

/**
 * 秒数を「m:ss」形式の文字列にフォーマットするヘルパー関数
 * @param {number} seconds - 秒数
 * @returns {string} フォーマットされた時間文字列
 */
const formatTime = (seconds) => {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

/**
 * マップの中心座標を更新するためのカスタムコンポーネント (useMapフックを使用)
 * @param {object} props - { center: [lat, lng] }
 */
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    // centerが変更されたら、マップを新しい座標に移動 (flyToアニメーション)
    if (center) map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

/**
 * 2つの地理座標間の距離（メートル）を概算する関数
 * @param {number} lat1 - 1点目の緯度
 * @param {number} lng1 - 1点目の経度
 * @param {number} lat2 - 2点目の緯度
 * @param {number} lng2 - 2点目の経度
 * @returns {number} 距離 (メートル、四捨五入)
 */
function getDistance(lat1, lng1, lat2, lng2) {
  if(!lat1 || !lng1 || !lat2 || !lng2) return 0;
  // 経度の差を緯度の中間で補正 (簡易なHaversine/Equirectangular近似)
  const x = (lng2 - lng1) * Math.cos((lat1 + lat2) / 2 * (Math.PI / 180)); 
  const y = (lat2 - lat1);
  // 緯度・経度1度あたりの距離(約111km=111000m)を掛けて距離を算出
  return Math.round(Math.sqrt(x*x + y*y) * 111000);
}

// =========================================================================
// メインアプリケーションコンポーネント
// =========================================================================

function App() {
  // 認証・ユーザー情報関連のState
  const [isLoggedIn, setIsLoggedIn] = useState(false); // ログイン状態
  const [myUsername, setMyUsername] = useState(""); // ログイン中のユーザー名
  const [tempUsername, setTempUsername] = useState(""); // ログインフォームの入力値

  // UI・ナビゲーション関連のState
  const [activeTab, setActiveTab] = useState('home'); // 現在表示中のタブ
  const [popularSongs, setPopularSongs] = useState([]); // ホームタブで表示する人気曲リスト
  const [searchResults, setSearchResults] = useState([]); // 検索結果
  const [searchQuery, setSearchQuery] = useState(""); // 検索フォームの入力値
  const [isSearching, setIsSearching] = useState(false); // 検索中かどうか
  const [nearbySongs, setNearbySongs] = useState([]); // 近くのユーザーが共有している曲（Nearbyタブ）
  const [myPlaylists, setMyPlaylists] = useState([{ id: 1, name: 'お気に入り', songs: [] }]); // ユーザーのプレイリスト
  
  // ユーザープロフィール・チャット関連のState
  const [viewingUser, setViewingUser] = useState(null); // 表示中のプロフィール情報
  const [favoriteUsers, setFavoriteUsers] = useState([]); // お気に入り（フォロー）中のユーザー名リスト
  const [activeChat, setActiveChat] = useState(null); // 開いているチャット相手のユーザー名
  const [chatHistory, setChatHistory] = useState({}); // チャット履歴 ({ username: [messages...] })
  const [chatInput, setChatInput] = useState(""); // チャット入力フォームの値
  const chatEndRef = useRef(null); // チャットの最下部にスクロールするためのRef

  // ライブラリ・プレイリスト関連のState
  const [viewingPlaylist, setViewingPlaylist] = useState(null); // 詳細表示中のプレイリスト

  // モーダル・ポップアップ関連のState
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false); // プレイリスト追加モーダルの表示状態
  const [songToAdd, setSongToAdd] = useState(null); // プレイリストに追加する曲データ

  // 音楽プレイヤー関連のState
  const [currentSong, setCurrentSong] = useState(null); // 現在再生中の曲データ
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false); // プレイヤーの展開状態 (ミニ/フル)
  const [isPlaying, setIsPlaying] = useState(false); // 再生状態
  const [playerObj, setPlayerObj] = useState(null); // YouTube Player APIオブジェクト
  const [currentTime, setCurrentTime] = useState(0); // 現在の再生時間 (秒)
  const [duration, setDuration] = useState(0); // 曲の総再生時間 (秒)

  // 位置情報関連のState
  const [myLocation, setMyLocation] = useState([35.681236, 139.767125]); // ユーザーの現在地 (デフォルトは東京駅付近)
  const [locationLoaded, setLocationLoaded] = useState(false); // 位置情報取得完了フラグ

  // =========================================================================
  // useEffect - 初期ロード & 位置情報取得
  // =========================================================================
  useEffect(() => {
    // 1. 位置情報取得
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { 
          setMyLocation([pos.coords.latitude, pos.coords.longitude]); 
          setLocationLoaded(true); 
        },
        () => setLocationLoaded(true) // 失敗してもロード完了とする
      );
    } else { 
      setLocationLoaded(true); // Geolocation非対応の場合もロード完了とする
    }

    // 2. 人気曲リストの取得
    axios.get('http://127.0.0.1:8000/api/charts')
      .then(res => setPopularSongs(res.data))
      .catch(() => setPopularSongs([]));
  }, []);

  // =========================================================================
  // useEffect - 近くの曲の定期的な取得
  // =========================================================================
  useEffect(() => {
    if (!locationLoaded || !isLoggedIn) return; // 位置情報ロード前、または未ログイン時はスキップ

    const fetchNearby = () => {
      axios.get('http://127.0.0.1:8000/api/songs')
        .then(res => {
            // サーバーから取得した曲データに、位置情報がない場合、自分の位置周辺にランダムで割り当てる
            const songsAroundMe = res.data.map((song) => {
              if (song.lat && song.lng) return song;
              const latOffset = (Math.random() - 0.5) * 0.005; // ランダムなオフセット
              const lngOffset = (Math.random() - 0.5) * 0.005;
              return { ...song, lat: myLocation[0] + latOffset, lng: myLocation[1] + lngOffset };
            });
            setNearbySongs(songsAroundMe);
        }).catch(console.error);
    };

    fetchNearby(); // 初回実行
    const interval = setInterval(fetchNearby, 5000); // 5秒ごとに定期実行
    return () => clearInterval(interval); // クリーンアップ関数でインターバルを解除
  }, [locationLoaded, myLocation, isLoggedIn]);

  // =========================================================================
  // useEffect - プレイヤーの再生時間更新
  // =========================================================================
  useEffect(() => {
    if (!playerObj || !isPlaying) return; // プレイヤーオブジェクトがない、または再生中でない場合はスキップ
    const timeInterval = setInterval(() => {
      // 現在の再生時間を取得し、Stateを更新
      setCurrentTime(playerObj.getCurrentTime());
      // 総再生時間がまだ取得できていない場合は取得
      if (duration === 0) setDuration(playerObj.getDuration());
    }, 1000);
    return () => clearInterval(timeInterval); // クリーンアップ関数でインターバルを解除
  }, [playerObj, isPlaying, duration]);

  // =========================================================================
  // useEffect - チャットの自動スクロール
  // =========================================================================
  useEffect(() => { 
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [chatHistory, activeChat]);

  // =========================================================================
  // イベントハンドラー
  // =========================================================================

  /**
   * ログイン処理
   */
  const handleLogin = (e) => {
    e.preventDefault();
    if (tempUsername.trim() === "") return alert("名前を入力してください");
    setMyUsername(tempUsername);
    setIsLoggedIn(true);
  };

  /**
   * ホームタブに戻る処理（検索状態をリセット）
   */
  const resetHome = () => { 
      setActiveTab('home'); 
      setIsSearching(false); 
      setSearchQuery(""); 
      setSearchResults([]);
      setViewingPlaylist(null);
  };

  /**
   * 検索実行処理（Enterキー押下時）
   */
  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== "") {
      setIsSearching(true); setSearchResults([]);
      axios.get(`http://127.0.0.1:8000/api/search?q=${searchQuery}`)
        .then(res => setSearchResults(res.data))
        .catch(() => alert("検索失敗"));
    }
  };

  /**
   * ユーザープロフィールモーダルを開く
   */
  const openUserProfile = (e, song) => {
    e.stopPropagation(); // 親要素のクリックイベント（曲再生）を停止
    setViewingUser({
        name: song.sharedBy || 'Unknown',
        currentSong: song.title,
        artist: song.artist,
        image: song.image,
        // ユーザーと自分の距離を計算して表示
        dist: getDistance(myLocation[0], myLocation[1], song.lat, song.lng)
    });
  };

  /**
   * ユーザーのフォロー/アンフォローを切り替える
   */
  const toggleFavorite = () => {
    if (!viewingUser) return;
    const name = viewingUser.name;
    if (favoriteUsers.includes(name)) {
        setFavoriteUsers(prev => prev.filter(u => u !== name));
    } else {
        setFavoriteUsers(prev => [...prev, name]);
        // フォロー時にチャット履歴を初期化（まだ存在しない場合）
        setChatHistory(prev => {
            if (prev[name]) return prev;
            return { ...prev, [name]: [] };
        });
    }
  };

  /**
   * プロフィール画面からチャットを開始する
   */
  const startChatFromProfile = () => {
    setActiveChat(viewingUser.name); // チャット画面に切り替え
    setViewingUser(null); // プロフィールを閉じる
    // チャット履歴がなければ初期化
    if (!chatHistory[viewingUser.name]) setChatHistory(prev => ({ ...prev, [viewingUser.name]: [] }));
  };

  /**
   * メッセージリストからチャットを開始する
   */
  const openChatFromList = (name) => {
    setActiveChat(name);
  };

  /**
   * チャットメッセージの送信処理
   */
  const sendMessage = () => {
    if (chatInput.trim() === "") return;
    const user = activeChat;
    const text = chatInput;
    // 自分のメッセージを作成
    const newMessage = { sender: 'me', text: text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    
    // 履歴に追加
    setChatHistory(prev => ({ ...prev, [user]: [...(prev[user] || []), newMessage] }));
    setChatInput(""); // 入力欄をクリア

    // 相手からの自動返信をシミュレート
    setTimeout(() => {
        let replyText = "いいね！👍";
        if (text.includes("こんにちは")) replyText = "こんにちは！趣味合いますね🎵";
        else if (text.includes("好き")) replyText = "私もその曲大好きです！";
        const replyMessage = { sender: user, text: replyText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        setChatHistory(prev => ({ ...prev, [user]: [...(prev[user] || []), replyMessage] }));
    }, 1500);
  };

  /**
   * 曲の再生を開始する
   * @param {object} songData - 曲情報
   * @param {boolean} autoExpand - 再生時にフルプレイヤーを自動展開するか
   */
  const playSong = (songData, autoExpand = true) => {
    let videoId = songData.videoId || songData.id;
    if (!videoId) return alert("再生不可");
    // 再生曲データを整形
    const song = { id: videoId, title: songData.title, artist: songData.artist, image: songData.image || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` };
    
    // プレイヤーStateを更新
    setCurrentSong(song); 
    setIsPlayerExpanded(autoExpand); 
    setIsPlaying(true); 
    setCurrentTime(0); 
    setDuration(0);

    // ログイン済みで、まだ共有されていない曲であれば、Nearby APIに共有リクエストを送信
    const isAlreadyShared = nearbySongs.some(s => s.title === song.title);
    if (!isAlreadyShared && isLoggedIn) {
      axios.post('http://127.0.0.1:8000/api/songs', { title: song.title, artist: song.artist, sharedBy: myUsername, distance: '0m', videoId: song.id }).catch(console.error);
    }
  };

  /**
   * YouTubeプレイヤーの状態変更イベントハンドラ
   */
  const handlePlayerStateChange = (e) => setIsPlaying(e.data === 1); // 状態1 (再生中) のときのみ再生中フラグを立てる

  /**
   * シークバーの操作イベントハンドラ
   */
  const handleSeek = (e) => { 
    const t = parseFloat(e.target.value); 
    setCurrentTime(t); 
    playerObj?.seekTo(t); // YouTubeプレイヤーをシーク
  };

  /**
   * 再生時間を早送り/巻き戻しする
   */
  const skipTime = (s) => { 
    if(playerObj){ 
      const t=playerObj.getCurrentTime()+s; 
      playerObj.seekTo(t); 
      setCurrentTime(t); 
    }
  };

  /**
   * プレイリスト追加モーダルを開く
   */
  const openAddToPlaylist = (e, song) => {
    e.stopPropagation(); // 親要素のクリックイベント（曲再生）を停止
    const videoId = song.videoId || song.id;
    // 曲データを整形
    const cleanSong = { id: videoId, videoId, title: song.title, artist: song.artist, image: song.image || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` };
    setSongToAdd(cleanSong); 
    setShowAddToPlaylistModal(true);
  };

  /**
   * 選択されたプレイリストに曲を追加し、モーダルを閉じる
   */
  const executeAddToPlaylist = (playlistId) => {
    setMyPlaylists(prev => prev.map(pl => {
        if (pl.id === playlistId) {
            // 既に曲があれば追加しない
            if (pl.songs.some(s => s.id === songToAdd.id)) return pl;
            return { ...pl, songs: [...pl.songs, songToAdd] };
        } return pl;
    }));
    setShowAddToPlaylistModal(false); 
    alert("追加しました！");
  };

  // =========================================================================
  // 描画 (Render)
  // =========================================================================

  // ログイン画面の描画
  if (!isLoggedIn) {
    return (
      <div className="login-screen-rich">
        <div className="login-content-rich">
          <div className="login-logo-circle">📡</div>
          <h1>Music Radar</h1>
          <form onSubmit={handleLogin} style={{width: '100%', marginTop: '40px'}}>
            <label style={{display:'block', color:'#888', marginBottom:'10px', fontSize:'14px'}}>ユーザー名</label>
            <input 
              type="text" 
              placeholder="名前を入力" 
              value={tempUsername}
              onChange={(e) => setTempUsername(e.target.value)}
              className="rich-input-big"
              autoFocus
            />
            <button type="submit" className="rich-btn-big">
              ログイン <FaSignInAlt />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // メイン画面の描画
  return (
    <div className="App">
      {/* メインコンテンツエリア。ミニプレイヤー表示時は下部にパディングを設ける */}
      <div className={`main-content ${currentSong ? 'has-mini-player' : ''}`}>
        
        {/* ヘッダー */}
        <header className="app-header" onClick={resetHome} style={{cursor:'pointer'}}>
          <h1>Music Radar 📡</h1>
        </header>

        {/* タブメニュー（ナビゲーション） */}
        <div className="tab-menu">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={resetHome}>ホーム</button>
          <button className={activeTab === 'nearby' ? 'active' : ''} onClick={() => setActiveTab('nearby')}>近くの人</button>
          <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>メッセージ</button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>ライブラリ</button>
        </div>

        {/* =========================================================================
        ホームタブ (Home)
        ========================================================================= */}
        {activeTab === 'home' && (
          <div className="song-list">
            {/* 検索バー */}
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '15px', top: '12px', color: '#888' }} />
              <input type="text" placeholder="曲名、アーティスト名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearch} style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '25px', border: 'none', background: '#333', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
              {isSearching && <FaTimes style={{ position: 'absolute', right: '15px', top: '12px', color: '#888', cursor: 'pointer' }} onClick={() => { setIsSearching(false); setSearchQuery(""); setSearchResults([]); }} />}
            </div>
            {/* 曲リスト (検索結果 or 人気曲) */}
            {(isSearching ? searchResults : popularSongs).map((song, index) => (
              <div key={index} className="song-item" onClick={() => playSong(song, true)}>
                {!isSearching && <span className="rank-number">{index + 1}</span>}
                <img src={song.image} alt="art" className="song-thumb" />
                <div className="song-info"><div className="song-title">{song.title}</div><div className="song-artist">{song.artist}</div></div>
                {/* プレイリスト追加ボタン */}
                <button className="add-btn" onClick={(e) => openAddToPlaylist(e, song)}><FaPlus /></button>
              </div>
            ))}
          </div>
        )}

        {/* =========================================================================
        近くの人タブ (Nearby)
        ========================================================================= */}
        {activeTab === 'nearby' && (
          <div className="nearby-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Leaflet マップ表示エリア */}
            <div style={{ height: '40vh', margin: '15px', borderRadius: '25px', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', position: 'relative' }}>
              <MapContainer center={myLocation} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater center={myLocation} />
                {/* 自分の位置マーカー */}
                <Marker position={myLocation}><Popup>あなた ({myUsername})</Popup></Marker>
                {/* 近くのユーザーのマーカー */}
                {nearbySongs.map((song, index) => (
                  <Marker key={index} position={[song.lat, song.lng]}>
                    <Popup>
                      <div style={{textAlign:'center'}}>
                        {/* ユーザー名クリックでプロフィール表示 */}
                        <b onClick={(e)=>openUserProfile(e, song)} style={{color:'#007bff', cursor:'pointer', textDecoration:'underline'}}>{song.sharedBy}</b><br/>
                        <span style={{fontSize:'12px'}}>{song.title}</span><br/>
                        {/* 再生ボタン */}
                        <button onClick={() => playSong(song, false)} style={{ marginTop: '5px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>再生</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            {/* 近くのユーザーリスト */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: '#888' }}>近くのユーザー ({nearbySongs.length}人)</h3>
              {nearbySongs.map((song, index) => {
                 const dist = getDistance(myLocation[0], myLocation[1], song.lat, song.lng);
                 const vId = song.videoId || song.id;
                 return (
                  <div key={index} className="song-item" onClick={() => playSong(song, false)} style={{ background: '#222', padding: '10px', borderRadius: '12px', marginBottom: '10px', display:'flex', alignItems:'center' }}>
                    {/* ユーザーアバターと距離 */}
                    <div onClick={(e) => openUserProfile(e, song)} style={{marginRight:'12px', textAlign:'center', cursor:'pointer', minWidth:'50px'}}>
                        {/* お気に入りユーザーにはリングを付ける */}
                        <div className={`avatar-ring ${favoriteUsers.includes(song.sharedBy) ? 'fav' : ''}`}>
                            <FaUserCircle style={{fontSize:'36px', color: '#ddd'}} />
                        </div>
                        <div style={{fontSize:'9px', color:'#aaa', marginTop:'2px'}}>{dist}m</div>
                    </div>
                    {/* 再生中の曲情報 */}
                    <img src={song.image || `https://img.youtube.com/vi/${vId}/mqdefault.jpg`} alt="art" className="song-thumb" style={{ width: '40px', height: '40px', borderRadius: '8px' }} />
                    <div className="song-info" style={{flex:1}}>
                      <div className="song-title" style={{ fontSize: '14px' }}>{song.title}</div>
                      <div className="song-artist" style={{ fontSize: '12px', color: '#aaa' }}>{song.artist}</div>
                    </div>
                    <button className="add-btn" onClick={(e) => openAddToPlaylist(e, song)}><FaPlus /></button>
                  </div>
                 );
              })}
            </div>
          </div>
        )}

        {/* =========================================================================
        メッセージタブ (Messages)
        ========================================================================= */}
        {activeTab === 'messages' && (
            <div className="messages-view" style={{padding:'20px'}}>
                <h2>💬 メッセージ</h2>
                {Object.keys(chatHistory).length === 0 ? (
                    // メッセージがない場合の表示
                    <div style={{textAlign:'center', marginTop:'80px', color:'#666'}}>
                        <FaUserFriends style={{fontSize:'50px', marginBottom:'10px'}}/>
                        <p>まだメッセージはありません。<br/>気になった人をフォローしてみましょう！</p>
                    </div>
                ) : (
                    // チャットリスト
                    Object.keys(chatHistory).map((user) => (
                        <div key={user} className="song-item" onClick={() => openChatFromList(user)} style={{padding:'15px', cursor:'pointer', borderBottom:'1px solid #333'}}>
                            <div style={{position:'relative'}}>
                                <FaUserCircle style={{fontSize:'45px', color:'#ccc', marginRight:'15px'}} />
                                {/* フォローバッジ */}
                                {favoriteUsers.includes(user) && <div className="fav-badge"><FaHeart /></div>}
                            </div>
                            <div style={{flex:1}}>
                                <div style={{fontWeight:'bold', fontSize:'16px'}}>{user}</div>
                                {/* 最新のメッセージ内容または新規フレンドの通知 */}
                                <div style={{fontSize:'13px', color:'#888', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                    {chatHistory[user].length > 0 
                                      ? chatHistory[user][chatHistory[user].length - 1].text 
                                      : <span style={{color:'#00d4ff'}}>✨ 新しいフレンド！メッセージを送ろう</span>
                                    }
                                </div>
                            </div>
                            {/* 最新メッセージの時刻 */}
                            <span style={{fontSize:'11px', color:'#666'}}>
                                {chatHistory[user].length > 0 ? chatHistory[user][chatHistory[user].length - 1].time : ''}
                            </span>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* =========================================================================
        ライブラリタブ (Library)
        ========================================================================= */}
        {activeTab === 'library' && (
          <div className="library-view">
            {viewingPlaylist ? (
                // プレイリスト詳細表示
                <div className="playlist-detail">
                    <div className="detail-header" style={{display:'flex', alignItems:'center', marginBottom:'20px'}}>
                        <button onClick={() => setViewingPlaylist(null)} style={{background:'none', border:'none', color:'white', fontSize:'20px', marginRight:'15px', cursor:'pointer'}}>
                            <FaArrowLeft /> {/* 戻るボタン */}
                        </button>
                        <h2 style={{margin:0}}>{viewingPlaylist.name}</h2>
                    </div>
                    {viewingPlaylist.songs.length === 0 ? (
                        <p style={{textAlign:'center', color:'#888', marginTop:'50px'}}>曲がありません。<br/>追加してください。</p>
                    ) : (
                        // プレイリスト内の曲リスト
                        viewingPlaylist.songs.map((song, index) => (
                            <div key={index} className="song-item" onClick={() => playSong(song, true)}>
                                <span className="rank-number" style={{fontSize:'12px', color:'#666'}}>{index + 1}</span>
                                <img src={song.image} alt="art" className="song-thumb" />
                                <div className="song-info">
                                    <div className="song-title">{song.title}</div>
                                    <div className="song-artist">{song.artist}</div>
                                </div>
                                <button className="play-icon-btn"><FaPlay /></button>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <>
                    {/* プレイリスト作成ボタン */}
                    <div className="create-playlist" onClick={() => { const name = prompt("プレイリスト名:"); if(name) setMyPlaylists([...myPlaylists, { id: Date.now(), name, songs: [] }]); }}>
                      <div className="plus-icon"><FaPlus /></div><span>新しいプレイリストを作成</span>
                    </div>
                    {/* プレイリスト一覧 */}
                    {myPlaylists.map(playlist => (
                       <div key={playlist.id} className="playlist-card" onClick={() => setViewingPlaylist(playlist)}>
                        <div className="playlist-art">🎵</div><div className="playlist-info"><h3>{playlist.name}</h3><p>{playlist.songs.length} 曲</p></div><FaEllipsisV style={{color:'#666'}} />
                      </div>
                    ))}
                </>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
      ユーザープロフィールモーダル
      ========================================================================= */}
      {viewingUser && (
        <div className="modal-overlay" onClick={() => setViewingUser(null)}>
            <div className="modal-content profile-rich" onClick={e => e.stopPropagation()}>
                <div className="profile-cover"></div>
                <div className="profile-avatar"><FaUserCircle /></div>
                <div className="profile-info">
                    <h2>{viewingUser.name}</h2>
                    <p className="status-text">{viewingUser.dist}m 以内 • オンライン</p>
                    {/* 再生中カード */}
                    <div className="current-listening-card">
                        <p style={{fontSize:'10px', color:'#aaa', marginBottom:'5px'}}>再生中</p>
                        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                            <img src={viewingUser.image || `https://img.youtube.com/vi/default/mqdefault.jpg`} style={{width:'40px', borderRadius:'4px'}} alt=""/>
                            <div style={{flex:1, overflow:'hidden'}}>
                                <div style={{fontWeight:'bold', fontSize:'13px', whiteSpace:'nowrap'}}>{viewingUser.currentSong}</div>
                                <div style={{fontSize:'11px', color:'#ccc'}}>{viewingUser.artist}</div>
                            </div>
                            <FaMusic style={{color:'#00d4ff'}}/>
                        </div>
                    </div>
                </div>
                {/* アクションボタン */}
                <div className="profile-actions">
                    <button className={`rich-action-btn ${favoriteUsers.includes(viewingUser.name) ? 'fav' : ''}`} onClick={toggleFavorite}>
                        {favoriteUsers.includes(viewingUser.name) ? <FaHeart /> : <FaRegHeart />} 
                        <span>{favoriteUsers.includes(viewingUser.name) ? 'フォロー中' : 'フォロー'}</span>
                    </button>
                    <button className="rich-action-btn chat" onClick={startChatFromProfile}>
                        <FaCommentDots /> <span>メッセージ</span>
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* =========================================================================
      チャットモーダル
      ========================================================================= */}
      {activeChat && (
        <div className="modal-overlay" onClick={() => setActiveChat(null)}>
            <div className="modal-content chat-rich" onClick={e => e.stopPropagation()}>
                {/* ヘッダー */}
                <div className="chat-rich-header">
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <FaUserCircle style={{fontSize:'24px'}}/>
                        <div><h3 style={{margin:0, fontSize:'16px'}}>{activeChat}</h3><span style={{fontSize:'10px', color:'#00d4ff'}}>● オンライン</span></div>
                    </div>
                    <button onClick={() => setActiveChat(null)}><FaTimes /></button>
                </div>
                {/* チャットボディ（メッセージ一覧） */}
                <div className="chat-rich-body">
                    {(!chatHistory[activeChat] || chatHistory[activeChat].length === 0) && <div style={{textAlign:'center', color:'#666', marginTop:'40px'}}><p>👋 会話をはじめましょう！</p></div>}
                    {chatHistory[activeChat]?.map((msg, i) => (
                        <div key={i} className={`chat-bubble-rich ${msg.sender === 'me' ? 'me' : 'them'}`}>
                            <div className="bubble-content">{msg.text}</div>
                            {/* 送信者と時刻、既読マーク */}
                            <div className="bubble-meta">{msg.time} {msg.sender === 'me' && <FaCheckDouble style={{fontSize:'8px'}}/>}</div>
                        </div>
                    ))}
                    <div ref={chatEndRef} /> {/* 自動スクロールターゲット */}
                </div>
                {/* 入力フォーム */}
                <div className="chat-rich-input">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="メッセージを入力..." />
                    <button onClick={sendMessage} className={chatInput.trim() ? 'active' : ''}><FaPaperPlane /></button>
                </div>
            </div>
        </div>
      )}

      {/* =========================================================================
      プレイリスト追加モーダル
      ========================================================================= */}
      {showAddToPlaylistModal && songToAdd && (
          <div className="modal-overlay" onClick={() => setShowAddToPlaylistModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>プレイリストに追加</h3>
                  {/* 追加する曲のプレビュー */}
                  <div className="modal-song-preview"><img src={songToAdd.image} alt="art" /><div><p><b>{songToAdd.title}</b></p><p style={{fontSize:'12px'}}>{songToAdd.artist}</p></div></div>
                  <hr style={{borderColor:'#444', margin:'15px 0'}}/>
                  {/* プレイリスト選択リスト */}
                  <div className="modal-list">
                      {myPlaylists.map(pl => (<div key={pl.id} className="modal-item" onClick={() => executeAddToPlaylist(pl.id)}><span>{pl.name}</span><span style={{fontSize:'12px', color:'#888'}}>{pl.songs.length}曲</span></div>))}
                  </div>
                  <button className="modal-close-btn" onClick={() => setShowAddToPlaylistModal(false)}>キャンセル</button>
              </div>
          </div>
      )}

      {/* =========================================================================
      音楽プレイヤー (ミニ / フル)
      ========================================================================= */}
      {currentSong && (
        <div className={`player-container ${isPlayerExpanded ? 'expanded' : 'mini'}`}>
          {/* ミニプレイヤーバー */}
          {!isPlayerExpanded && (
            <div className="mini-player-bar" onClick={() => setIsPlayerExpanded(true)}>
              <img src={currentSong.image} alt="art" className="mini-thumb" />
              <div className="mini-info"><div className="mini-title">{currentSong.title}</div><div className="mini-artist">{currentSong.artist}</div></div>
              <button className="mini-play-btn" onClick={(e) => { e.stopPropagation(); isPlaying ? playerObj.pauseVideo() : playerObj.playVideo(); }}>{isPlaying ? <FaPause /> : <FaPlay />}</button>
            </div>
          )}
          {/* フルプレイヤーコンテンツ */}
          <div className="full-player-content" style={{ display: isPlayerExpanded ? 'flex' : 'none' }}>
            {/* ヘッダー */}
            <div className="full-header"><button className="close-btn" onClick={() => setIsPlayerExpanded(false)}><FaChevronDown /></button><span>再生中</span><button className="menu-btn"><FaList /></button></div>
            {/* YouTube埋め込み */}
            <div className="youtube-wrapper">
              <YouTube 
                videoId={currentSong.id} 
                opts={{ height: '100%', width: '100%', playerVars: { autoplay: 1, playsinline: 1, controls: 0 } }} 
                onReady={(e) => {setPlayerObj(e.target); setDuration(e.target.getDuration());}} 
                onStateChange={handlePlayerStateChange} 
                className="youtube-iframe" 
              />
              <div className="touch-layer"></div> {/* 誤操作防止用のタッチレイヤー */}
            </div>
            {/* 曲情報 */}
            <div className="full-info"><h2>{currentSong.title}</h2><p>{currentSong.artist}</p></div>
            {/* シークバーと時間表示 */}
            <div style={{width:'100%', marginBottom:'20px'}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#aaa', marginBottom:'5px'}}><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="seek-bar" style={{width:'100%', accentColor: '#007bff'}} />
            </div>
            {/* コントロールボタン */}
            <div className="full-controls">
              <button className="control-btn" onClick={() => skipTime(-10)}><FaUndo style={{fontSize:'24px'}} /><span style={{fontSize:'10px', display:'block'}}>-10s</span></button>
              <button className="play-circle" onClick={() => isPlaying ? playerObj.pauseVideo() : playerObj.playVideo()}>{isPlaying ? <FaPause /> : <FaPlay style={{marginLeft:'4px'}}/>}</button>
              <button className="control-btn" onClick={() => skipTime(10)}><FaRedo style={{fontSize:'24px'}} /><span style={{fontSize:'10px', display:'block'}}>+10s</span></button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
      ボトムナビゲーションバー
      ========================================================================= */}
      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={resetHome}><FaHome /><span>ホーム</span></div>
        <div className={`nav-item ${activeTab === 'nearby' ? 'active' : ''}`} onClick={() => setActiveTab('nearby')}><FaUserFriends /><span>近くの人</span></div>
        <div className={`nav-item ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}><FaCommentDots /><span>メッセージ</span></div>
        <div className={`nav-item ${activeTab === 'library' ? 'active' : ''}`} onClick={() => setActiveTab('library')}> <FaList /><span>ライブラリ</span></div>
      </nav>
    </div>
  );
}
export default App;