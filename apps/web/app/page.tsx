"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Volume2, Mic, MicOff } from "lucide-react";

// Speech Recognition types
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

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
      content: "Hello, I am a generative AI agent. How may I assist you today?",
      timestamp: "4:08:28 PM",
    },
    {
      id: "2",
      role: "user",
      content: "Hi, I'd like to check my bill.",
      timestamp: "4:08:37 PM",
    },
    {
      id: "3",
      role: "assistant",
      content: `Please hold for a second.

      Ok, I can help you with that.

      I'm pulling up your current bill information.

      Your current bill is $150, and it is due on August 31, 2024.

      If you need more details, feel free to ask!`,
      timestamp: "4:08:37 PM",
    },
  ]);

  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleSend = () => {
    if (input.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: input,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };
      setMessages([...messages, newMessage]);
      setInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition =
        window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "ja-JP";

      recognition.onresult = (event) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(interimTranscript);

        if (finalTranscript) {
          const newMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: finalTranscript,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
          };
          setMessages((prev) => [...prev, newMessage]);
          setTranscript("");
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert("音声認識はこのブラウザでサポートされていません");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
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
                    {message.role === "assistant" ? "GenerativeAgent" : "G5"}
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
                  }`}
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
        <div className="flex justify-center">
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
        </div>
        {isRecording && (
          <>
            <p className="text-center text-sm text-gray-600 mt-3 animate-pulse">
              録音中... タップして停止
            </p>
            {transcript && (
              <p className="text-center text-sm text-blue-600 mt-2 italic">
                "{transcript}"
              </p>
            )}
          </>
        )}
        {!isRecording && (
          <p className="text-center text-sm text-gray-500 mt-3">
            マイクボタンを押して会話を始めましょう
          </p>
        )}
      </div>
    </div>
  );
}
