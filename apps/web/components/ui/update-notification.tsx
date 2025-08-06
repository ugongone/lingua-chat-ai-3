'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, X, Download } from 'lucide-react';

interface UpdateNotificationProps {
  registration?: ServiceWorkerRegistration;
}

export function UpdateNotification({ registration }: UpdateNotificationProps) {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!registration) return;

    const handleUpdateFound = () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('新しいバージョンが利用可能です');
            setShowUpdatePrompt(true);
          }
        });
      }
    };

    // 更新検知イベントリスナーを追加
    registration.addEventListener('updatefound', handleUpdateFound);

    return () => {
      registration.removeEventListener('updatefound', handleUpdateFound);
    };
  }, [registration]);

  const handleUpdateNow = async () => {
    setIsUpdating(true);
    
    try {
      // Waiting状態のService Workerに対してskipWaitingメッセージを送信
      if (registration?.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      // Service Workerがcontrollerに変更されるのを待つ
      const handleControllerChange = () => {
        window.location.reload();
      };

      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      
      // タイムアウト設定（5秒後に強制リロード）
      setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
        window.location.reload();
      }, 5000);
      
    } catch (error) {
      console.error('アップデートエラー:', error);
      // エラーが発生した場合も強制リロード
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    setShowUpdatePrompt(false);
  };

  // iOS Safariかどうかの判定
  const isIosSafari = () => {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua);
  };

  // 更新プロンプトが表示されない場合は何も表示しない
  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-blue-50 border border-blue-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <RefreshCw className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900">
              新しいバージョンが利用可能
            </h3>
            <p className="text-xs text-blue-700 mt-1">
              {isIosSafari() 
                ? 'より良いエクスペリエンスのために、アプリを再起動してください' 
                : '最新の機能とバグ修正が含まれています'
              }
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-blue-400 hover:text-blue-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="mt-3 flex space-x-2">
        <Button
          onClick={handleUpdateNow}
          size="sm"
          className="flex-1 bg-blue-600 hover:bg-blue-700"
          disabled={isUpdating}
        >
          {isUpdating ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              更新中...
            </>
          ) : (
            <>
              <Download className="w-3 h-3 mr-1" />
              今すぐ更新
            </>
          )}
        </Button>
        
        <Button
          onClick={handleDismiss}
          variant="outline"
          size="sm"
          className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          後で
        </Button>
      </div>
      
      {isIosSafari() && (
        <div className="mt-2 text-xs text-blue-600 bg-blue-100 rounded p-2">
          💡 iOS Safari: 更新後、一度アプリを完全に閉じて再起動すると確実に最新版が適用されます
        </div>
      )}
    </div>
  );
}