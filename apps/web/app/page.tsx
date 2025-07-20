"use client";

import type React from "react";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CorrectionDisplay } from "@/components/ui/correction-display";
import { PWAInstall } from "@/components/pwa-install";
import {
  Copy,
  Volume2,
  Mic,
  MicOff,
  VolumeX,
  Eye,
  EyeOff,
  Keyboard,
  Send,
  X,
  Bookmark,
  Languages,
  MessageCircle,
  Briefcase,
  Newspaper,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  correctedContent?: string;
  translatedContent?: string;
  timestamp: string;
  type?: "news" | "chat";
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Hey! What should we do?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    },
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const autoPlayedMessagesRef = useRef<Set<string>>(new Set());
  const autoPlayStartTimeRef = useRef<number | null>(null);
  const [autoBlurText, setAutoBlurText] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [input, setInput] = useState("");
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(
    new Set()
  );
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  // テキスト選択・翻訳機能の状態
  const [translationPosition, setTranslationPosition] = useState({
    x: 0,
    y: 0,
  });
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null
  );
  const [longPressMessageId, setLongPressMessageId] = useState<string | null>(
    null
  );
  const [touchStartTime, setTouchStartTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const translationCache = useRef<Map<string, string>>(new Map());
  const speedModalTouchProcessedRef = useRef(false);
  const [translatedMessages, setTranslatedMessages] = useState<Set<string>>(new Set());
  const [messageTranslations, setMessageTranslations] = useState<Map<string, string>>(new Map());
  const [translatingMessages, setTranslatingMessages] = useState<Set<string>>(new Set());
  const [translationErrors, setTranslationErrors] = useState<Map<string, string>>(new Map());

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  const initialOptions = [
    {
      id: "news",
      title: "最近のニュースについて教えて",
      icon: Newspaper,
      message: "最近のニュースについて教えてください。",
    },
    {
      id: "interview",
      title: "面接の練習をしてほしい",
      icon: Briefcase,
      message: "面接の練習をお願いします。",
    },
    {
      id: "chat",
      title: "話し相手になって",
      icon: MessageCircle,
      message: "話し相手になってください。",
    },
  ];

  const handleOptionSelect = async (option: (typeof initialOptions)[0]) => {
    if (option.id === "news") {
      // 最新ニュース取得処理
      try {
        setIsAIResponding(true);

        const response = await fetch("/api/news");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const newsMessage = await response.json();

        if (newsMessage.error) {
          throw new Error(newsMessage.error);
        }

        setMessages((prev) => [...prev, newsMessage]);
      } catch (error) {
        console.error("News fetch error:", error);

        const errorMessage = {
          id: Date.now().toString(),
          role: "assistant" as const,
          content: "申し訳ございません。ニュースの取得中にエラーが発生しました。もう一度お試しください。",
          timestamp: new Date().toLocaleTimeString('ja-JP', {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: 'Asia/Tokyo'
          }),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsAIResponding(false);
      }
    } else {
      // その他の選択肢は従来通り
      console.log("選択肢が押されました:", option.title);
    }
  }


  const correctEnglish = async (text: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/correct-english", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error("English correction failed:", response.status);
        return null;
      }

      const result = await response.json();
      return result.correctedText !== text ? result.correctedText : null;
    } catch (error) {
      console.error("English correction error:", error);
      return null;
    }
  };

  const translateToEnglish = async (text: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/translate-to-english", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        console.error(
          "Japanese to English translation failed:",
          response.status
        );
        return null;
      }

      const result = await response.json();
      return result.translatedText || null;
    } catch (error) {
      console.error("Japanese to English translation error:", error);
      return null;
    }
  };

  const isJapanese = (text: string): boolean => {
    return /[ひらがなカタカナ一-龯]/.test(text);
  };

  const isEnglish = (text: string): boolean => {
    return /^[a-zA-Z\s.,!?'"0-9\-()]+$/.test(text);
  };

  const isSupportedLanguage = (detectedLang: string): boolean => {
    return detectedLang === "japanese" || detectedLang === "english";
  };

  // OpenAI API を使った翻訳機能
  const getTranslation = useCallback(async (text: string): Promise<string> => {
    try {
      // キャッシュチェック
      if (translationCache.current.has(text)) {
        return translationCache.current.get(text)!;
      }

      setIsTranslating(true);
      setTranslationError(null);

      const response = await fetch("/api/translate-to-japanese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("Translation request failed");
      }

      const result = await response.json();
      const translatedText = result.translatedText;

      // キャッシュに保存
      translationCache.current.set(text, translatedText);

      return translatedText;
    } catch (error) {
      console.error("Translation error:", error);
      setTranslationError("翻訳できませんでした");
      return "翻訳エラー";
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const transcribeAudio = async (
    audioBlob: Blob,
    filename: string = "recording.wav"
  ) => {
    try {
      setIsTranscribing(true);

      const formData = new FormData();
      formData.append("audio", audioBlob, filename);

      console.log("Sending audio for transcription, size:", audioBlob.size);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const result = await response.json();

      if (result.text) {
        console.log("Transcription result:", {
          text: result.text,
          language: result.language,
          duration: result.duration,
        });

        // 検出された言語を保存
        setDetectedLanguage(result.language || "");

        // 言語チェック: 日本語・英語以外の場合はエラー表示
        if (result.language && !isSupportedLanguage(result.language)) {
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: "assistant",
            content: `申し訳ございません。現在は日本語と英語のみ対応しています。検出された言語: ${result.language}`,
            timestamp: new Date().toLocaleTimeString('ja-JP', {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: 'Asia/Tokyo'
            }),
          };
          setMessages((prev) => [...prev, errorMessage]);
          return;
        }

        // 英語の場合は修正処理、日本語の場合は英訳処理を実行
        let correctedContent: string | undefined;
        let translatedContent: string | undefined;

        if (
          result.language === "english" ||
          isEnglish(result.text)
        ) {
          correctedContent = (await correctEnglish(result.text)) || undefined;
        } else if (isJapanese(result.text)) {
          translatedContent =
            (await translateToEnglish(result.text)) || undefined;
        }

        // 認識されたテキストでメッセージを作成
        const newMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: result.text,
          correctedContent,
          translatedContent,
          timestamp: new Date().toLocaleTimeString('ja-JP', {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: 'Asia/Tokyo'
          }),
        };

        setMessages((prev) => [...prev, newMessage]);

        // AI応答を生成（日本語の場合は英訳を使用）
        await generateAIResponse(translatedContent || result.text);
      }
    } catch (error) {
      console.error("Transcription error:", error);

      // エラーメッセージを表示
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "申し訳ございません。音声の認識中にエラーが発生しました。もう一度お試しください。",
        timestamp: new Date().toLocaleTimeString('ja-JP', {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: 'Asia/Tokyo'
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateAIResponse = async (userMessage: string) => {
    try {
      setIsAIResponding(true);

      const conversationHistory = [
        ...messages,
        {
          role: "user" as const,
          content: userMessage,
        },
      ];

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: conversationHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiMessage = await response.json();

      if (aiMessage.error) {
        throw new Error(aiMessage.error);
      }

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("AI response error:", error);

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          "申し訳ございません。AIの応答生成中にエラーが発生しました。もう一度お試しください。",
        timestamp: new Date().toLocaleTimeString('ja-JP', {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: 'Asia/Tokyo'
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsAIResponding(false);
    }
  };

  // Initialize MediaRecorder for voice recording
  const initializeMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // ブラウザ別の最適な形式を動的検出
      let mimeType = "audio/webm;codecs=opus"; // デフォルト
      let fileExtension = ".webm";

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
        fileExtension = ".webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
        fileExtension = ".ogg";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        mimeType = "audio/mp4";
        fileExtension = ".mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];

        // Stop all tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        if (audioBlob.size > 0) {
          await transcribeAudio(audioBlob, `recording${fileExtension}`);
        }
      };

      return mediaRecorder;
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert(
        "マイクへのアクセスが許可されていません。ブラウザの設定を確認してください。"
      );
      return null;
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      // Stop recording
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
    } else {
      // Start recording
      const mediaRecorder = await initializeMediaRecorder();
      if (mediaRecorder) {
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];
        mediaRecorder.start();
        setIsRecording(true);
      }
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleTextToSpeech = useCallback(async (messageId: string, text: string) => {
    try {
      setIsPlaying((prev) => ({ ...prev, [messageId]: true }));

      const { ttsPlayer } = await import('@/lib/audio-player');
      
      await ttsPlayer.speak(text, playbackSpeed, {
        onStart: () => {
          setIsPlaying((prev) => ({ ...prev, [messageId]: true }));
        },
        onEnd: () => {
          setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
        },
        onError: (error) => {
          console.error("TTS error:", error);
          setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
        }
      });
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
    }
  }, [playbackSpeed]);

  // Track when auto-play is enabled
  useEffect(() => {
    if (autoPlayAudio && autoPlayStartTimeRef.current === null) {
      autoPlayStartTimeRef.current = Date.now();
    } else if (!autoPlayAudio) {
      autoPlayStartTimeRef.current = null;
      autoPlayedMessagesRef.current.clear();
    }
  }, [autoPlayAudio]);

  // Auto-play TTS for AI responses when autoPlayAudio is enabled
  useEffect(() => {
    if (
      !autoPlayAudio ||
      messages.length === 0 ||
      autoPlayStartTimeRef.current === null
    )
      return;

    const lastMessage = messages[messages.length - 1];

    // Check if the last message is from assistant, not already playing, and not already auto-played
    if (
      lastMessage &&
      lastMessage.role === "assistant" &&
      !isPlaying[lastMessage.id] &&
      !autoPlayedMessagesRef.current.has(lastMessage.id)
    ) {
      // Since message ID is Date.now().toString(), we can compare numerically
      const messageId = Number.parseInt(lastMessage.id);
      const autoPlayStartTime = autoPlayStartTimeRef.current;

      // Only auto-play if message was created after auto-play was enabled
      if (messageId >= autoPlayStartTime) {
        // Mark this message as auto-played to prevent duplicate playback
        autoPlayedMessagesRef.current.add(lastMessage.id);

        // Add a small delay to ensure message is rendered
        const timer = setTimeout(() => {
          handleTextToSpeech(lastMessage.id, lastMessage.content);
        }, 500);

        return () => clearTimeout(timer);
      }
    }
  }, [messages, autoPlayAudio, isPlaying, handleTextToSpeech]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userInput = input.trim();

    // 即座にUI更新（フォーム閉じる・入力クリア）
    setInput("");
    setShowTextInput(false);

    // 英語の場合は修正処理、日本語の場合は英訳処理を実行
    let correctedContent: string | undefined;
    let translatedContent: string | undefined;

    if (isEnglish(userInput)) {
      correctedContent = (await correctEnglish(userInput)) || undefined;
    } else if (isJapanese(userInput)) {
      translatedContent = (await translateToEnglish(userInput)) || undefined;
    }

    // ユーザーメッセージを作成
    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: userInput,
      correctedContent,
      translatedContent,
      timestamp: new Date().toLocaleTimeString('ja-JP', {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: 'Asia/Tokyo'
      }),
    };

    setMessages((prev) => [...prev, newMessage]);

    // AI応答を生成（日本語の場合は英訳を使用）
    await generateAIResponse(translatedContent || userInput);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Enterキーでの自動送信を無効化（明示的な送信ボタンクリックのみで送信）
    }
  };

  const handleBookmark = (messageId: string, content: string) => {
    setBookmarkedMessages((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
    console.log("Bookmarking corrected content:", content);
  };

  // タッチイベントハンドラー（スマホ用）
  const handleTouchStart = useCallback(
    (messageId: string) => () => {
      setTouchStartTime(Date.now());
      setSelectedMessageId(messageId);
      setShowTranslation(false);
      setTranslatedText("");
      setTranslationError(null);
      setIsTranslating(false);
      setLongPressMessageId(null);

      // 長押し検知のタイマーを設定（500msに短縮）
      longPressTimeoutRef.current = setTimeout(() => {
        setLongPressMessageId(messageId);
      }, 500);
    },
    []
  );

  const handleTouchMove = useCallback(() => {
    // 移動中は長押しタイマーをクリア
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (messageId: string) => () => {
      const touchDuration = Date.now() - touchStartTime;

      // 長押しタイマーをクリア
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // スマホの選択ツールを避けるため、適度に上に表示
        setTranslationPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 30, // 適切な位置に調整
        });

        // 長押しまたは一定時間選択していた場合に翻訳を表示
        if (longPressMessageId === messageId || touchDuration > 800) {
          setShowTranslation(true);
          // 翻訳を実行
          getTranslation(selectedText).then(setTranslatedText);
        }
      }

      setSelectedMessageId(null);
      setLongPressMessageId(null);
    },
    [touchStartTime, longPressMessageId, getTranslation]
  );

  // マウスイベント（PC用）
  const handleMouseDown = useCallback(
    (messageId: string) => () => {
      setSelectedMessageId(messageId);
      setShowTranslation(false);
      setTranslatedText("");
      setTranslationError(null);
      setIsTranslating(false);
    },
    []
  );

  const handleMouseUp = useCallback(
    () => () => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim()) {
        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // PC用も同様に適度に上に表示
        setTranslationPosition({
          x: rect.left + rect.width / 2,
          y: rect.top - 30, // 適切な位置に調整
        });
        setShowTranslation(true);
        // 翻訳を実行
        getTranslation(selectedText).then(setTranslatedText);
      }
      setSelectedMessageId(null);
    },
    [getTranslation]
  );

  const handleTranslateMessage = async (messageId: string, content: string) => {
    // 翻訳を非表示にする場合
    if (translatedMessages.has(messageId)) {
      setTranslatedMessages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
      return;
    }

    // 既に翻訳済みの場合は表示切り替えのみ
    if (messageTranslations.has(messageId)) {
      setTranslatedMessages((prev) => {
        const newSet = new Set(prev);
        newSet.add(messageId);
        return newSet;
      });
      return;
    }

    // 新規翻訳を実行
    try {
      setTranslatingMessages((prev) => new Set(prev).add(messageId));
      setTranslationErrors((prev) => {
        const newMap = new Map(prev);
        newMap.delete(messageId);
        return newMap;
      });

      const response = await fetch("/api/translate-to-japanese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) {
        throw new Error("翻訳リクエストが失敗しました");
      }

      const result = await response.json();
      const translatedText = result.translatedText;

      if (!translatedText) {
        throw new Error("翻訳結果が取得できませんでした");
      }

      // 翻訳結果を保存
      setMessageTranslations((prev) => {
        const newMap = new Map(prev);
        newMap.set(messageId, translatedText);
        return newMap;
      });

      // 翻訳表示状態を有効化
      setTranslatedMessages((prev) => {
        const newSet = new Set(prev);
        newSet.add(messageId);
        return newSet;
      });
    } catch (error) {
      console.error("Translation error:", error);
      
      // エラーメッセージを設定
      const errorMessage = error instanceof Error ? error.message : "翻訳中にエラーが発生しました";
      setTranslationErrors((prev) => {
        const newMap = new Map(prev);
        newMap.set(messageId, errorMessage);
        return newMap;
      });
      
      // エラーでも表示状態にして、エラーメッセージを見せる
      setTranslatedMessages((prev) => {
        const newSet = new Set(prev);
        newSet.add(messageId);
        return newSet;
      });
    } finally {
      setTranslatingMessages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    }
  };

  const handleBackgroundClick = useCallback(() => {
    setShowTranslation(false);
    setTranslatedText("");
    setTranslationError(null);
    setIsTranslating(false);
  }, []);

  return (
    <div
      className="flex flex-col h-screen max-w-4xl mx-auto bg-white"
      onClick={handleBackgroundClick}
    >
      <style>{`
        .message-content::selection {
          background-color: rgba(59, 130, 246, 0.3);
          color: inherit;
        }

        .message-content::-moz-selection {
          background-color: rgba(59, 130, 246, 0.3);
          color: inherit;
        }

        .ai-message-content::selection {
          background-color: rgba(16, 185, 129, 0.3);
          color: inherit;
        }

        .ai-message-content::-moz-selection {
          background-color: rgba(16, 185, 129, 0.3);
          color: inherit;
        }

        .correction-content::selection {
          background-color: rgba(245, 158, 11, 0.3);
          color: inherit;
        }

        .correction-content::-moz-selection {
          background-color: rgba(245, 158, 11, 0.3);
          color: inherit;
        }

        .selectable-text {
          cursor: text;
          transition: all 0.2s ease;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          user-select: text;
          -webkit-touch-callout: none;
        }

        .selectable-text:hover {
          background-color: rgba(59, 130, 246, 0.05);
        }

        .selecting {
          background-color: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
        }

        .long-press-feedback {
          background-color: rgba(59, 130, 246, 0.2);
          transform: scale(1.02);
          transition: all 0.3s ease;
        }

        .translation-popup {
          animation: fadeInUp 0.3s ease-out;
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translate(-50%, -90%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -100%);
          }
        }

        /* モバイル向けのタッチ最適化 */
        @media (max-width: 768px) {
          .selectable-text {
            -webkit-tap-highlight-color: rgba(59, 130, 246, 0.2);
            tap-highlight-color: rgba(59, 130, 246, 0.2);
          }
        }

        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .slider::-webkit-slider-track {
          height: 8px;
          border-radius: 4px;
          background: #e5e7eb;
        }

        .slider::-moz-range-track {
          height: 8px;
          border-radius: 4px;
          background: #e5e7eb;
          border: none;
        }

        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`flex max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {message.role === "assistant" && null}

              <div
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {message.role === "assistant" ? "Bob" : "ぼく"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {message.timestamp}
                  </span>
                </div>

                <div
                  className={`rounded-lg p-4 ${message.role === "assistant" ? "selectable-text" : ""} ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-50 text-gray-900"
                  } ${message.role === "assistant" && autoBlurText ? "blur-sm hover:blur-none transition-all duration-200" : ""}
                  ${message.role === "assistant" && selectedMessageId === message.id ? "selecting" : ""} ${message.role === "assistant" && longPressMessageId === message.id ? "long-press-feedback" : ""}`}
                  onTouchStart={
                    message.role === "assistant"
                      ? handleTouchStart(message.id)
                      : undefined
                  }
                  onTouchMove={
                    message.role === "assistant" ? handleTouchMove : undefined
                  }
                  onTouchEnd={
                    message.role === "assistant"
                      ? handleTouchEnd(message.id)
                      : undefined
                  }
                  onMouseDown={
                    message.role === "assistant"
                      ? handleMouseDown(message.id)
                      : undefined
                  }
                  onMouseUp={
                    message.role === "assistant"
                      ? handleMouseUp()
                      : undefined
                  }
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`whitespace-pre-line select-text ${
                      message.role === "user"
                        ? "message-content"
                        : "ai-message-content"
                    }`}
                  >
                    {/* ニュース記事の特別なレンダリング */}
                    {message.role === "assistant" &&
                    message.type === "news" ? (
                      <div className="space-y-4">
                        {/* ニュースヘッダー */}
                        <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50 rounded-r-lg">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">📰</div>
                            <div>
                              <div className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-1">
                                Breaking News
                              </div>
                              <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                {message.content.split("\n\n")[0] || ""}
                              </h3>
                            </div>
                          </div>
                        </div>

                        {/* ニュース本文 */}
                        <div className="text-gray-700 leading-relaxed">
                          {message.content.split("\n\n").slice(1).join("\n\n")}
                        </div>
                      </div>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>

                {/* 修正された英語の表示 */}
                {message.role === "user" && message.correctedContent && (
                  <>
                    <CorrectionDisplay
                      content={message.correctedContent}
                      type="correction"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() => handleCopy(message.correctedContent!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() =>
                          handleTextToSpeech(
                            message.id,
                            message.correctedContent!
                          )
                        }
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() =>
                          handleBookmark(message.id, message.correctedContent!)
                        }
                      >
                        <Bookmark
                          className={`h-4 w-4 ${bookmarkedMessages.has(message.id) ? "text-red-500 fill-red-500" : ""}`}
                        />
                      </Button>
                    </div>
                  </>
                )}

                {/* 日本語の英訳表示 */}
                {message.role === "user" && message.translatedContent && (
                  <>
                    <CorrectionDisplay
                      content={message.translatedContent}
                      type="translation"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() => handleCopy(message.translatedContent!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() =>
                          handleTextToSpeech(
                            message.id,
                            message.translatedContent!
                          )
                        }
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-gray-100"
                        onClick={() =>
                          handleBookmark(message.id, message.correctedContent!)
                        }
                      >
                        <Bookmark
                          className={`h-4 w-4 ${bookmarkedMessages.has(message.id) ? "text-red-500 fill-red-500" : ""}`}
                        />
                      </Button>
                    </div>
                  </>
                )}

                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() => handleCopy(message.content)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-100"
                      onClick={() =>
                        handleTextToSpeech(message.id, message.content)
                      }
                      disabled={isPlaying[message.id]}
                    >
                      {isPlaying[message.id] ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-8 w-8 p-0 hover:bg-gray-100 ${translatedMessages.has(message.id) ? "bg-blue-100 text-blue-600" : ""}`}
                      onClick={() => handleTranslateMessage(message.id, message.content)}
                      disabled={translatingMessages.has(message.id)}
                    >
                      {translatingMessages.has(message.id) ? (
                        <div className="animate-spin h-4 w-4 border border-blue-500 border-t-transparent rounded-full" />
                      ) : (
                        <Languages className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}

                {/* 翻訳されたコンテンツの表示 */}
                {message.role === "assistant" && translatedMessages.has(message.id) && (
                  <div className="mt-2 rounded-lg p-3 bg-blue-50 border border-blue-200 text-blue-800 text-sm max-w-full">
                    <div className="flex items-start gap-2">
                      <Languages className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="whitespace-pre-line flex-1">
                        {translationErrors.has(message.id) ? (
                          <span className="text-red-600">{translationErrors.get(message.id)}</span>
                        ) : (
                          messageTranslations.get(message.id) || "翻訳中..."
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 初期選択肢の表示 */}
                {message.id === "initial" && (
                  <div className="mt-4 space-y-3 w-full max-w-sm">
                    {initialOptions.map((option) => {
                      const IconComponent = option.icon
                      return (
                        <Button
                          key={option.id}
                          onClick={() => handleOptionSelect(option)}
                          variant="outline"
                          className="w-full h-12 p-3 text-left hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 justify-start"
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900">{option.title}</span>
                          </div>
                        </Button>
                      )
                    })}
                  </div>
                )}
              </div>

              {message.role === "user" && null}
            </div>
          </div>
        ))}
      </div>

      {/* Voice Input Area */}
      <div className="border-t bg-white p-6 mb-4">
        <div className="flex justify-center items-center">
          {/* Left side - Text input button */}
          <div className="absolute left-6">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-12 w-12 p-0 bg-transparent"
                onClick={() => setShowTextInput(!showTextInput)}
              >
                <Keyboard className="h-5 w-5" />
              </Button>
              {showTextInput && (
                <div className="absolute bottom-16 left-0 mb-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-80 z-10">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        テキスト入力
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => setShowTextInput(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder="メッセージを入力してください..."
                      className="w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTextInput(false)}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="bg-blue-500 hover:bg-blue-600"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        送信
                      </Button>
                    </div>
                  </div>
                  {/* Arrow pointing down */}
                  <div className="absolute -bottom-2 left-4 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
                </div>
              )}
            </div>
          </div>

          {/* Center - Mic button */}
          <Button
            onClick={handleVoiceInput}
            variant={isRecording ? "destructive" : "default"}
            size="lg"
            className={`h-20 w-20 rounded-full p-0 shadow-lg transition-all duration-200 ${
              isRecording
                ? "animate-pulse bg-red-500 hover:bg-red-600 scale-110"
                : "bg-blue-500 hover:bg-blue-600 hover:scale-105"
            }`}
          >
            {isRecording ? (
              <MicOff className="h-10 w-10 text-white" />
            ) : (
              <Mic className="h-10 w-10 text-white" />
            )}
          </Button>

          {/* Right side - Settings menu */}
          <div className="absolute right-6 flex items-center">
            <div className="relative">
              {/* Settings menu items - slide up animation */}
              {showSettingsMenu && (
                <div className="absolute bottom-12 right-0 flex flex-col gap-2 animate-slide-up">
                  <Button
                    variant={autoPlayAudio ? "default" : "outline"}
                    size="sm"
                    className="h-12 w-12 p-0 shadow-md"
                    onClick={() => setAutoPlayAudio(!autoPlayAudio)}
                  >
                    {autoPlayAudio ? (
                      <Volume2 className="h-5 w-5" />
                    ) : (
                      <VolumeX className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant={autoBlurText ? "default" : "outline"}
                    size="sm"
                    className="h-12 w-12 p-0 shadow-md"
                    onClick={() => setAutoBlurText(!autoBlurText)}
                  >
                    {autoBlurText ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-12 w-12 p-0 bg-white shadow-md mb-3"
                    onClick={() => setShowSpeedControl(!showSpeedControl)}
                  >
                    <span className="text-sm font-medium">
                      {playbackSpeed}x
                    </span>
                  </Button>
                </div>
              )}

              {/* Main menu button */}
              <Button
                variant="outline"
                size="sm"
                className="h-12 w-12 p-0 bg-white"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              >
                <span className="text-xl font-bold">⋯</span>
              </Button>
            </div>
          </div>
        </div>
        {isTranscribing && (
          <p className="text-center text-sm text-blue-600 mt-3 animate-pulse">
            Analyzing voice... / 音声を解析中...
          </p>
        )}
        {detectedLanguage &&
          !isRecording &&
          !isTranscribing &&
          !isAIResponding && (
            <p className="text-center text-xs text-gray-500 mt-1">
              Detected:{" "}
              {detectedLanguage === "japanese"
                ? "日本語"
                : detectedLanguage === "english"
                  ? "English"
                  : detectedLanguage}
            </p>
          )}
        {isAIResponding && (
          <p className="text-center text-sm text-blue-600 mt-3 animate-pulse">
            AI generating response... / AI が回答を生成中...
          </p>
        )}
      </div>

      {showSpeedControl && (
        <div 
          className="fixed inset-0 z-10"
          onClick={() => {
            if (!speedModalTouchProcessedRef.current) {
              setShowSpeedControl(false);
            }
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            speedModalTouchProcessedRef.current = true;
            setShowSpeedControl(false);
            // クリックイベントの重複を防ぐため、短時間フラグを立てる
            setTimeout(() => {
              speedModalTouchProcessedRef.current = false;
            }, 300);
          }}
        >
          <div 
            className="absolute bottom-16 right-20 mb-2 p-4 bg-white border border-gray-200 rounded-lg shadow-lg w-64"
            onClick={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  読み上げ速度
                </span>
                <span className="text-sm text-blue-600 font-medium">
                  {playbackSpeed}x
                </span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="6"
                  step="1"
                  value={speedOptions.indexOf(playbackSpeed)}
                  onChange={(e) =>
                    setPlaybackSpeed(
                      speedOptions[Number.parseInt(e.target.value)] || 1.0
                    )
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
              </div>
            </div>
            {/* Arrow pointing down - 右端に配置 */}
            <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45"></div>
          </div>
        </div>
      )}

      {/* Translation Popup */}
      {showTranslation && (
        <div
          className="fixed bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-xl z-20 pointer-events-none translation-popup max-w-xs"
          style={{
            left: translationPosition.x,
            top: translationPosition.y,
            transform: "translate(-50%, -100%)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-medium text-center">
            {isTranslating ? (
              <span className="animate-pulse">翻訳中...</span>
            ) : translationError ? (
              <span className="text-red-300">{translationError}</span>
            ) : (
              translatedText || "翻訳結果が表示されます"
            )}
          </div>
          {/* Arrow pointing down */}
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}

      {/* PWA Install Prompt */}
      <PWAInstall />
    </div>
  );
}
