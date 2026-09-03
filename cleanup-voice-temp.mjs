// voice-temp バケットの古い一時ファイルを削除するスクリプト
//
// 【使い方】
// 1. 必要なパッケージをインストール:
//      npm install @supabase/supabase-js
//
// 2. 環境変数をセット(このスクリプトと同じフォルダで実行):
//      export SUPABASE_URL="https://wdntqfavisojsawpnehc.supabase.co"
//      export SUPABASE_SERVICE_ROLE_KEY="ここにservice_roleキー"
//
//    ※ service_role キーは Supabaseダッシュボード → Project Settings → API から取得
//    ※ このキーは絶対にGitHubや人に見せないこと(全権限キーです)
//
// 3. まずはドライラン(削除せず、対象件数と合計サイズだけ表示):
//      node cleanup-voice-temp.mjs --dry-run
//
// 4. 内容を確認して問題なければ本番実行(実際に削除):
//      node cleanup-voice-temp.mjs
//
// デフォルトでは「24時間より古いファイル」だけを削除対象にします。
// 直近24時間分は処理中の可能性があるため安全のため除外しています。
// 除外時間を変えたい場合は下の CUTOFF_HOURS を編集してください。

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'voice-temp';
const CUTOFF_HOURS = 24; // これより古いファイルだけ削除対象
const DRY_RUN = process.argv.includes('--dry-run');
const PAGE_SIZE = 1000; // Supabase storage.list の1回あたり最大件数
const DELETE_BATCH_SIZE = 100; // 一度に削除するファイル数

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数にセットしてください');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

async function listAllFiles() {
  let allFiles = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit: PAGE_SIZE,
      offset,
      sortBy: { column: 'created_at', order: 'asc' },
    });

    if (error) {
      console.error('❌ ファイル一覧取得エラー:', error.message);
      process.exit(1);
    }

    if (!data || data.length === 0) break;

    allFiles = allFiles.concat(data);
    offset += data.length;

    if (data.length < PAGE_SIZE) break; // 最後のページ
  }

  return allFiles;
}

async function main() {
  console.log(`📦 バケット "${BUCKET}" のファイル一覧を取得中...`);
  const files = await listAllFiles();
  console.log(`   合計 ${files.length} 件見つかりました\n`);

  const cutoffDate = new Date(Date.now() - CUTOFF_HOURS * 60 * 60 * 1000);
  console.log(`🕒 削除対象: ${cutoffDate.toISOString()} より前に作成されたファイル\n`);

  const targets = files.filter((f) => {
    const created = f.created_at ? new Date(f.created_at) : null;
    return created && created < cutoffDate;
  });

  const totalBytes = targets.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);

  console.log(`🎯 削除対象ファイル数: ${targets.length} / ${files.length}`);
  console.log(`🎯 削除対象合計サイズ: ${formatBytes(totalBytes)}\n`);

  if (targets.length === 0) {
    console.log('削除対象がありません。終了します。');
    return;
  }

  if (DRY_RUN) {
    console.log('--- DRY RUN のため実際には削除しません ---');
    console.log('最初の10件のサンプル:');
    targets.slice(0, 10).forEach((f) => {
      console.log(`  ${f.name}  (${formatBytes(f.metadata?.size || 0)}, ${f.created_at})`);
    });
    console.log('\n本番実行する場合は --dry-run を外して再実行してください。');
    return;
  }

  console.log('🗑  削除を開始します...');
  let deletedCount = 0;
  let deletedBytes = 0;

  for (let i = 0; i < targets.length; i += DELETE_BATCH_SIZE) {
    const batch = targets.slice(i, i + DELETE_BATCH_SIZE);
    const paths = batch.map((f) => f.name);

    const { data, error } = await supabase.storage.from(BUCKET).remove(paths);

    if (error) {
      console.error(`❌ バッチ削除エラー (${i}〜${i + batch.length}件目):`, error.message);
      continue;
    }

    deletedCount += batch.length;
    deletedBytes += batch.reduce((sum, f) => sum + (f.metadata?.size || 0), 0);
    console.log(`   ${deletedCount} / ${targets.length} 件削除済み...`);
  }

  console.log(`\n✅ 完了: ${deletedCount} 件削除しました (合計 ${formatBytes(deletedBytes)})`);
}

main().catch((err) => {
  console.error('❌ 予期しないエラー:', err);
  process.exit(1);
});
