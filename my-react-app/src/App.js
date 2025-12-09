import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// 💡 FastAPIの公開URL（ngrokのHTTPS URL）を指定します
// ⚠️ ngrokのURLを最新のものに修正してください
const API_URL = 'http://localhost:8000/api/songs'; 


function App() {
  const [songs, setSongs] = useState([]); 
  const [errorMessage, setErrorMessage] = useState(null);
  // ✅ 新しいステート: 生のレスポンスデータを保存
  const [rawResponse, setRawResponse] = useState(null); 

  // --- FastAPIからデータを取得する処理 ---
  useEffect(() => {
    setErrorMessage(null);
    setRawResponse(null); // 取得前にリセット

    axios.get(API_URL)
      .then(response => {
        let data = response.data;
        
        // --- ✅ デバッグ処理: 生のデータを保存して、画面に表示する ---
        
        // 1. レスポンスが HTML 文字列として返されたかチェック
        if (typeof data === 'string' && data.toLowerCase().trim().startsWith('<!doctype html>')) {
            console.warn('判定結果: HTMLコンテンツを受信。生データを画面に表示します。');
            setErrorMessage('注意: APIからHTML応答を受信しました。以下の生のデータを確認してください。');
            setRawResponse(data);
            setSongs([]); // 曲リストの表示は停止
            return;
        }
        
        // 2. HTMLではなかったが、JSON配列でもなかった場合
        if (!Array.isArray(data)) {
            console.error('判定結果: 予期せぬデータ形式を受信。生データを画面に表示します。', data);
            setErrorMessage('エラー: APIが予期せぬ形式のデータを返しました。以下の生のデータを確認してください。');
            setRawResponse(JSON.stringify(data, null, 2)); // JSONを整形して保存
            setSongs([]);
            return;
        }

        // 3. 正常なJSON配列だった場合 (念のため)
        console.log('判定結果: 期待されるJSON配列を受信しました。データ長:', data.length);
        setSongs(data);
        setRawResponse(JSON.stringify(data, null, 2));
        
        console.log('--- API応答の判定終了 ---');
        
      })
      .catch(error => {
        // ❌ ネットワークエラーやCORSブロックが発生した場合
        console.error('ネットワークエラーが発生しました:', error);
        
        let message = 'FastAPIへの接続に失敗しました。';
        if (error.response) {
            message = `APIエラー: ステータス ${error.response.status} (${error.response.statusText})。`;
            setRawResponse(error.response.data || JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
            message = 'ネットワーク接続エラー: 応答がありません。CORSポリシー違反の可能性が高いです。';
            setRawResponse("エラー: ネットワーク接続が確立できませんでした。");
        }
        
        setErrorMessage(message);
        setSongs([]);
      });
  }, []); 


  // --- 画面レンダリング ---
  return (
    <div className="App" style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      
      <header style={{ marginBottom: '20px', borderBottom: '1px solid #eee' }}>
        <h1>Music Radar 📡</h1>
        <p>デバッグモード: 受信した生のデータを表示します。</p>
      </header>

      <main>
        {/* エラーメッセージがある場合はそれを最優先で表示 */}
        {errorMessage && (
            <p style={{textAlign: 'center', color: 'red', fontWeight: 'bold', padding: '10px', border: '1px solid red', borderRadius: '8px'}}>
                {errorMessage}
            </p>
        )}
        
        {/* ✅ 受け取った生のデータをそのまま表示 */}
        <h3 style={{ marginTop: '20px' }}>受信した生のデータ:</h3>
        {rawResponse ? (
             <pre style={{ 
                 background: '#f4f4f4', 
                 padding: '15px', 
                 borderRadius: '8px', 
                 whiteSpace: 'pre-wrap', 
                 wordBreak: 'break-all',
                 fontSize: '12px'
             }}>
                {rawResponse}
             </pre>
        ) : (
            <p style={{textAlign: 'center', color: '#888'}}>📡 データを待機中...</p>
        )}
        
        {/* 念のため、データが取得できていれば下に表示するロジックは残す */}
        {songs.length > 0 && (
             <>
                <h3 style={{ marginTop: '30px' }}>解析済み曲リスト (成功時のみ表示)</h3>
                {songs.map((song) => (
                    <div key={song.id} style={styles.card}>
                        {/* ... (曲リスト表示部分は省略) */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{ margin: '0 0 5px 0', fontSize: '18px' }}>{song.title}</h3>
                            <p style={{ margin: 0, color: '#555', fontSize: '14px' }}>{song.artist}</p>
                            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#888' }}>
                                Shared by {song.sharedBy} • {song.distance}
                            </p>
                        </div>
                    </div>
                ))}
             </>
        )}
      </main>

      {/* 画面下部に固定されたシェアボタン (スタイルのみ残す) */}
     <div style={styles.floatingButtonArea}>
        <button style={styles.mainButton}>
           + シェアする (デバッグ中)
        </button>
      </div>
    </div>
  );
}

// 簡単なスタイル定義 (変更なし)
const styles = {
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#f9f9f9',
    padding: '15px',
    borderRadius: '12px',
    marginBottom: '10px',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  },
  playButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: 'none',
    background: '#333',
    color: 'white',
    cursor: 'pointer',
    marginLeft: '10px'
  },
  floatingButtonArea: {
    position: 'fixed',
    bottom: '30px',
    left: '0',
    right: '0',
    display: 'flex',
    justifyContent: 'center'
  },
  mainButton: {
    padding: '12px 30px',
    borderRadius: '25px',
    border: 'none',
    background: '#007bff',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    boxShadow: '0 4px 10px rgba(0,123,255,0.3)',
    cursor: 'pointer'
  }
};

export default App;