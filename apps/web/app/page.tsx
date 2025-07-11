"use client";

import type React from "react";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Volume2,
  Mic,
  MicOff,
  VolumeX,
  Eye,
  EyeOff,
  HelpCircle,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

        // 認識されたテキストでメッセージを作成
        const newMessage: Message = {
          id: Date.now().toString(),
          role: "user",
          content: result.text,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, newMessage]);

        // AI応答を生成
        await generateAIResponse(result.text);
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

  const handlePlayAudio = (messageId: string) => {
    // Audio playback logic would go here
    console.log("Playing audio for message:", messageId);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
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
                  className={`rounded-lg p-4 ${
                    message.role === "user"
                      ? "bg-blue-500 text-white"
                      : "bg-gray-50 text-gray-900"
                  } ${message.role === "assistant" && autoBlurText ? "blur-sm hover:blur-none transition-all duration-200" : ""}`}
                >
                  <div className="whitespace-pre-line">{message.content}</div>
                </div>

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
                      onClick={() => handlePlayAudio(message.id)}
                    >
                      <Volume2 className="h-4 w-4" />
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
    </div>
  );
}
