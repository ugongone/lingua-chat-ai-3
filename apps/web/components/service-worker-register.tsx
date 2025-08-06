'use client';

import { useEffect, useState, useRef } from 'react';
import { UpdateNotification } from '@/components/ui/update-notification';

export function ServiceWorkerRegister() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>(undefined);
  const [isRegistering, setIsRegistering] = useState<boolean>(false); // 重複登録防止フラグ
  const updateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null); // useRefでインターバルを管理

  useEffect(() => {
    // Service Worker がサポートされているかチェック
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker はこのブラウザでサポートされていません');
      return;
    }

    const registerServiceWorker = async () => {
      // 重複登録防止
      if (isRegistering) {
        console.log('Service Worker登録処理は既に実行中です');
        return;
      }

      // 既存の登録をチェック
      try {
        const existingReg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (existingReg) {
          console.log('既存の Service Worker 登録を使用します:', existingReg);
          setRegistration(existingReg);
          return existingReg;
        }
      } catch (error) {
        console.log('既存登録のチェックでエラー:', error);
      }

      setIsRegistering(true);
      try {
        // Service Worker を登録（キャッシュをバイパス）
        const reg = await navigator.serviceWorker.register('/sw.js', {
          updateViaCache: 'none', // HTTPキャッシュをバイパスして常に最新をチェック
        });

        console.log('Service Worker 登録成功:', reg);
        setRegistration(reg);

        // 既存のService Workerがある場合は即座に更新チェック
        if (reg.waiting) {
          console.log('待機中の Service Worker が見つかりました');
        }

        // アクティブなService Workerがない場合（初回インストール）
        if (!navigator.serviceWorker.controller) {
          console.log('Service Worker が初回インストールされました');
        }

        // 更新チェックを手動で実行
        reg.update();

        // Service Workerからのメッセージを受信
        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);

        return reg;
      } catch (error) {
        console.error('Service Worker 登録失敗:', error);
        return undefined;
      } finally {
        setIsRegistering(false);
      }
    };

    // Service Workerからのメッセージハンドラー
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        console.log('Service Workerから更新通知を受信しました');
      }
    };

    // 定期更新チェックを設定（1時間毎）
    const startPeriodicUpdateCheck = (reg: ServiceWorkerRegistration) => {
      // 既にインターバルが設定されている場合は停止
      if (updateCheckIntervalRef.current) {
        clearInterval(updateCheckIntervalRef.current);
        console.log('既存の定期更新チェックを停止しました');
      }

      const interval = setInterval(async () => {
        try {
          console.log('定期更新チェックを実行中...');
          await reg.update();
        } catch (error) {
          console.error('定期更新チェックでエラーが発生:', error);
        }
      }, 60 * 60 * 1000); // 1時間 = 60分 * 60秒 * 1000ms

      updateCheckIntervalRef.current = interval;
      console.log('定期更新チェック（1時間毎）を開始しました');
    };

    // iOS Safari 対応: アプリ起動時とフォーカス時に強制更新チェック
    const handleFocusUpdate = async () => {
      if (registration) {
        try {
          console.log('フォーカス時の更新チェックを実行中...');
          await registration.update();
        } catch (error) {
          console.error('フォーカス時更新チェックでエラーが発生:', error);
        }
      }
    };

    // Service Worker登録を実行
    registerServiceWorker().then((reg) => {
      if (reg) {
        // 定期更新チェックを開始
        startPeriodicUpdateCheck(reg);
        
        // iOS Safari対応のためのフォーカスイベント追加
        window.addEventListener('focus', handleFocusUpdate);
      }
    });

    // クリーンアップ関数
    return () => {
      // 定期更新チェックをクリア
      if (updateCheckIntervalRef.current) {
        clearInterval(updateCheckIntervalRef.current);
        updateCheckIntervalRef.current = null;
        console.log('定期更新チェックを停止しました');
      }

      // イベントリスナーを削除
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
      window.removeEventListener('focus', handleFocusUpdate);
    };
  }, []); // 空の依存配列でマウント時に一度だけ実行

  // Service Workerの状態をログ出力（開発時のデバッグ用）
  useEffect(() => {
    const logServiceWorkerState = () => {
      if (navigator.serviceWorker.controller) {
        console.log('現在アクティブな Service Worker:', navigator.serviceWorker.controller.scriptURL);
      } else {
        console.log('アクティブな Service Worker はありません');
      }
    };

    // 初回状態をログ出力
    logServiceWorkerState();

    // controller変更時のログ出力
    const handleControllerChange = () => {
      console.log('Service Worker controller が変更されました');
      logServiceWorkerState();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return (
    <>
      {/* 更新通知UIコンポーネント */}
      <UpdateNotification registration={registration} />
    </>
  );
}