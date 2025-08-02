"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Edit3,
  Trash2,
  Copy,
  Volume2,
  ArrowLeft,
  Bookmark,
  Languages,
  CheckCircle,
} from "lucide-react";

interface SavedPhrase {
  id: string;
  content: string;
  translation?: string;
  category: "correction" | "bookmark" | "translation";
  timestamp: string;
  originalContent?: string;
}

export default function SavedPhrasesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "correction" | "bookmark" | "translation"
  >("all");

  // Mock data for saved phrases
  const [savedPhrases, setSavedPhrases] = useState<SavedPhrase[]>([
    {
      id: "1",
      content: "I'd like to check my current bill and payment status.",
      category: "correction",
      timestamp: "2024-01-15 14:30",
      originalContent: "I want to checking my bill",
    },
    {
      id: "2",
      content: "Could you please help me understand the billing process?",
      category: "correction",
      timestamp: "2024-01-15 15:45",
      originalContent: "Can you help me understand billing process",
    },
    {
      id: "3",
      content:
        "Hungary's Historic Library Battles Beetle Invasion to Save Priceless Books",
      translation:
        "ハンガリーの歴史的図書館が貴重な書籍を守るため甲虫の侵入と戦う",
      category: "bookmark",
      timestamp: "2024-01-16 09:20",
    },
    {
      id: "4",
      content: "Thank you for your assistance with this matter.",
      category: "correction",
      timestamp: "2024-01-16 11:15",
      originalContent: "Thanks for help with this",
    },
    {
      id: "5",
      content: "generative AI agent",
      translation: "生成AIエージェント",
      category: "translation",
      timestamp: "2024-01-16 16:30",
    },
    {
      id: "6",
      content:
        "The team is using high-tech methods to protect and preserve these irreplaceable treasures",
      translation:
        "チームは、これらのかけがえのない宝物を保護し保存するためにハイテク手法を使用している",
      category: "bookmark",
      timestamp: "2024-01-17 10:45",
    },
  ]);

  const categories = [
    { id: "all", label: "すべて", icon: null },
    { id: "correction", label: "修正", icon: CheckCircle },
    { id: "bookmark", label: "ブックマーク", icon: Bookmark },
    { id: "translation", label: "翻訳", icon: Languages },
  ];

  const bookmarkedPhrases = useMemo(() => {
    return savedPhrases.filter((phrase) => phrase.category === "bookmark");
  }, [savedPhrases]);

  const handleEdit = (phrase: SavedPhrase) => {
    setEditingId(phrase.id);
    setEditContent(phrase.content);
  };

  const handleSaveEdit = () => {
    if (editingId && editContent.trim()) {
      setSavedPhrases((prev) =>
        prev.map((phrase) =>
          phrase.id === editingId
            ? { ...phrase, content: editContent.trim() }
            : phrase
        )
      );
      setEditingId(null);
      setEditContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent("");
  };

  const handleDelete = (id: string) => {
    setSavedPhrases((prev) => prev.filter((phrase) => phrase.id !== id));
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handlePlayAudio = (content: string) => {
    console.log("Playing audio for:", content);
    // Audio playback logic would go here
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "correction":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "bookmark":
        return <Bookmark className="h-4 w-4 text-red-500" />;
      case "translation":
        return <Languages className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "correction":
        return "bg-green-50 border-green-200";
      case "bookmark":
        return "bg-red-50 border-red-200";
      case "translation":
        return "bg-blue-50 border-blue-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="border-b bg-white p-4 sm:p-6">
        <div className="flex items-center gap-3 sm:gap-4 mb-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-10 w-10 p-0 hover:bg-gray-100 flex-shrink-0"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              ブックマーク
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {bookmarkedPhrases.length}件のフレーズ
            </p>
          </div>
        </div>
      </div>

      {/* Phrases List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {bookmarkedPhrases.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <div className="text-gray-400 mb-4">
              <Bookmark className="h-10 w-10 sm:h-12 sm:w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ブックマークがありません
            </h3>
            <p className="text-gray-500 text-sm sm:text-base">
              チャットでフレーズをブックマークすると、ここに表示されます
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {bookmarkedPhrases.map((phrase) => (
              <div
                key={phrase.id}
                className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 transition-all duration-200 hover:shadow-md hover:border-blue-300"
              >
                <div className="space-y-3">
                  {/* Category and Timestamp */}
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4 text-blue-600 flex-shrink-0" />
                    <span className="text-xs text-gray-500">
                      {phrase.timestamp}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="space-y-3">
                    {/* 日本語を最初に表示 */}
                    {phrase.translation && (
                      <div className="text-gray-900 leading-relaxed font-medium text-base sm:text-lg">
                        {phrase.translation}
                      </div>
                    )}

                    {/* 英語を次に表示 */}
                    <div className="text-gray-700 leading-relaxed text-sm sm:text-base">
                      {phrase.content}
                    </div>
                  </div>

                  {/* Action Buttons - Mobile optimized */}
                  {editingId !== phrase.id && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-gray-100 touch-manipulation"
                        onClick={() => handleCopy(phrase.content)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-gray-100 touch-manipulation"
                        onClick={() => handlePlayAudio(phrase.content)}
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-gray-100 touch-manipulation"
                        onClick={() => handleEdit(phrase)}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 hover:bg-red-100 text-red-600 touch-manipulation"
                        onClick={() => handleDelete(phrase.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
