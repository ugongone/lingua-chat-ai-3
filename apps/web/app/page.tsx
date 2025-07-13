"use client";

import type React from "react";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { CorrectionDisplay } from "@/components/ui/correction-display";
import {
  Copy,
  Volume2,
  Mic,
  MicOff,
  VolumeX,
  Eye,
  EyeOff,
  HelpCircle,
  Keyboard,
  Send,
  X,
  Bookmark,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  correctedContent?: string;
  translatedContent?: string;
  timestamp: string;
}

export default function ChatUI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hello! Please speak to me using voice. Press the microphone button to start our conversation.",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    },
  ]);

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAIResponding, setIsAIResponding] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string>("");
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [autoBlurText, setAutoBlurText] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [input, setInput] = useState("");
  const [isPlaying, setIsPlaying] = useState<Record<string, boolean>>({});
  const [bookmarkedMessages, setBookmarkedMessages] = useState<Set<string>>(
    new Set()
  );
  // テキスト選択・翻訳機能の状態
  const [selectedText, setSelectedText] = useState("");
  const [translationPosition, setTranslationPosition] = useState({ x: 0, y: 0 });
  const [showTranslation, setShowTranslation] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [touchStartTime, setTouchStartTime] = useState(0);
  const [isLongPress, setIsLongPress] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // 簡易翻訳機能
  const getTranslation = (_text: string) => {
    return "日本語が表示されます";
  };

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

        // 英語の場合は修正処理、日本語の場合は英訳処理を実行
        let correctedContent: string | undefined;
        let translatedContent: string | undefined;

        if (
          detectedLanguage === "en" ||
          result.text.match(/^[a-zA-Z\s.,!?'"]+$/)
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
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
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
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
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
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
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

  const handleTextToSpeech = async (messageId: string, text: string) => {
    try {
      setIsPlaying((prev) => ({ ...prev, [messageId]: true }));

      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error("TTS request failed");
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("TTS error:", error);
      setIsPlaying((prev) => ({ ...prev, [messageId]: false }));
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userInput = input.trim();

    // 即座にUI更新（フォーム閉じる・入力クリア）
    setInput("");
    setShowTextInput(false);

    // 英語の場合は修正処理、日本語の場合は英訳処理を実行
    let correctedContent: string | undefined;
    let translatedContent: string | undefined;

    if (userInput.match(/^[a-zA-Z\s.,!?'"]+$/)) {
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
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
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
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartTime(Date.now());
    setIsSelecting(true);
    setShowTranslation(false);
    setIsLongPress(false);

    // 長押し検知のタイマーを設定（500msに短縮）
    longPressTimeoutRef.current = setTimeout(() => {
      setIsLongPress(true);
    }, 500);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // 移動中は長押しタイマーをクリア
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
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

        setSelectedText(selectedText);
        
        // ポップアップの位置を画面端で調整
        const popupWidth = 200; // ポップアップの幅の推定値
        let x = rect.left + rect.width / 2;
        let y = rect.top - 10;
        
        // 左端での調整
        if (x - popupWidth / 2 < 10) {
          x = popupWidth / 2 + 10;
        }
        // 右端での調整
        if (x + popupWidth / 2 > window.innerWidth - 10) {
          x = window.innerWidth - popupWidth / 2 - 10;
        }
        // 上端での調整
        if (y < 50) {
          y = rect.bottom + 30;
        }
        
        setTranslationPosition({ x, y });

        // 長押しまたは一定時間選択していた場合に翻訳を表示
        if (isLongPress || touchDuration > 800) {
          setShowTranslation(true);
        }
      }

      setIsSelecting(false);
      setIsLongPress(false);
    },
    [touchStartTime, isLongPress]
  );

  // マウスイベント（PC用）
  const handleMouseDown = useCallback(() => {
    setIsSelecting(true);
    setShowTranslation(false);
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(selectedText);
      
      // ポップアップの位置を画面端で調整
      const popupWidth = 200;
      let x = rect.left + rect.width / 2;
      let y = rect.top - 10;
      
      if (x - popupWidth / 2 < 10) {
        x = popupWidth / 2 + 10;
      }
      if (x + popupWidth / 2 > window.innerWidth - 10) {
        x = window.innerWidth - popupWidth / 2 - 10;
      }
      if (y < 50) {
        y = rect.bottom + 30;
      }
      
      setTranslationPosition({ x, y });
      setShowTranslation(true);
    }
    setIsSelecting(false);
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setShowTranslation(false);
  }, []);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white" onClick={handleBackgroundClick}>
      <style jsx>{`
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
                    {message.role === "assistant" ? "Mr.Bob" : "ぼく"}
                  </span>
                  <span className="text-sm text-gray-500">
                    {message.timestamp}
                  </span>
                </div>

                <div
                  className={`rounded-lg p-4 selectable-text ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-50 text-gray-900"
                  } ${message.role === "assistant" && autoBlurText ? "blur-sm hover:blur-none transition-all duration-200" : ""}
                  ${isSelecting ? "selecting" : ""} ${isLongPress ? "long-press-feedback" : ""}`}
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={`whitespace-pre-line select-text ${
                      message.role === "user" ? "message-content" : "ai-message-content"
                    }`}
                  >
                    {message.content}
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
                  </div>
                )}
              </div>

              {message.role === "user" && null}
            </div>
          </div>
        ))}
      </div>

      {/* Voice Input Area */}
      <div className="border-t bg-white p-6">
        <div className="flex justify-center items-center">
          {/* Left side - Text input button */}
          <div className="absolute left-6">
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0 bg-transparent"
                onClick={() => setShowTextInput(!showTextInput)}
              >
                <Keyboard className="h-4 w-4" />
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
            className={`h-16 w-16 rounded-full p-0 shadow-lg transition-all duration-200 ${
              isRecording
                ? "animate-pulse bg-red-500 hover:bg-red-600 scale-110"
                : "bg-blue-500 hover:bg-blue-600 hover:scale-105"
            }`}
          >
            {isRecording ? (
              <MicOff className="h-8 w-8 text-white" />
            ) : (
              <Mic className="h-8 w-8 text-white" />
            )}
          </Button>

          {/* Right side - Settings buttons */}
          <div className="absolute right-0 flex items-center gap-2">
            <Button
              variant={autoPlayAudio ? "default" : "outline"}
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => setAutoPlayAudio(!autoPlayAudio)}
            >
              {autoPlayAudio ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant={autoBlurText ? "default" : "outline"}
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => setAutoBlurText(!autoBlurText)}
            >
              {autoBlurText ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 text-gray-500"
                onClick={() => setShowHelp(!showHelp)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>

            {showHelp && (
              <div className="absolute bottom-16 right-0 mb-2 p-3 bg-white border border-gray-200 rounded-lg shadow-lg text-sm text-gray-700 w-80 z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4" />
                    <span>自動読み上げ: AIの回答を自動で音声再生します</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-4 w-4" />
                    <span>
                      自動モザイク:
                      AIの回答にぼかし効果をかけます（ホバーで解除）
                    </span>
                  </div>
                </div>
                {/* Arrow pointing down */}
                <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r border-b border-gray-200 transform rotate-45"></div>
              </div>
            )}
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
              {detectedLanguage === "ja"
                ? "日本語"
                : detectedLanguage === "en"
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
          <div className="font-medium text-center">{getTranslation(selectedText)}</div>
          {/* Arrow pointing down */}
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
        </div>
      )}
    </div>
  );
}
