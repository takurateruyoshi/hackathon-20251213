const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seedUsers() {
  console.log('ユーザーテーブルにサンプルデータを挿入中...');

  // ユーザーデータの挿入
  const { data: users, error: usersError } = await supabase
    .from('users')
    .insert([
      {
        username: 'yamada_taro',
        display_name: '山田太郎',
        avatar_url: 'https://randomuser.me/api/portraits/men/1.jpg',
        bio: '音楽が大好きな大学生です。主にJ-POPとロックを聴きます。',
        is_online: true,
        is_discoverable: true,
        ytmusic_connected: false
      },
      {
        username: 'tanaka_hanako',
        display_name: '田中花子',
        avatar_url: 'https://randomuser.me/api/portraits/women/1.jpg',
        bio: 'K-POPとアニソンが好きです！新しい音楽を発見するのが楽しみ。',
        is_online: true,
        is_discoverable: true,
        ytmusic_connected: true
      },
      {
        username: 'suzuki_ken',
        display_name: '鈴木健',
        avatar_url: 'https://randomuser.me/api/portraits/men/2.jpg',
        bio: 'ヒップホップとR&Bを中心に聴いています。DJ活動もしています。',
        is_online: false,
        is_discoverable: true,
        ytmusic_connected: false
      },
      {
        username: 'sato_yuki',
        display_name: '佐藤ゆき',
        avatar_url: 'https://randomuser.me/api/portraits/women/2.jpg',
        bio: 'クラシックとジャズが好きです。ピアノ歴15年。',
        is_online: true,
        is_discoverable: false,
        ytmusic_connected: true
      },
      {
        username: 'watanabe_akira',
        display_name: '渡辺アキラ',
        avatar_url: 'https://randomuser.me/api/portraits/men/3.jpg',
        bio: 'ロック専門！ギター弾きます。バンド組みたい人はDM！',
        is_online: true,
        is_discoverable: true,
        ytmusic_connected: true
      }
    ])
    .select();

  if (usersError) {
    console.error('ユーザーデータ挿入エラー:', usersError);
    return;
  }
  
  console.log('ユーザーデータを挿入しました:', users);
  console.log(`合計 ${users.length} 人のユーザーを追加しました`);
  
  // 各ユーザーのIDを表示
  users.forEach(user => {
    console.log(`ユーザー名: ${user.display_name}, ID: ${user.id}`);
  });
}

// 実行
seedUsers()
  .catch(error => console.error('エラーが発生しました:', error));