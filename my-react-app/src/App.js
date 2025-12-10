import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import YouTube from 'react-youtube';
import { 
  FaPlay, FaPause, FaChevronDown, FaList, FaHome, FaSearch, FaPlus, 
  FaMapMarkerAlt, FaTimes, FaUserFriends, FaArrowLeft, FaEllipsisV, 
  FaRedo, FaUndo, FaUserCircle, FaHeart, FaRegHeart, FaCommentDots, 
  FaPaperPlane, FaSignInAlt, FaMusic, FaCheckDouble 
} from 'react-icons/fa';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

const formatTime = (seconds) => {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 15);
  }, [center, map]);
  return null;
}

function getDistance(lat1, lng1, lat2, lng2) {
  if(!lat1 || !lng1 || !lat2 || !lng2) return 0;
  const x = (lng2 - lng1) * Math.cos((lat1 + lat2) / 2 * (Math.PI / 180)); 
  const y = (lat2 - lat1);
  return Math.round(Math.sqrt(x*x + y*y) * 111000);
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myUsername, setMyUsername] = useState("");
  const [tempUsername, setTempUsername] = useState("");

  const [activeTab, setActiveTab] = useState('home');
  const [popularSongs, setPopularSongs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [nearbySongs, setNearbySongs] = useState([]);
  const [myPlaylists, setMyPlaylists] = useState([{ id: 1, name: 'お気に入り', songs: [] }]);
  
  const [viewingUser, setViewingUser] = useState(null); 
  const [favoriteUsers, setFavoriteUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null); 
  const [chatHistory, setChatHistory] = useState({}); 
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  // ★ここ重要: プレイリストの中身を見るためのState
  const [viewingPlaylist, setViewingPlaylist] = useState(null);

  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAdd, setSongToAdd] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerObj, setPlayerObj] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [myLocation, setMyLocation] = useState([35.681236, 139.767125]);
  const [locationLoaded, setLocationLoaded] = useState(false);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setMyLocation([pos.coords.latitude, pos.coords.longitude]); setLocationLoaded(true); },
        () => setLocationLoaded(true)
      );
    } else { setLocationLoaded(true); }
    axios.get('http://127.0.0.1:8000/api/charts').then(res => setPopularSongs(res.data)).catch(() => setPopularSongs([]));
  }, []);

  useEffect(() => {
    if (!locationLoaded || !isLoggedIn) return;
    const fetchNearby = () => {
      axios.get('http://127.0.0.1:8000/api/songs').then(res => {
          const songsAroundMe = res.data.map((song) => {
            if (song.lat && song.lng) return song;
            const latOffset = (Math.random() - 0.5) * 0.005; 
            const lngOffset = (Math.random() - 0.5) * 0.005;
            return { ...song, lat: myLocation[0] + latOffset, lng: myLocation[1] + lngOffset };
          });
          setNearbySongs(songsAroundMe);
      }).catch(console.error);
    };
    fetchNearby();
    const interval = setInterval(fetchNearby, 5000);
    return () => clearInterval(interval);
  }, [locationLoaded, myLocation, isLoggedIn]);

  useEffect(() => {
    if (!playerObj || !isPlaying) return;
    const timeInterval = setInterval(() => {
      setCurrentTime(playerObj.getCurrentTime());
      if (duration === 0) setDuration(playerObj.getDuration());
    }, 1000);
    return () => clearInterval(timeInterval);
  }, [playerObj, isPlaying, duration]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, activeChat]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (tempUsername.trim() === "") return alert("名前を入力してください");
    setMyUsername(tempUsername);
    setIsLoggedIn(true);
  };

  const resetHome = () => { 
      setActiveTab('home'); 
      setIsSearching(false); 
      setSearchQuery(""); 
      setSearchResults([]);
      setViewingPlaylist(null); // プレイリスト詳細も閉じる
  };

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim() !== "") {
      setIsSearching(true); setSearchResults([]);
      axios.get(`http://127.0.0.1:8000/api/search?q=${searchQuery}`).then(res => setSearchResults(res.data)).catch(() => alert("検索失敗"));
    }
  };

  const openUserProfile = (e, song) => {
    e.stopPropagation();
    setViewingUser({
        name: song.sharedBy || 'Unknown',
        currentSong: song.title,
        artist: song.artist,
        image: song.image,
        dist: getDistance(myLocation[0], myLocation[1], song.lat, song.lng)
    });
  };

  const toggleFavorite = () => {
    if (!viewingUser) return;
    const name = viewingUser.name;
    if (favoriteUsers.includes(name)) {
        setFavoriteUsers(prev => prev.filter(u => u !== name));
    } else {
        setFavoriteUsers(prev => [...prev, name]);
        setChatHistory(prev => {
            if (prev[name]) return prev;
            return { ...prev, [name]: [] };
        });
    }
  };

  const startChatFromProfile = () => {
    setActiveChat(viewingUser.name);
    setViewingUser(null);
    if (!chatHistory[viewingUser.name]) setChatHistory(prev => ({ ...prev, [viewingUser.name]: [] }));
  };

  const openChatFromList = (name) => {
    setActiveChat(name);
  };

  const sendMessage = () => {
    if (chatInput.trim() === "") return;
    const user = activeChat;
    const text = chatInput;
    const newMessage = { sender: 'me', text: text, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
    
    setChatHistory(prev => ({ ...prev, [user]: [...(prev[user] || []), newMessage] }));
    setChatInput("");

    setTimeout(() => {
        let replyText = "いいね！👍";
        if (text.includes("こんにちは")) replyText = "こんにちは！趣味合いますね🎵";
        else if (text.includes("好き")) replyText = "私もその曲大好きです！";
        const replyMessage = { sender: user, text: replyText, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
        setChatHistory(prev => ({ ...prev, [user]: [...(prev[user] || []), replyMessage] }));
    }, 1500);
  };

  const playSong = (songData, autoExpand = true) => {
    let videoId = songData.videoId || songData.id;
    if (!videoId) return alert("再生不可");
    const song = { id: videoId, title: songData.title, artist: songData.artist, image: songData.image || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` };
    setCurrentSong(song); setIsPlayerExpanded(autoExpand); setIsPlaying(true); setCurrentTime(0); setDuration(0);
    const isAlreadyShared = nearbySongs.some(s => s.title === song.title);
    if (!isAlreadyShared && isLoggedIn) {
      axios.post('http://127.0.0.1:8000/api/songs', { title: song.title, artist: song.artist, sharedBy: myUsername, distance: '0m', videoId: song.id }).catch(console.error);
    }
  };

  const handlePlayerStateChange = (e) => setIsPlaying(e.data === 1);
  const handleSeek = (e) => { const t = parseFloat(e.target.value); setCurrentTime(t); playerObj?.seekTo(t); };
  const skipTime = (s) => { if(playerObj){ const t=playerObj.getCurrentTime()+s; playerObj.seekTo(t); setCurrentTime(t); }};

  const openAddToPlaylist = (e, song) => {
    e.stopPropagation();
    const videoId = song.videoId || song.id;
    const cleanSong = { id: videoId, videoId, title: song.title, artist: song.artist, image: song.image || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` };
    setSongToAdd(cleanSong); setShowAddToPlaylistModal(true);
  };
  const executeAddToPlaylist = (playlistId) => {
    setMyPlaylists(prev => prev.map(pl => {
        if (pl.id === playlistId) {
            if (pl.songs.some(s => s.id === songToAdd.id)) return pl;
            return { ...pl, songs: [...pl.songs, songToAdd] };
        } return pl;
    }));
    setShowAddToPlaylistModal(false); alert("追加しました！");
  };

  if (!isLoggedIn) {
    return (
      <div className="login-screen-rich">
        <div className="login-content-rich">
          <div className="login-logo-circle">📡</div>
          <h1>Music Radar</h1>
          <form onSubmit={handleLogin} style={{width: '100%', marginTop: '40px'}}>
            <label style={{display:'block', color:'#888', marginBottom:'10px', fontSize:'14px'}}>USERNAME</label>
            <input type="text" placeholder="Name" value={tempUsername} onChange={(e) => setTempUsername(e.target.value)} className="rich-input-big" autoFocus />
            <button type="submit" className="rich-btn-big">LOGIN <FaSignInAlt /></button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className={`main-content ${currentSong ? 'has-mini-player' : ''}`}>
        
        <header className="app-header" onClick={resetHome} style={{cursor:'pointer'}}>
          <h1>Music Radar 📡</h1>
        </header>

        <div className="tab-menu">
          <button className={activeTab === 'home' ? 'active' : ''} onClick={resetHome}>ホーム</button>
          <button className={activeTab === 'nearby' ? 'active' : ''} onClick={() => setActiveTab('nearby')}>近くの人</button>
          <button className={activeTab === 'messages' ? 'active' : ''} onClick={() => setActiveTab('messages')}>メッセージ</button>
          <button className={activeTab === 'library' ? 'active' : ''} onClick={() => setActiveTab('library')}>ライブラリ</button>
        </div>

        {activeTab === 'home' && (
          <div className="song-list">
            <div style={{ marginBottom: '20px', position: 'relative' }}>
              <FaSearch style={{ position: 'absolute', left: '15px', top: '12px', color: '#888' }} />
              <input type="text" placeholder="曲名、アーティスト名で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={handleSearch} style={{ width: '100%', padding: '10px 10px 10px 40px', borderRadius: '25px', border: 'none', background: '#333', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
              {isSearching && <FaTimes style={{ position: 'absolute', right: '15px', top: '12px', color: '#888', cursor: 'pointer' }} onClick={() => { setIsSearching(false); setSearchQuery(""); setSearchResults([]); }} />}
            </div>
            {(isSearching ? searchResults : popularSongs).map((song, index) => (
              <div key={index} className="song-item" onClick={() => playSong(song, true)}>
                {!isSearching && <span className="rank-number">{index + 1}</span>}
                <img src={song.image} alt="art" className="song-thumb" />
                <div className="song-info"><div className="song-title">{song.title}</div><div className="song-artist">{song.artist}</div></div>
                <button className="add-btn" onClick={(e) => openAddToPlaylist(e, song)}><FaPlus /></button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'nearby' && (
          <div className="nearby-view" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ height: '40vh', margin: '15px', borderRadius: '25px', overflow: 'hidden', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', position: 'relative' }}>
              <MapContainer center={myLocation} zoom={16} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapUpdater center={myLocation} />
                <Marker position={myLocation}><Popup>あなた ({myUsername})</Popup></Marker>
                {nearbySongs.map((song, index) => (
                  <Marker key={index} position={[song.lat, song.lng]}>
                    <Popup>
                      <div style={{textAlign:'center'}}>
                        <b onClick={(e)=>openUserProfile(e, song)} style={{color:'#007bff', cursor:'pointer', textDecoration:'underline'}}>{song.sharedBy}</b><br/>
                        <span style={{fontSize:'12px'}}>{song.title}</span><br/>
                        <button onClick={() => playSong(song, false)} style={{ marginTop: '5px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>再生</button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px 20px' }}>
              <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px', color: '#888' }}>近くのユーザー ({nearbySongs.length}人)</h3>
              {nearbySongs.map((song, index) => {
                 const dist = getDistance(myLocation[0], myLocation[1], song.lat, song.lng);
                 const vId = song.videoId || song.id;
                 return (
                  <div key={index} className="song-item" onClick={() => playSong(song, false)} style={{ background: '#222', padding: '10px', borderRadius: '12px', marginBottom: '10px', display:'flex', alignItems:'center' }}>
                    <div onClick={(e) => openUserProfile(e, song)} style={{marginRight:'12px', textAlign:'center', cursor:'pointer', minWidth:'50px'}}>
                        <div className={`avatar-ring ${favoriteUsers.includes(song.sharedBy) ? 'fav' : ''}`}>
                            <FaUserCircle style={{fontSize:'36px', color: '#ddd'}} />
                        </div>
                        <div style={{fontSize:'9px', color:'#aaa', marginTop:'2px'}}>{dist}m</div>
                    </div>
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

        {activeTab === 'messages' && (
            <div className="messages-view" style={{padding:'20px'}}>
                <h2>💬 メッセージ</h2>
                {Object.keys(chatHistory).length === 0 ? (
                    <div style={{textAlign:'center', marginTop:'80px', color:'#666'}}>
                        <FaUserFriends style={{fontSize:'50px', marginBottom:'10px'}}/>
                        <p>まだメッセージはありません。<br/>気になった人をフォローしてみましょう！</p>
                    </div>
                ) : (
                    Object.keys(chatHistory).map((user) => (
                        <div key={user} className="song-item" onClick={() => openChatFromList(user)} style={{padding:'15px', cursor:'pointer', borderBottom:'1px solid #333'}}>
                            <div style={{position:'relative'}}>
                                <FaUserCircle style={{fontSize:'45px', color:'#ccc', marginRight:'15px'}} />
                                {favoriteUsers.includes(user) && <div className="fav-badge"><FaHeart /></div>}
                            </div>
                            <div style={{flex:1}}>
                                <div style={{fontWeight:'bold', fontSize:'16px'}}>{user}</div>
                                <div style={{fontSize:'13px', color:'#888', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                                    {chatHistory[user].length > 0 ? chatHistory[user][chatHistory[user].length - 1].text : <span style={{color:'#00d4ff'}}>✨ 新しいフレンド！</span>}
                                </div>
                            </div>
                            <span style={{fontSize:'11px', color:'#666'}}>{chatHistory[user].length > 0 ? chatHistory[user][chatHistory[user].length - 1].time : ''}</span>
                        </div>
                    ))
                )}
            </div>
        )}

        {/* --- ★修正: ライブラリ (詳細表示の復活！) --- */}
        {activeTab === 'library' && (
          <div className="library-view">
            {viewingPlaylist ? (
                /* 詳細表示 */
                <div className="playlist-detail">
                    <div className="detail-header" style={{display:'flex', alignItems:'center', marginBottom:'20px'}}>
                        <button onClick={() => setViewingPlaylist(null)} style={{background:'none', border:'none', color:'white', fontSize:'20px', marginRight:'15px', cursor:'pointer'}}>
                            <FaArrowLeft />
                        </button>
                        <h2 style={{margin:0}}>{viewingPlaylist.name}</h2>
                    </div>
                    {viewingPlaylist.songs.length === 0 ? (
                        <p style={{textAlign:'center', color:'#888', marginTop:'50px'}}>曲がありません。<br/>追加してください。</p>
                    ) : (
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
                /* 一覧表示 */
                <>
                    <div className="create-playlist" onClick={() => { const name = prompt("プレイリスト名:"); if(name) setMyPlaylists([...myPlaylists, { id: Date.now(), name, songs: [] }]); }}>
                      <div className="plus-icon"><FaPlus /></div><span>新しいプレイリストを作成</span>
                    </div>
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

      {viewingUser && (
        <div className="modal-overlay" onClick={() => setViewingUser(null)}>
            <div className="modal-content profile-rich" onClick={e => e.stopPropagation()}>
                <div className="profile-cover"></div>
                <div className="profile-avatar"><FaUserCircle /></div>
                <div className="profile-info">
                    <h2>{viewingUser.name}</h2>
                    <p className="status-text">{viewingUser.dist}m away • Online</p>
                    <div className="current-listening-card">
                        <p style={{fontSize:'10px', color:'#aaa', marginBottom:'5px'}}>NOW PLAYING</p>
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
                <div className="profile-actions">
                    <button className={`rich-action-btn ${favoriteUsers.includes(viewingUser.name) ? 'fav' : ''}`} onClick={toggleFavorite}>
                        {favoriteUsers.includes(viewingUser.name) ? <FaHeart /> : <FaRegHeart />} <span>{favoriteUsers.includes(viewingUser.name) ? 'Followed' : 'Follow'}</span>
                    </button>
                    <button className="rich-action-btn chat" onClick={startChatFromProfile}><FaCommentDots /> <span>Message</span></button>
                </div>
            </div>
        </div>
      )}

      {activeChat && (
        <div className="modal-overlay" onClick={() => setActiveChat(null)}>
            <div className="modal-content chat-rich" onClick={e => e.stopPropagation()}>
                <div className="chat-rich-header">
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <FaUserCircle style={{fontSize:'24px'}}/>
                        <div><h3 style={{margin:0, fontSize:'16px'}}>{activeChat}</h3><span style={{fontSize:'10px', color:'#00d4ff'}}>● Online</span></div>
                    </div>
                    <button onClick={() => setActiveChat(null)}><FaTimes /></button>
                </div>
                <div className="chat-rich-body">
                    {(!chatHistory[activeChat] || chatHistory[activeChat].length === 0) && <div style={{textAlign:'center', color:'#666', marginTop:'40px'}}><p>👋 会話をはじめましょう！</p></div>}
                    {chatHistory[activeChat]?.map((msg, i) => (
                        <div key={i} className={`chat-bubble-rich ${msg.sender === 'me' ? 'me' : 'them'}`}>
                            <div className="bubble-content">{msg.text}</div>
                            <div className="bubble-meta">{msg.time} {msg.sender === 'me' && <FaCheckDouble style={{fontSize:'8px'}}/>}</div>
                        </div>
                    ))}
                    <div ref={chatEndRef} />
                </div>
                <div className="chat-rich-input">
                    <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="メッセージを入力..." />
                    <button onClick={sendMessage} className={chatInput.trim() ? 'active' : ''}><FaPaperPlane /></button>
                </div>
            </div>
        </div>
      )}

      {showAddToPlaylistModal && songToAdd && (
          <div className="modal-overlay" onClick={() => setShowAddToPlaylistModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <h3>プレイリストに追加</h3>
                  <div className="modal-song-preview"><img src={songToAdd.image} alt="art" /><div><p><b>{songToAdd.title}</b></p><p style={{fontSize:'12px'}}>{songToAdd.artist}</p></div></div>
                  <hr style={{borderColor:'#444', margin:'15px 0'}}/>
                  <div className="modal-list">
                      {myPlaylists.map(pl => (<div key={pl.id} className="modal-item" onClick={() => executeAddToPlaylist(pl.id)}><span>{pl.name}</span><span style={{fontSize:'12px', color:'#888'}}>{pl.songs.length}曲</span></div>))}
                  </div>
                  <button className="modal-close-btn" onClick={() => setShowAddToPlaylistModal(false)}>キャンセル</button>
              </div>
          </div>
      )}

      {currentSong && (
        <div className={`player-container ${isPlayerExpanded ? 'expanded' : 'mini'}`}>
          {!isPlayerExpanded && (
            <div className="mini-player-bar" onClick={() => setIsPlayerExpanded(true)}>
              <img src={currentSong.image} alt="art" className="mini-thumb" />
              <div className="mini-info"><div className="mini-title">{currentSong.title}</div><div className="mini-artist">{currentSong.artist}</div></div>
              <button className="mini-play-btn" onClick={(e) => { e.stopPropagation(); isPlaying ? playerObj.pauseVideo() : playerObj.playVideo(); }}>{isPlaying ? <FaPause /> : <FaPlay />}</button>
            </div>
          )}
          <div className="full-player-content" style={{ display: isPlayerExpanded ? 'flex' : 'none' }}>
            <div className="full-header"><button className="close-btn" onClick={() => setIsPlayerExpanded(false)}><FaChevronDown /></button><span>再生中</span><button className="menu-btn"><FaList /></button></div>
            <div className="youtube-wrapper">
              <YouTube videoId={currentSong.id} opts={{ height: '100%', width: '100%', playerVars: { autoplay: 1, playsinline: 1, controls: 0 } }} onReady={(e) => {setPlayerObj(e.target); setDuration(e.target.getDuration());}} onStateChange={handlePlayerStateChange} className="youtube-iframe" />
              <div className="touch-layer"></div>
            </div>
            <div className="full-info"><h2>{currentSong.title}</h2><p>{currentSong.artist}</p></div>
            <div style={{width:'100%', marginBottom:'20px'}}>
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'12px', color:'#aaa', marginBottom:'5px'}}><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
                <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="seek-bar" style={{width:'100%', accentColor: '#007bff'}} />
            </div>
            <div className="full-controls">
              <button className="control-btn" onClick={() => skipTime(-10)}><FaUndo style={{fontSize:'24px'}} /><span style={{fontSize:'10px', display:'block'}}>-10s</span></button>
              <button className="play-circle" onClick={() => isPlaying ? playerObj.pauseVideo() : playerObj.playVideo()}>{isPlaying ? <FaPause /> : <FaPlay style={{marginLeft:'4px'}}/>}</button>
              <button className="control-btn" onClick={() => skipTime(10)}><FaRedo style={{fontSize:'24px'}} /><span style={{fontSize:'10px', display:'block'}}>+10s</span></button>
            </div>
          </div>
        </div>
      )}

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