'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card'
import { DevOnlyGuard } from '@/components/shared/DevOnlyGuard'
import { Button } from '@/components/shared/ui/button'
import { Input } from '@/components/shared/ui/input'
import {
  Bot,
  Sparkles,
  BookOpen,
  Languages,
  MessageSquare,
  Loader2,
  Send,
  Zap,
  GraduationCap,
  FileText,
  Globe,
  Layers,
  HelpCircle,
  BookMarked,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  AlertTriangle,
} from 'lucide-react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select'

type AIFeatureType =
  | 'vocabulary'
  | 'grammar'
  | 'paragraph'
  | 'dialogue'
  | 'sentence'
  | 'story'
  | 'translation'
  | 'flashcard'
  | 'quiz'

const LANGUAGES = [
  { code: 'English', label: 'Tiếng Anh (English)' },
  { code: 'Japanese', label: 'Tiếng Nhật (日本語)' },
  { code: 'Mandarin Chinese', label: 'Tiếng Trung (中文)' },
  { code: 'Korean', label: 'Tiếng Hàn (한국어)' },
  { code: 'French', label: 'Tiếng Pháp (Français)' },
  { code: 'German', label: 'Tiếng Đức (Deutsch)' },
  { code: 'Spanish', label: 'Tiếng Tây Ban Nha (Español)' },
  { code: 'Vietnamese', label: 'Tiếng Việt (Vietnamese)' },
]

const LEVEL_CONFIG_BY_LANG: Record<string, { code: string; label: string }[]> = {
  English: [
    { code: 'A1', label: 'A1 — Sơ cấp cơ bản' },
    { code: 'A2', label: 'A2 — Sơ cấp thành thạo' },
    { code: 'B1', label: 'B1 — Trung cấp' },
    { code: 'B2', label: 'B2 — Trung cấp nâng cao' },
    { code: 'C1', label: 'C1 — Cao cấp' },
    { code: 'C2', label: 'C2 — Thành thạo tối cao' },
  ],
  Japanese: [
    { code: 'N5', label: 'JLPT N5 — Nhập môn (A1)' },
    { code: 'N4', label: 'JLPT N4 — Sơ cấp (A2)' },
    { code: 'N3', label: 'JLPT N3 — Trung cấp (B1)' },
    { code: 'N2', label: 'JLPT N2 — Trung cao cấp (B2)' },
    { code: 'N1', label: 'JLPT N1 — Cao cấp (C1-C2)' },
  ],
  'Mandarin Chinese': [
    { code: 'HSK 1', label: 'HSK 1 — Căn bản (A1)' },
    { code: 'HSK 2', label: 'HSK 2 — Sơ cấp (A2)' },
    { code: 'HSK 3', label: 'HSK 3 — Sơ trung cấp (B1)' },
    { code: 'HSK 4', label: 'HSK 4 — Trung cấp (B2)' },
    { code: 'HSK 5', label: 'HSK 5 — Cao cấp (C1)' },
    { code: 'HSK 6', label: 'HSK 6 — Thành thạo (C2)' },
  ],
  Korean: [
    { code: 'TOPIK 1', label: 'TOPIK 1 — Sơ cấp 1 (A1)' },
    { code: 'TOPIK 2', label: 'TOPIK 2 — Sơ cấp 2 (A2)' },
    { code: 'TOPIK 3', label: 'TOPIK 3 — Trung cấp 3 (B1)' },
    { code: 'TOPIK 4', label: 'TOPIK 4 — Trung cấp 4 (B2)' },
    { code: 'TOPIK 5', label: 'TOPIK 5 — Cao cấp 5 (C1)' },
    { code: 'TOPIK 6', label: 'TOPIK 6 — Cao cấp 6 (C2)' },
  ],
}

const ENGLISH_TENSES = [
  { code: 'all', label: 'Tất cả thì (Tự động)' },
  { code: 'Present Simple', label: 'Thì Hiện tại đơn (Present Simple)' },
  { code: 'Present Continuous', label: 'Thì Hiện tại tiếp diễn (Present Continuous)' },
  { code: 'Present Perfect', label: 'Thì Hiện tại hoàn thành (Present Perfect)' },
  { code: 'Past Simple', label: 'Thì Quá khứ đơn (Past Simple)' },
  { code: 'Past Continuous', label: 'Thì Quá khứ tiếp diễn (Past Continuous)' },
  { code: 'Future Simple', label: 'Thì Tương lai đơn (Future Simple)' },
  { code: 'Conditionals (If)', label: 'Thức điều kiện (Conditionals)' },
  { code: 'Passive Voice', label: 'Thể bị động (Passive Voice)' },
]

export default function StudentAIAssistantPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<AIFeatureType>('vocabulary')
  const [loading, setLoading] = useState(false)
  // Input states
  const [targetLanguage, setTargetLanguage] = useState('English')
  const [sourceLanguage, setSourceLanguage] = useState('Vietnamese')
  const [topic, setTopic] = useState('Travel & Tourism')
  const [cefrLevel, setCefrLevel] = useState('B1')
  const [englishTense, setEnglishTense] = useState('all')
  const [wordInput, setWordInput] = useState('Explore')
  const [grammarTopic, setGrammarTopic] = useState('Present Perfect vs Past Simple')
  const [translationText, setTranslationText] = useState('Xin chào, tôi muốn học ngôn ngữ mới cùng trợ lý AI.')

  // Result state
  const [resultData, setResultData] = useState<any | null>(null)

  // UI states for interactive features
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [paraAnswers, setParaAnswers] = useState<Record<number, number>>({})
  const [showParagraphTranslation, setShowParagraphTranslation] = useState(false)
  const [showStoryTranslation, setShowStoryTranslation] = useState(false)

  // Reset interactive states when resultData or activeTab changes
  // Clear results when switching tabs
  useEffect(() => {
    setResultData(null)
  }, [activeTab])

  // Reset interactive states when resultData or activeTab changes
  useEffect(() => {
    setFlashcardIndex(0)
    setIsFlipped(false)
    setShowHint(false)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setParaAnswers({})
    setShowParagraphTranslation(false)
    setShowStoryTranslation(false)
  }, [resultData, activeTab])

  // Helper renderers for AI Content types
  const renderTranslationResult = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-6">
        {/* Source vs Translated Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Văn bản gốc ({sourceLanguage})</span>
            <p className="text-base font-semibold text-slate-800 leading-relaxed">{content.sourceText}</p>
          </div>
          <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F]">Bản dịch ({targetLanguage})</span>
            <p className="text-base font-bold text-emerald-950 leading-relaxed">{content.translatedText}</p>
            {content.transliteration && (
              <p className="text-xs font-mono text-emerald-700 pt-1 italic">Phiên âm: {content.transliteration}</p>
            )}
          </div>
        </div>

        {/* Word by Word Breakdown */}
        {Array.isArray(content.wordByWord) && content.wordByWord.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-[#5D7B6F]" /> Phân tích nghĩa từ/cụm từ theo ngữ cảnh
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {content.wordByWord.map((item: any, idx: number) => (
                <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{item.source || item.word}</span>
                    <span className="text-xs font-semibold text-[#5D7B6F] bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                      {item.translated || item.translation}
                    </span>
                  </div>
                  {item.notes && <p className="text-[11px] text-slate-500 leading-snug">{item.notes}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grammar Notes */}
        {content.grammarNotes && (
          <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/80 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs text-amber-900 leading-relaxed">
              <span className="font-bold uppercase tracking-wider text-amber-700 block">Ghi chú ngữ pháp & Cấu trúc</span>
              <p className="whitespace-pre-line font-medium">{content.grammarNotes}</p>
            </div>
          </div>
        )}

        {/* Alternatives */}
        {Array.isArray(content.alternatives) && content.alternatives.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Các phương án dịch thay thế</span>
            <div className="flex flex-wrap gap-2">
              {content.alternatives.map((alt: string, i: number) => (
                <span key={i} className="text-xs font-medium bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
                  {alt}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderVocabularyResult = (content: any) => {
    const list = Array.isArray(content) ? content : [content]
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Languages className="w-4 h-4 text-[#5D7B6F]" /> Danh sách từ vựng chi tiết ({list.length} từ)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map((wordItem: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-lg font-black text-slate-900">{wordItem.lemma || wordItem.display}</h3>
                    {wordItem.ipa && <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">/{wordItem.ipa}/</span>}
                  </div>
                  {wordItem.display && wordItem.display !== wordItem.lemma && (
                    <span className="text-xs text-slate-400 italic">Hiển thị: {wordItem.display}</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {wordItem.partOfSpeech && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase tracking-wider">
                      {wordItem.partOfSpeech}
                    </span>
                  )}
                  {wordItem.cefrLevel && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#5D7B6F] text-white">
                      {wordItem.cefrLevel}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/80">
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  <strong className="text-[#5D7B6F]">Định nghĩa:</strong> {wordItem.definition}
                </p>
              </div>

              {Array.isArray(wordItem.examples) && wordItem.examples.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Ví dụ minh họa:</span>
                  <ul className="space-y-1">
                    {wordItem.examples.map((ex: string, i: number) => (
                      <li key={i} className="text-xs font-medium text-slate-700 flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[#5D7B6F] font-bold">•</span>
                        <span>{ex}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Synonyms & Antonyms */}
              {(wordItem.synonyms?.length > 0 || wordItem.antonyms?.length > 0) && (
                <div className="flex flex-wrap gap-2 text-[11px] pt-1 border-t border-slate-100">
                  {wordItem.synonyms?.length > 0 && (
                    <span className="text-emerald-700">
                      <strong>Đồng nghĩa:</strong> {wordItem.synonyms.join(', ')}
                    </span>
                  )}
                  {wordItem.antonyms?.length > 0 && (
                    <span className="text-rose-700">
                      <strong>Trái nghĩa:</strong> {wordItem.antonyms.join(', ')}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderGrammarResult = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-6">
        {/* Grammar Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-[#5D7B6F] p-6 rounded-2xl text-white space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-emerald-100">
              {content.cefrLevel ? `Trình độ ${content.cefrLevel}` : 'Điểm Ngữ pháp'}
            </span>
            {content.patternName && <span className="text-xs font-semibold text-emerald-200">{content.patternName}</span>}
          </div>
          <h3 className="text-xl font-black">{content.patternName || grammarTopic}</h3>
          {content.pattern && (
            <div className="bg-black/20 p-3 rounded-xl border border-white/20 font-mono text-sm font-bold text-emerald-200">
              Công thức: {content.pattern}
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Giải thích nguyên lý sử dụng</h4>
          <p className="text-sm font-medium text-slate-800 leading-relaxed">{content.explanation}</p>
        </div>

        {/* Usage Rules */}
        {Array.isArray(content.rules) && content.rules.length > 0 && (
          <div className="bg-emerald-50/30 p-5 rounded-2xl border border-emerald-100 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F]">Quy tắc cốt lõi ({content.rules.length} quy tắc)</h4>
            <div className="space-y-2">
              {content.rules.map((rule: string, i: number) => (
                <div key={i} className="flex items-start gap-2.5 bg-white p-3 rounded-xl border border-emerald-100 text-xs font-medium text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-[#5D7B6F] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 leading-relaxed">{rule}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Example sentences */}
        {Array.isArray(content.examples) && content.examples.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Ví dụ câu áp dụng mẫu ngữ pháp</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {content.examples.map((ex: any, i: number) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-2">
                  <p className="text-sm font-bold text-slate-900">{ex.sentence}</p>
                  <p className="text-xs font-medium text-[#5D7B6F]">{ex.translation}</p>
                  {ex.breakdown && <p className="text-[11px] text-slate-400 italic bg-slate-50 p-2 rounded-lg">{ex.breakdown}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common Mistakes */}
        {Array.isArray(content.commonMistakes) && content.commonMistakes.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Các lỗi thường gặp cần tránh
            </h4>
            <div className="space-y-2">
              {content.commonMistakes.map((m: any, i: number) => (
                <div key={i} className="bg-rose-50/50 p-4 rounded-2xl border border-rose-200/80 space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold line-through">
                    <span>Lỗi:</span> {m.mistake}
                  </div>
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <span>Sửa chuẩn:</span> {m.correction}
                  </div>
                  {m.explanation && <p className="text-slate-600 text-[11px] pt-1 border-t border-rose-100">{m.explanation}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderSentenceResult = (content: any) => {
    const list = Array.isArray(content) ? content : [content]
    return (
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-[#5D7B6F]" /> Danh sách mẫu câu ứng dụng thực tế ({list.length} câu)
        </h4>
        <div className="space-y-3">
          {list.map((item: any, idx: number) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-base font-bold text-slate-900 leading-relaxed">{item.text}</p>
                  <p className="text-sm font-medium text-[#5D7B6F]">{item.translation}</p>
                </div>
                {item.difficulty && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#5D7B6F] border border-emerald-100 shrink-0">
                    {item.difficulty}
                  </span>
                )}
              </div>

              {Array.isArray(item.vocabulary) && item.vocabulary.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  {item.vocabulary.map((v: any, i: number) => (
                    <span key={i} className="text-xs bg-slate-50 text-slate-700 px-2.5 py-1 rounded-xl border border-slate-200">
                      <strong>{v.lemma || v.display}:</strong> {v.definition}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderParagraphResult = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-lg font-black text-slate-900">{content.title || 'Bài đọc hiểu'}</h3>
            {content.wordCount && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{content.wordCount} từ</span>}
          </div>

          <div className="text-base font-medium text-slate-800 leading-relaxed whitespace-pre-line">
            {content.body}
          </div>

          {content.translation && (
            <div className="pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowParagraphTranslation(!showParagraphTranslation)}
                className="text-xs font-bold text-[#5D7B6F] border-emerald-200 rounded-xl"
              >
                {showParagraphTranslation ? 'Ẩn bản dịch Tiếng Việt' : 'Xem bản dịch Tiếng Việt'}
              </Button>

              {showParagraphTranslation && (
                <div className="mt-3 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-sm font-medium text-emerald-950 leading-relaxed animate-in fade-in">
                  {content.translation}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Extracted Vocabulary */}
        {Array.isArray(content.vocabulary) && content.vocabulary.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Từ vựng quan trọng trong bài đọc</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {content.vocabulary.map((v: any, i: number) => (
                <div key={i} className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{v.lemma || v.display}</span>
                    {v.cefrLevel && <span className="text-[10px] font-bold bg-emerald-50 text-[#5D7B6F] px-2 py-0.5 rounded-full">{v.cefrLevel}</span>}
                  </div>
                  <p className="text-xs text-slate-600 leading-tight">{v.definition}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comprehension Quiz */}
        {Array.isArray(content.comprehensionQuestions) && content.comprehensionQuestions.length > 0 && (
          <div className="space-y-4 bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#5D7B6F]" /> Câu hỏi kiểm tra mức độ hiểu bài ({content.comprehensionQuestions.length} câu)
            </h4>
            <div className="space-y-4">
              {content.comprehensionQuestions.map((q: any, qIdx: number) => (
                <div key={qIdx} className="bg-white p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
                  <p className="font-bold text-slate-900 text-sm">{qIdx + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options?.map((opt: string, optIdx: number) => {
                      const selected = paraAnswers[qIdx] === optIdx
                      const isCorrect = q.correctIndex === optIdx
                      let btnStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      if (paraAnswers[qIdx] !== undefined) {
                        if (isCorrect) btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                        else if (selected) btnStyle = 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
                      }
                      return (
                        <button
                          key={optIdx}
                          onClick={() => setParaAnswers({ ...paraAnswers, [qIdx]: optIdx })}
                          className={`w-full text-left p-3 rounded-xl border font-medium transition-all ${btnStyle}`}
                        >
                          {String.fromCharCode(65 + optIdx)}. {opt}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderDialogueResult = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">{content.title || 'Kịch bản Hội thoại Mẫu'}</h3>
            {content.setting && <p className="text-xs text-slate-500 mt-1">Bối cảnh: {content.setting}</p>}
          </div>
          {Array.isArray(content.participants) && content.participants.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {content.participants.map((p: any, i: number) => (
                <span key={i} className="text-xs font-bold bg-emerald-50 text-[#5D7B6F] px-3 py-1 rounded-full border border-emerald-100">
                  {p.name} ({p.role})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Chat Conversation Lines */}
        {Array.isArray(content.lines) && content.lines.length > 0 && (
          <div className="space-y-3">
            {content.lines.map((line: any, idx: number) => {
              const isEven = idx % 2 === 0
              return (
                <div key={idx} className={`flex items-start gap-3 ${isEven ? 'flex-row' : 'flex-row-reverse'}`}>
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-xs ${isEven ? 'bg-[#5D7B6F]' : 'bg-slate-700'}`}>
                    {line.speaker ? line.speaker[0].toUpperCase() : 'A'}
                  </div>
                  <div className={`max-w-xl p-4 rounded-3xl space-y-1.5 shadow-xs border ${isEven ? 'bg-emerald-50/60 border-emerald-100 rounded-tl-none text-slate-800' : 'bg-white border-slate-200 rounded-tr-none text-slate-800'}`}>
                    <span className={`text-[11px] font-bold block ${isEven ? 'text-[#5D7B6F]' : 'text-slate-500'}`}>{line.speaker}</span>
                    <p className="text-sm font-bold text-slate-900 leading-relaxed">{line.text}</p>
                    <p className="text-xs font-medium text-slate-600 border-t border-slate-200/50 pt-1.5">{line.translation}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const renderStoryResult = (content: any) => {
    if (!content) return null
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900">{content.title || 'Truyện ngắn học tập'}</h3>
            {content.wordCount && <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">{content.wordCount} từ</span>}
          </div>

          <div className="text-base font-medium text-slate-800 leading-relaxed whitespace-pre-line">
            {content.body}
          </div>

          {content.moral && (
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 text-xs font-semibold text-amber-900 flex items-start gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-amber-800 uppercase tracking-wider text-[10px]">Bài học rút ra:</strong>
                <span>{content.moral}</span>
              </div>
            </div>
          )}

          {content.translation && (
            <div className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStoryTranslation(!showStoryTranslation)}
                className="text-xs font-bold text-[#5D7B6F] border-emerald-200 rounded-xl"
              >
                {showStoryTranslation ? 'Ẩn dịch nghĩa tiếng Việt' : 'Xem dịch nghĩa tiếng Việt'}
              </Button>
              {showStoryTranslation && (
                <div className="mt-3 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 text-sm font-medium text-emerald-950 leading-relaxed animate-in fade-in">
                  {content.translation}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderFlashcardResult = (content: any) => {
    const cards = Array.isArray(content) ? content : [content]
    if (!cards || cards.length === 0) return null
    const currentCard = cards[flashcardIndex] || cards[0]

    return (
      <div className="space-y-6 max-w-xl mx-auto text-center">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Thẻ {flashcardIndex + 1} / {cards.length}</span>
          {currentCard?.cefrLevel && <span className="bg-emerald-100 text-[#5D7B6F] px-2.5 py-0.5 rounded-full">{currentCard.cefrLevel}</span>}
        </div>

        {/* 3D Flip Card Container */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative min-h-[260px] cursor-pointer bg-white rounded-3xl border-2 border-emerald-200/80 shadow-md p-8 flex flex-col items-center justify-center space-y-4 hover:border-[#5D7B6F] transition-all transform hover:-translate-y-1"
        >
          {!isFlipped ? (
            <div className="space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Mặt trước (Nhấn để lật)</span>
              <h3 className="text-2xl font-black text-slate-900">{currentCard.front}</h3>
              {showHint && currentCard.hint && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200">Gợi ý: {currentCard.hint}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#5D7B6F] block">Mặt sau (Đáp án & Giải thích)</span>
              <h3 className="text-xl font-bold text-emerald-950">{currentCard.back}</h3>
              {currentCard.example && <p className="text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded-xl">Ví dụ: "{currentCard.example}"</p>}
              {currentCard.mnemonic && <p className="text-xs font-medium text-purple-700 bg-purple-50 p-2.5 rounded-xl border border-purple-100">Mẹo nhớ: {currentCard.mnemonic}</p>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            disabled={flashcardIndex === 0}
            onClick={() => {
              setFlashcardIndex(flashcardIndex - 1)
              setIsFlipped(false)
            }}
            className="rounded-xl font-bold text-xs"
          >
            Thẻ trước
          </Button>

          {currentCard?.hint && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHint(!showHint)}
              className="text-xs text-amber-700 hover:bg-amber-50"
            >
              {showHint ? 'Ẩn gợi ý' : 'Xem gợi ý'}
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={flashcardIndex === cards.length - 1}
            onClick={() => {
              setFlashcardIndex(flashcardIndex + 1)
              setIsFlipped(false)
            }}
            className="rounded-xl font-bold text-xs"
          >
            Thẻ tiếp
          </Button>
        </div>
      </div>
    )
  }

  const renderQuizResult = (content: any) => {
    if (!content) return null
    const questions = content.questions || []
    const totalQuestions = questions.length

    const calculateScore = () => {
      let score = 0
      questions.forEach((q: any, idx: number) => {
        const selected = quizAnswers[idx]
        if (selected !== undefined && q.options?.[selected]?.isCorrect) {
          score++
        }
      })
      return score
    }

    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">{content.title || 'Đề trắc nghiệm AI'}</h3>
            {content.description && <p className="text-xs text-slate-500 mt-0.5">{content.description}</p>}
          </div>
          {quizSubmitted && (
            <div className="bg-emerald-100 text-emerald-950 font-black text-sm px-4 py-2 rounded-2xl border border-emerald-300">
              Kết quả: {calculateScore()} / {totalQuestions} câu đúng
            </div>
          )}
        </div>

        <div className="space-y-4">
          {questions.map((q: any, qIdx: number) => (
            <div key={qIdx} className="bg-white p-5 rounded-3xl border border-slate-200/80 space-y-3 shadow-xs">
              <div className="flex items-baseline justify-between">
                <span className="font-bold text-slate-900 text-sm">Câu {qIdx + 1}: {q.text}</span>
                {q.difficulty && <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{q.difficulty}</span>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options?.map((opt: any, optIdx: number) => {
                  const selected = quizAnswers[qIdx] === optIdx
                  const isCorrect = opt.isCorrect
                  let style = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  if (quizSubmitted) {
                    if (isCorrect) style = 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold'
                    else if (selected) style = 'bg-rose-100 border-rose-400 text-rose-900 font-bold'
                  } else if (selected) {
                    style = 'bg-[#5D7B6F] text-white font-bold border-[#5D7B6F]'
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={quizSubmitted}
                      onClick={() => setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx })}
                      className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all ${style}`}
                    >
                      {String.fromCharCode(65 + optIdx)}. {opt.text}
                    </button>
                  )
                })}
              </div>

              {quizSubmitted && q.explanation && (
                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100 text-xs text-[#5D7B6F] space-y-1">
                  <strong className="text-[#5D7B6F] block">Giải thích chi tiết:</strong>
                  <p>{q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {!quizSubmitted && questions.length > 0 && (
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => setQuizSubmitted(true)}
              className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl text-xs font-bold"
            >
              Nộp bài trắc nghiệm
            </Button>
          </div>
        )}
      </div>
    )
  }

  // Update levels options dynamically when targetLanguage changes
  const activeLevelOptions = LEVEL_CONFIG_BY_LANG[targetLanguage] || LEVEL_CONFIG_BY_LANG.English

  useEffect(() => {
    // Reset cefrLevel to first valid level for new language
    if (!activeLevelOptions.some((l) => l.code === cefrLevel)) {
      setCefrLevel(activeLevelOptions[0].code)
    }
  }, [targetLanguage, activeLevelOptions, cefrLevel])

  const handleGenerate = async () => {
    setLoading(true)
    setResultData(null)

    let topicValue = topic
    if (targetLanguage === 'English' && englishTense && englishTense !== 'all') {
      topicValue = `${topic} (Grammar Tense: ${englishTense})`
    }

    let params: Record<string, unknown> = { language: targetLanguage, cefr: cefrLevel }

    if (activeTab === 'vocabulary') {
      params = { language: targetLanguage, topic: topicValue, word: wordInput, cefr: cefrLevel }
    } else if (activeTab === 'grammar') {
      const gTopic = targetLanguage === 'English' && englishTense ? `${grammarTopic} (${englishTense})` : grammarTopic
      params = { language: targetLanguage, topic: gTopic, cefr: cefrLevel }
    } else if (activeTab === 'paragraph') {
      params = { language: targetLanguage, topic: topicValue, cefr: cefrLevel }
    } else if (activeTab === 'dialogue') {
      params = { language: targetLanguage, topic: topicValue, cefr: cefrLevel }
    } else if (activeTab === 'sentence') {
      params = { language: targetLanguage, topic: topicValue, cefr: cefrLevel }
    } else if (activeTab === 'story') {
      params = { language: targetLanguage, theme: topicValue, cefr: cefrLevel }
    } else if (activeTab === 'translation') {
      params = { sourceLanguage, targetLanguage, text: translationText }
    } else if (activeTab === 'flashcard') {
      params = { language: targetLanguage, topic: topicValue, cefr: cefrLevel }
    } else if (activeTab === 'quiz') {
      params = { language: targetLanguage, topic: topicValue, cefr: cefrLevel }
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/ai/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          type: activeTab,
          params,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi sinh nội dung AI')
      } else {
        setResultData(json.data)
        toast.success(json.data.reused ? 'Tái sử dụng tri thức AI sẵn có!' : 'AI đã sinh bài học thành công!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể kết nối tới dịch vụ AI')
    } finally {
      setLoading(false)
    }
  }

  const [savingFlashcard, setSavingFlashcard] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSaveToFlashcard = async () => {
    if (!resultData?.content) return
    setSavingFlashcard(true)

    const content = resultData.content
    let loType: 'vocabulary' | 'sentence' | 'grammar' = 'vocabulary'
    let dataObj: Record<string, unknown> = {}

    if (activeTab === 'vocabulary') {
      loType = 'vocabulary'
      const item = Array.isArray(content) ? content[0] : content
      dataObj = {
        lemma: item?.lemma || wordInput,
        display: item?.display || item?.lemma || wordInput,
        ipa: item?.ipa,
        definition: item?.definition,
        partOfSpeech: item?.partOfSpeech,
        examples: item?.examples,
        cefrLevel: item?.cefrLevel || cefrLevel,
      }
    } else if (activeTab === 'grammar') {
      loType = 'grammar'
      dataObj = {
        pattern: content?.pattern || grammarTopic,
        explanation: content?.explanation || content?.definition,
        examples: content?.examples,
        cefrLevel,
      }
    } else if (activeTab === 'sentence') {
      loType = 'sentence'
      const item = Array.isArray(content) ? content[0] : content
      dataObj = {
        text: item?.text || item?.sentence,
        translation: item?.translation,
        cefrLevel: item?.difficulty || cefrLevel,
      }
    } else if (activeTab === 'translation') {
      loType = 'sentence'
      dataObj = {
        text: content?.sourceText || translationText,
        translation: content?.translatedText,
        cefrLevel,
      }
    } else {
      const item = Array.isArray(content) ? content[0] : content
      loType = item?.text ? 'sentence' : item?.pattern ? 'grammar' : 'vocabulary'
      dataObj = {
        lemma: item?.lemma || item?.word || wordInput,
        text: item?.text || item?.sentence || topic,
        translation: item?.translation,
        definition: item?.definition || item?.explanation,
        cefrLevel,
      }
    }

    try {
      const res = await fetch('/api/v1/learning/save-item', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          loType,
          languageCode: targetLanguage,
          data: dataObj,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi khi lưu vào thẻ ghi nhớ')
      } else {
        setSavedSuccess(true)
        toast.success('Đã lưu vào bộ thẻ Flashcards SRS cá nhân! Bạn có thể bắt đầu ôn tập ngay.')
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu học liệu')
    } finally {
      setSavingFlashcard(false)
    }
  }

  return (
    <DevOnlyGuard featureName="Trợ Lý AI Ngôn Ngữ">
      <div className="min-h-screen bg-slate-50/50 pb-24">
        <div className="w-full space-y-8">
          {/* Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#5D7B6F] to-[#3f574d] p-8 text-white shadow-xl shadow-[#5D7B6F]/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="relative z-10 space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 backdrop-blur-md text-emerald-100 border border-white/20 uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> FQuiz Multi-Language AI Engine
              </span>
            <h1 className="text-3xl font-black tracking-tight">Trợ lý Học tập AI Ngôn ngữ</h1>
            <p className="text-sm text-emerald-100/90 leading-relaxed">
              Tự động khởi tạo từ vựng, phân tích ngữ pháp, kịch bản hội thoại, câu chuyện và đề ôn tập đa ngôn ngữ cá nhân hóa theo các khung trình độ (CEFR, JLPT, HSK, TOPIK).
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <Button asChild variant="outline" className="bg-white/10 hover:bg-white/20 border-white/30 text-white font-bold rounded-2xl text-xs backdrop-blur-md shadow-sm">
              <Link href="/flashcards">
                <Bookmark className="w-4 h-4 mr-2" /> Xem Sổ tay bài học đã lưu
              </Link>
            </Button>
          </div>

          <Bot className="absolute -right-6 -bottom-6 w-56 h-56 text-white/10 pointer-events-none" />
        </div>

        {/* Workspace Container */}
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Tab Selector */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 pb-1">Tính năng AI</span>
            
            <button
              onClick={() => setActiveTab('vocabulary')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'vocabulary'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <Languages className="w-4 h-4 shrink-0" /> Tra Từ vựng AI
            </button>

            <button
              onClick={() => setActiveTab('grammar')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'grammar'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <GraduationCap className="w-4 h-4 shrink-0" /> Phân tích Ngữ pháp
            </button>

            <button
              onClick={() => setActiveTab('sentence')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'sentence'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" /> Mẫu câu ứng dụng
            </button>

            <button
              onClick={() => setActiveTab('paragraph')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'paragraph'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <BookOpen className="w-4 h-4 shrink-0" /> Bài đọc theo Chủ đề
            </button>

            <button
              onClick={() => setActiveTab('dialogue')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'dialogue'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" /> Hội thoại Mẫu
            </button>

            <button
              onClick={() => setActiveTab('story')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'story'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <BookMarked className="w-4 h-4 shrink-0" /> Truyện ngắn học tập
            </button>

            <button
              onClick={() => setActiveTab('translation')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'translation'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <Globe className="w-4 h-4 shrink-0" /> Dịch thuật ngữ cảnh
            </button>

            <button
              onClick={() => setActiveTab('flashcard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'flashcard'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <Layers className="w-4 h-4 shrink-0" /> Thẻ Flashcard AI
            </button>

            <button
              onClick={() => setActiveTab('quiz')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left ${
                activeTab === 'quiz'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              <HelpCircle className="w-4 h-4 shrink-0" /> Trắc nghiệm AI
            </button>
          </div>

          {/* Generator Content */}
          <div className="flex-1 w-full space-y-6">
            <Card className="border-gray-200 shadow-sm rounded-3xl overflow-hidden bg-white">
              <CardHeader className="bg-emerald-50/40 border-b border-gray-100 p-6">
                <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  {activeTab === 'vocabulary' && 'Tạo thẻ Từ vựng & Ví dụ câu'}
                  {activeTab === 'grammar' && 'Phân tích & Giải thích Ngữ pháp'}
                  {activeTab === 'sentence' && 'Sinh Mẫu câu ứng dụng theo chủ đề'}
                  {activeTab === 'paragraph' && 'Sinh Bài đọc hiểu theo Trình độ'}
                  {activeTab === 'dialogue' && 'Tạo Kịch bản Hội thoại Mẫu'}
                  {activeTab === 'story' && 'Tạo Truyện ngắn luyện đọc AI'}
                  {activeTab === 'translation' && 'Dịch thuật & Phân tích cấu trúc câu'}
                  {activeTab === 'flashcard' && 'Tạo bộ Flashcard học từ nhanh'}
                  {activeTab === 'quiz' && 'Sinh bộ Câu hỏi Trắc nghiệm AI'}
                </CardTitle>
                <CardDescription>Nhập thông tin yêu cầu để AI tự động biên soạn học liệu văn bản chuẩn hóa</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                {/* Form fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Language Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {activeTab === 'translation' ? 'Ngôn ngữ Đích' : 'Ngôn ngữ Mục tiêu'}
                    </label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                      <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-slate-200/90 font-bold text-sm bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-xs">
                        <SelectValue placeholder="Chọn ngôn ngữ..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2.5 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {activeTab === 'translation' ? (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Ngôn ngữ Nguồn</label>
                      <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
                        <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-slate-200/90 font-bold text-sm bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-xs">
                          <SelectValue placeholder="Chọn ngôn ngữ nguồn..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2.5 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Trình độ Khung Đánh giá</label>
                      <Select value={cefrLevel} onValueChange={setCefrLevel}>
                        <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-slate-200/90 font-bold text-sm bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-xs">
                          <SelectValue placeholder="Chọn trình độ..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                          {activeLevelOptions.map((lvl) => (
                            <SelectItem key={lvl.code} value={lvl.code} className="rounded-xl font-bold py-2.5 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                              {lvl.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* English Tense Selector (Only when targetLanguage === 'English') */}
                  {targetLanguage === 'English' && activeTab !== 'translation' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Tùy chọn Thì Tiếng Anh (English Tense)
                      </label>
                      <Select value={englishTense} onValueChange={setEnglishTense}>
                        <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-emerald-300/80 font-bold text-sm bg-emerald-50/40 text-slate-800 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-xs">
                          <SelectValue placeholder="Tất cả thì (Tự động)" />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-emerald-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                          {ENGLISH_TENSES.map((t) => (
                            <SelectItem key={t.code || 'all'} value={t.code} className="rounded-xl font-bold py-2.5 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {activeTab === 'vocabulary' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Từ vựng cần tra</label>
                      <Input
                        value={wordInput}
                        onChange={(e) => setWordInput(e.target.value)}
                        placeholder="Ví dụ: Resilient, Sustainable..."
                        className="border-gray-200 focus:border-[#5D7B6F] rounded-xl font-medium"
                      />
                    </div>
                  )}

                  {activeTab === 'grammar' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Chủ đề Ngữ pháp</label>
                      <Input
                        value={grammarTopic}
                        onChange={(e) => setGrammarTopic(e.target.value)}
                        placeholder="Ví dụ: Passive Voice, Subjunctive..."
                        className="border-gray-200 focus:border-[#5D7B6F] rounded-xl font-medium"
                      />
                    </div>
                  )}

                  {activeTab === 'translation' && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Văn bản dịch thuật</label>
                      <textarea
                        value={translationText}
                        onChange={(e) => setTranslationText(e.target.value)}
                        placeholder="Nhập văn bản cần dịch..."
                        rows={3}
                        className="w-full border-2 border-gray-200 focus:border-[#5D7B6F] rounded-xl p-3 text-sm font-medium bg-white outline-none resize-none"
                      />
                    </div>
                  )}

                  {['paragraph', 'dialogue', 'sentence', 'story', 'flashcard', 'quiz'].includes(activeTab) && (
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Chủ đề bài học</label>
                      <Input
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="Ví dụ: Job Interview, Environment, Technology..."
                        className="border-gray-200 focus:border-[#5D7B6F] rounded-xl font-medium"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl text-sm font-bold"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Yêu cầu AI sinh bài học
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Results Display */}
            {resultData && (
              <Card className="border-emerald-200 bg-emerald-50/10 shadow-md rounded-3xl overflow-hidden animate-in fade-in duration-300">
                <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-emerald-100 bg-emerald-100/20 px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#5D7B6F]" />
                    <CardTitle className="text-base font-bold text-gray-800">Kết quả phản hồi từ AI</CardTitle>
                    {resultData.reused && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        <Zap className="w-3 h-3 fill-current" /> Tri thức tái sử dụng
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={savingFlashcard}
                      onClick={handleSaveToFlashcard}
                      className="text-xs font-bold text-[#5D7B6F] border-emerald-300 hover:bg-emerald-100/50 rounded-xl"
                    >
                      {savingFlashcard ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                      ) : savedSuccess ? (
                        <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                      ) : (
                        <Bookmark className="w-3.5 h-3.5 mr-1" />
                      )}
                      {savedSuccess ? 'Đã lưu SRS' : 'Lưu vào Flashcard SRS'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="animate-in fade-in duration-200">
                    {activeTab === 'translation' && renderTranslationResult(resultData.content)}
                    {activeTab === 'vocabulary' && renderVocabularyResult(resultData.content)}
                    {activeTab === 'grammar' && renderGrammarResult(resultData.content)}
                    {activeTab === 'sentence' && renderSentenceResult(resultData.content)}
                    {activeTab === 'paragraph' && renderParagraphResult(resultData.content)}
                    {activeTab === 'dialogue' && renderDialogueResult(resultData.content)}
                    {activeTab === 'story' && renderStoryResult(resultData.content)}
                    {activeTab === 'flashcard' && renderFlashcardResult(resultData.content)}
                    {activeTab === 'quiz' && renderQuizResult(resultData.content)}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
    </DevOnlyGuard>
  )
}
