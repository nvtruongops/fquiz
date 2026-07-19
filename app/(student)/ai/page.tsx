'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shared/ui/card'
import { Skeleton } from '@/components/shared/ui/skeleton'
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
  PenTool,
  CheckCircle2,
  ThumbsUp,
  Edit3,
  ArrowLeft,
  Settings,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'
import { cn } from '@/lib/core/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'
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
  | 'reading'
  | 'translation'
  | 'writing'

type ReadingSubMode =
  | 'sentence'
  | 'paragraph'
  | 'dialogue'
  | 'story'

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

const TEXT_GENRES = [
  { code: 'random', label: 'Ngẫu nhiên / Tự do (Mặc định)' },
  { code: 'informational', label: 'Bài viết thông tin (Informational Text)' },
  { code: 'formal_email', label: 'Email công việc trang trọng (Formal Email)' },
  { code: 'informal_email', label: 'Thư / Chat thân mật (Casual Email/Chat)' },
  { code: 'essay_opinion', label: 'Bài luận nghị luận (Opinion Essay)' },
  { code: 'story_narrative', label: 'Truyện kể & Nhật ký (Narrative Story)' },
  { code: 'news_report', label: 'Bài báo & Tin tức (News Report)' },
  { code: 'descriptive', label: 'Bài văn miêu tả (Descriptive Text)' },
]

const COMMON_TOPICS = [
  { code: 'random', label: 'Ngẫu nhiên / Tự do (Mặc định)' },
  { code: 'Travel & Tourism', label: 'Du lịch & Lữ hành (Travel & Tourism)' },
  { code: 'Business & Career', label: 'Kinh doanh & Sự nghiệp (Business & Career)' },
  { code: 'Technology & AI', label: 'Công nghệ & Trí tuệ nhân tạo (Technology & AI)' },
  { code: 'Daily Life & Routine', label: 'Đời sống hàng ngày (Daily Life)' },
  { code: 'Education & Learning', label: 'Giáo dục & Học tập (Education)' },
  { code: 'Health & Wellness', label: 'Sức khỏe & Đời sống (Health)' },
  { code: 'Arts & Culture', label: 'Nghệ thuật & Văn hóa (Arts & Culture)' },
  { code: 'Sports & Entertainment', label: 'Thể thao & Giải trí (Sports & Entertainment)' },
  { code: 'Social Issues', label: 'Vấn đề xã hội (Social Issues)' },
  { code: 'custom', label: 'Tự nhập chủ đề tùy chỉnh...' },
]

export default function StudentAIAssistantPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<AIFeatureType>('vocabulary')
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const [readingSubMode, setReadingSubMode] = useState<ReadingSubMode>('sentence')
  const [explanationLanguage, setExplanationLanguage] = useState('Vietnamese')
  const [loading, setLoading] = useState(false)
  // Input states
  const [targetLanguage, setTargetLanguage] = useState('English')
  const [sourceLanguage, setSourceLanguage] = useState('Vietnamese')
  const [topic, setTopic] = useState('')
  const [selectedTopicSlug, setSelectedTopicSlug] = useState('random')
  const [customTopicInput, setCustomTopicInput] = useState('')
  const [textGenre, setTextGenre] = useState('random')
  const [situationalContext, setSituationalContext] = useState('')
  const [cefrLevel, setCefrLevel] = useState('B1')
  const [englishTense, setEnglishTense] = useState('all')
  const [wordInput, setWordInput] = useState('')
  const [grammarTopic, setGrammarTopic] = useState('Present Perfect vs Past Simple')
  const [translationText, setTranslationText] = useState('Xin chào, tôi muốn học ngôn ngữ mới cùng trợ lý AI.')

  // Result cache — preserves data per tab so switching back shows instantly
  const [resultCache, setResultCache] = useState<Map<string, any>>(new Map())
  const activeCacheKey = activeTab === 'reading' ? `reading:${readingSubMode}` : activeTab
  const currentResult = resultCache.get(activeCacheKey)

  // View mode state: config (Form) or result (AI output display)
  const [viewMode, setViewMode] = useState<'config' | 'result'>('config')

  // Automatically update viewMode when switching tab/submode based on cache presence
  useEffect(() => {
    const key = activeTab === 'reading' ? `reading:${readingSubMode}` : activeTab
    setViewMode(resultCache.has(key) ? 'result' : 'config')
  }, [activeTab, readingSubMode, resultCache])

  // UI states for interactive features
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [paraAnswers, setParaAnswers] = useState<Record<number, number>>({})
  const [showParagraphTranslation, setShowParagraphTranslation] = useState(false)
  const [showStoryTranslation, setShowStoryTranslation] = useState(false)

  const [writingWordCount, setWritingWordCount] = useState<number | string>(100)
  const [writingSubTab, setWritingSubTab] = useState<'config' | 'workspace' | 'eval'>('config')
  const [userSubmissionLanguage, setUserSubmissionLanguage] = useState('Vietnamese')
  const [userWritingInput, setUserWritingInput] = useState('')
  const [evaluatingWriting, setEvaluatingWriting] = useState(false)
  const [writingEvalResult, setWritingEvalResult] = useState<any>(null)
  const [savingVocabIds, setSavingVocabIds] = useState<Record<string, boolean>>({})
  const [savedVocabIds, setSavedVocabIds] = useState<Record<string, boolean>>({})

  // Auto-set user submission language default to match targetLanguage / explanationLanguage
  useEffect(() => {
    if (currentResult?.targetLanguage) {
      setUserSubmissionLanguage(currentResult.targetLanguage)
    } else {
      setUserSubmissionLanguage(explanationLanguage || targetLanguage)
    }
  }, [currentResult, explanationLanguage, targetLanguage])

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
    setUserWritingInput('')
    setWritingEvalResult(null)
    setSavedSuccess(false)
  }, [currentResult, activeTab])

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
            <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs space-y-2 relative overflow-hidden">
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
                <div className="flex items-center gap-1.5">
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={savingVocabIds[wordItem.lemma || `word-${idx}`]}
                    onClick={() => handleSaveSingleVocabulary(wordItem, idx)}
                    className="h-7 w-7 p-0 rounded-lg hover:bg-emerald-50 text-[#5D7B6F] shrink-0"
                    title="Lưu từ vựng này vào Flashcard SRS"
                  >
                    {savingVocabIds[wordItem.lemma || `word-${idx}`] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : savedVocabIds[wordItem.lemma || `word-${idx}`] ? (
                      <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50" />
                    ) : (
                      <Bookmark className="w-3.5 h-3.5 text-slate-400 hover:text-[#5D7B6F]" />
                    )}
                  </Button>
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

  const handleEvaluateWriting = async () => {
    if (!currentResult?.content || !userWritingInput.trim()) return
    setEvaluatingWriting(true)
    const exercise = currentResult.content

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/ai/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          type: 'writing_eval',
          params: {
            sourceText: exercise.sourceText,
            sourceLanguage: exercise.sourceLanguage || explanationLanguage || 'Vietnamese',
            userAnswer: userWritingInput,
            userLanguage: userSubmissionLanguage || exercise.targetLanguage || targetLanguage,
            sampleAnswer: exercise.sampleAnswer,
            cefrLevel: exercise.cefrLevel || cefrLevel,
            explanationLanguage: explanationLanguage || 'Vietnamese',
          },
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi khi AI đánh giá bài viết')
      } else {
        setWritingEvalResult(json.data.content)
        setWritingSubTab('eval')
        toast.success('AI đã chấm điểm & nhận xét bài viết thành công!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể kết nối dịch vụ AI chấm điểm')
    } finally {
      setEvaluatingWriting(false)
    }
  }

  const renderWritingWorkspace = (content: any) => {
    if (!content) {
      return (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Chưa có văn bản bài đọc / đề bài nào</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy sang <strong>Tab Cấu hình bài tập</strong> để yêu cầu AI tự động biên soạn văn bản học liệu theo trình độ của bạn.
          </p>
          <Button
            onClick={() => setWritingSubTab('config')}
            className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl text-xs font-bold text-white px-5 h-9"
          >
            Đi tới Cấu hình bài tập
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        {/* Exercise Header Card */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <h3 className="text-lg font-black text-slate-900">{content.title || 'Đề Luyện Viết AI'}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-[#5D7B6F] border border-emerald-100">
                Level {content.cefrLevel || cefrLevel}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                {content.sourceLanguage} {'->'} {content.targetLanguage}
              </span>
            </div>
          </div>

          {/* Source Text / Passage */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Văn bản gốc / Đề bài ({content.sourceLanguage})
            </span>
            <p className="text-base font-bold text-slate-800 leading-relaxed whitespace-pre-line">
              {content.sourceText}
            </p>
          </div>
        </div>

        {/* User Submission Textarea — SPACIOUS */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-[#5D7B6F]" /> Bài làm của bạn ({userSubmissionLanguage || content.targetLanguage})
            </label>
            <span className="text-[11px] font-bold text-slate-400">
              {userWritingInput.trim() ? userWritingInput.trim().split(/\s+/).filter(Boolean).length : 0} từ đã viết
            </span>
          </div>

          <textarea
            value={userWritingInput}
            onChange={(e) => setUserWritingInput(e.target.value)}
            placeholder={'Nhập bài viết hoặc bài dịch của bạn bằng ' + (userSubmissionLanguage || content.targetLanguage) + ' tại đây...'}
            rows={10}
            className="w-full border-2 border-slate-200 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 rounded-2xl p-5 text-base font-medium bg-slate-50/50 outline-none resize-y leading-relaxed text-slate-900 min-h-[240px]"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Ngôn ngữ Giải thích / Dịch nghĩa:</span>
              <Select value={explanationLanguage} onValueChange={setExplanationLanguage}>
                <SelectTrigger className="h-10 w-44 rounded-xl border-2 border-slate-200/90 font-bold text-xs bg-white text-slate-800 focus:border-[#5D7B6F]">
                  <SelectValue placeholder="Chọn ngôn ngữ..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-sm shadow-xl p-1.5 z-50">
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50">
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              onClick={handleEvaluateWriting}
              disabled={evaluatingWriting || !userWritingInput.trim()}
              className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 py-3 rounded-xl text-xs font-bold text-white ml-auto"
            >
              {evaluatingWriting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Nộp bài & AI Đánh giá
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const renderWritingEvalResult = () => {
    if (!writingEvalResult) {
      return (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 text-center space-y-3 shadow-xs">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">Chưa có kết quả đánh giá từ AI</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Hãy sang <strong>Tab Văn bản & Bài làm</strong> để hoàn thành bài viết của bạn và nhấn nút "Nộp bài & AI Đánh giá".
          </p>
          <Button
            onClick={() => setWritingSubTab('workspace')}
            className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl text-xs font-bold text-white px-5 h-9"
          >
            Đi tới Văn bản & Bài làm
          </Button>
        </div>
      )
    }

    return (
      <div className="bg-white p-6 rounded-3xl border-2 border-emerald-300 shadow-lg space-y-6 animate-in fade-in duration-300">
        {/* Score & Rating Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-800 to-[#5D7B6F] text-white shadow-md">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 block">Kết quả Đánh giá AI</span>
            <h4 className="text-xl font-black">{writingEvalResult.rating}</h4>
            <p className="text-xs text-emerald-100/90 leading-relaxed">{writingEvalResult.detailedFeedback}</p>
          </div>
          <div className="shrink-0 flex items-center justify-center bg-white text-[#5D7B6F] w-20 h-20 rounded-2xl shadow-md border-2 border-emerald-100 flex-col">
            <span className="text-2xl font-black leading-none">{writingEvalResult.score}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-0.5">/ 100 điểm</span>
          </div>
        </div>

        {writingEvalResult.suggestedAnswer && (
          <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#5D7B6F]" /> Phiên bản đề xuất chỉnh sửa tối ưu hơn
            </span>
            <p className="text-sm font-bold text-emerald-950 leading-relaxed whitespace-pre-line">{writingEvalResult.suggestedAnswer}</p>
          </div>
        )}

        {Array.isArray(writingEvalResult.corrections) && writingEvalResult.corrections.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> Chi tiết các điểm cần sửa ({writingEvalResult.corrections.length} vị trí)
            </h4>
            <div className="space-y-2.5">
              {writingEvalResult.corrections.map((corr: any, idx: number) => (
                <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-100 line-through">{corr.original}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">{'->'} {corr.corrected}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">{corr.type}</span>
                  </div>
                  <p className="text-slate-600 font-medium leading-relaxed">{corr.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.isArray(writingEvalResult.strengths) && writingEvalResult.strengths.length > 0 && (
            <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5D7B6F] flex items-center gap-1.5">
                <ThumbsUp className="w-4 h-4 text-[#5D7B6F]" /> Điểm mạnh bài làm
              </span>
              <ul className="space-y-1 text-xs text-slate-700 font-medium">
                {writingEvalResult.strengths.map((s: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-[#5D7B6F] font-bold">{'•'}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(writingEvalResult.improvements) && writingEvalResult.improvements.length > 0 && (
            <div className="bg-amber-50/40 p-4 rounded-2xl border border-amber-100 space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" /> Điểm cần cải thiện
              </span>
              <ul className="space-y-1 text-xs text-slate-700 font-medium">
                {writingEvalResult.improvements.map((imp: string, i: number) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">{'•'}</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={() => setWritingSubTab('workspace')}
            className="rounded-xl font-bold text-xs text-slate-700 border-slate-200 hover:bg-slate-100"
          >
            <Edit3 className="w-4 h-4 mr-1.5" /> Chỉnh sửa & Nộp lại
          </Button>
          <Button
            type="button"
            onClick={() => setWritingSubTab('config')}
            className="bg-[#5D7B6F] hover:bg-[#4a6358] rounded-xl font-bold text-xs text-white"
          >
            <Settings className="w-4 h-4 mr-1.5" /> Tạo bài học mới
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

    // Calculate topic value based on selectedTopicSlug
    let topicValue = ''
    if (selectedTopicSlug === 'custom') {
      topicValue = customTopicInput
    } else if (selectedTopicSlug !== 'random') {
      topicValue = selectedTopicSlug
    }

    if (targetLanguage === 'English' && englishTense && englishTense !== 'all' && topicValue) {
      topicValue = `${topicValue} (Grammar Tense: ${englishTense})`
    }

    const promptType = activeTab === 'reading' ? readingSubMode : activeTab
    const genreValue = textGenre === 'random' ? '' : textGenre

    let params: Record<string, unknown> = { 
      language: targetLanguage, 
      cefr: cefrLevel,
      explanationLanguage,
      context: situationalContext
    }

    if (promptType === 'vocabulary') {
      params = { ...params, topic: topicValue, word: wordInput, count: 2 }
    } else if (promptType === 'grammar') {
      const gTopic = targetLanguage === 'English' && englishTense ? `${grammarTopic} (${englishTense})` : grammarTopic
      params = { ...params, topic: gTopic }
    } else if (promptType === 'paragraph') {
      params = { ...params, topic: topicValue, genre: genreValue }
    } else if (promptType === 'dialogue') {
      params = { ...params, topic: topicValue, genre: genreValue }
    } else if (promptType === 'sentence') {
      params = { ...params, topic: topicValue }
    } else if (promptType === 'story') {
      params = { ...params, theme: topicValue, genre: genreValue }
    } else if (promptType === 'translation') {
      params = { sourceLanguage, targetLanguage, text: translationText }
    } else if (promptType === 'writing') {
      params = {
        ...params,
        topic: topicValue,
        genre: genreValue,
        wordCount: Math.min(500, Math.max(20, Number(writingWordCount) || 100)),
      }
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/ai/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          type: promptType,
          params,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi sinh nội dung AI')
      } else {
        setResultCache(prev => new Map(prev).set(activeCacheKey, json.data))
        if (activeTab === 'writing') {
          setWritingSubTab('workspace')
        }
        setViewMode('result')
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
    if (!currentResult?.content) return
    setSavingFlashcard(true)

    const content = currentResult.content
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
    } else if (activeTab === 'reading' && readingSubMode === 'sentence') {
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

  const handleSaveSingleVocabulary = async (wordItem: any, index: number) => {
    const vocabKey = wordItem.lemma || `word-${index}`
    setSavingVocabIds(prev => ({ ...prev, [vocabKey]: true }))

    const dataObj = {
      lemma: wordItem?.lemma || wordInput,
      display: wordItem?.display || wordItem?.lemma || wordInput,
      ipa: wordItem?.ipa,
      definition: wordItem?.definition,
      partOfSpeech: wordItem?.partOfSpeech,
      examples: wordItem?.examples,
      cefrLevel: wordItem?.cefrLevel || cefrLevel,
    }

    try {
      const res = await fetch('/api/v1/learning/save-item', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          loType: 'vocabulary',
          languageCode: targetLanguage,
          data: dataObj,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi khi lưu vào thẻ ghi nhớ')
      } else {
        setSavedVocabIds(prev => ({ ...prev, [vocabKey]: true }))
        toast.success(`Đã lưu từ vựng "${wordItem.lemma}" vào bộ thẻ Flashcards SRS!`)
        setTimeout(() => {
          setSavedVocabIds(prev => ({ ...prev, [vocabKey]: false }))
        }, 3000)
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể lưu học liệu')
    } finally {
      setSavingVocabIds(prev => ({ ...prev, [vocabKey]: false }))
    }
  }

  const handleBackToConfig = () => {
    setResultCache(prev => {
      const next = new Map(prev)
      next.delete(activeCacheKey)
      return next
    })
    setViewMode('config')
  }

  return (
    <DevOnlyGuard featureName="Trợ Lý AI Ngôn Ngữ">
      <div className="h-full w-full bg-slate-50/50 flex flex-col p-2 sm:p-4 pt-0 sm:pt-0 overflow-hidden">
        <div className="flex-1 w-full min-h-0 flex flex-col md:flex-row gap-3 md:gap-6 items-stretch overflow-hidden">
          {/* Desktop Tab Selector Sidebar */}
          <div className="hidden md:flex w-64 shrink-0 flex-col gap-2 h-full overflow-y-auto pr-1">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2 pb-1 shrink-0">Tính năng AI</span>
            
            <button
              onClick={() => setActiveTab('vocabulary')}
              className={`w-full flex items-center px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left shrink-0 cursor-pointer ${
                activeTab === 'vocabulary'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              Tra Từ vựng AI
            </button>

            <button
              onClick={() => setActiveTab('grammar')}
              className={`w-full flex items-center px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left shrink-0 cursor-pointer ${
                activeTab === 'grammar'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              Phân tích Ngữ pháp
            </button>

            <button
              onClick={() => setActiveTab('reading')}
              className={`w-full flex items-center px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left shrink-0 cursor-pointer ${
                activeTab === 'reading'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              Đọc hiểu & Ngữ cảnh
            </button>

            <button
              onClick={() => setActiveTab('translation')}
              className={`w-full flex items-center px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left shrink-0 cursor-pointer ${
                activeTab === 'translation'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              Dịch thuật ngữ cảnh
            </button>

            <button
              onClick={() => setActiveTab('writing')}
              className={`w-full flex items-center px-4 py-3 rounded-2xl font-semibold transition-all text-sm text-left shrink-0 cursor-pointer ${
                activeTab === 'writing'
                  ? 'bg-[#5D7B6F] text-white shadow-md shadow-[#5D7B6F]/20'
                  : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#5D7B6F] border border-gray-100'
              }`}
            >
              Luyện viết & Đánh giá AI
            </button>
          </div>

          {/* Mobile AI Feature Dropdown Selector Menu */}
          <div className="relative md:hidden shrink-0 w-full mb-2 z-30">
            <button
              type="button"
              onClick={() => setMobileDropdownOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#5D7B6F] text-white rounded-2xl font-black text-xs shadow-md border border-[#5D7B6F]/40 cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="truncate uppercase tracking-wider">
                  {activeTab === 'vocabulary' && 'Tra Từ vựng AI'}
                  {activeTab === 'grammar' && 'Phân tích Ngữ pháp'}
                  {activeTab === 'reading' && 'Đọc hiểu & Ngữ cảnh'}
                  {activeTab === 'translation' && 'Dịch thuật ngữ cảnh'}
                  {activeTab === 'writing' && 'Luyện viết & Đánh giá AI'}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0 bg-white/20 px-2.5 py-1 rounded-xl text-[10px] font-extrabold">
                <span>Đổi tính năng</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", mobileDropdownOpen && "rotate-180")} />
              </div>
            </button>

            {/* Dropdown Menu Modal */}
            <AnimatePresence>
              {mobileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl rounded-2xl p-2 shadow-2xl border border-slate-200 space-y-1 z-50"
                >
                  <button
                    type="button"
                    onClick={() => { setActiveTab('vocabulary'); setMobileDropdownOpen(false) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer",
                      activeTab === 'vocabulary' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Tra Từ vựng AI</span>
                    {activeTab === 'vocabulary' && <CheckCircle2 className="w-4 h-4 text-[#5D7B6F]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('grammar'); setMobileDropdownOpen(false) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer",
                      activeTab === 'grammar' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Phân tích Ngữ pháp</span>
                    {activeTab === 'grammar' && <CheckCircle2 className="w-4 h-4 text-[#5D7B6F]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('reading'); setMobileDropdownOpen(false) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer",
                      activeTab === 'reading' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Đọc hiểu & Ngữ cảnh</span>
                    {activeTab === 'reading' && <CheckCircle2 className="w-4 h-4 text-[#5D7B6F]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('translation'); setMobileDropdownOpen(false) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer",
                      activeTab === 'translation' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Dịch thuật ngữ cảnh</span>
                    {activeTab === 'translation' && <CheckCircle2 className="w-4 h-4 text-[#5D7B6F]" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setActiveTab('writing'); setMobileDropdownOpen(false) }}
                    className={cn(
                      "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all text-left cursor-pointer",
                      activeTab === 'writing' ? "bg-[#5D7B6F]/10 text-[#5D7B6F]" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <span>Luyện viết & Đánh giá AI</span>
                    {activeTab === 'writing' && <CheckCircle2 className="w-4 h-4 text-[#5D7B6F]" />}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Generator Content */}
          <div className="flex-1 min-h-0 w-full flex flex-col overflow-y-auto pr-1 pb-6">
            {/* Writing Mode 3-Sub-Tabs Navigation Bar */}
            {activeTab === 'writing' && (
              <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-xs mb-3 shrink-0">
                <div className="grid grid-cols-3 gap-1 w-full">
                  <button
                    type="button"
                    onClick={() => setWritingSubTab('config')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold sm:text-xs transition-all flex items-center justify-center text-center whitespace-nowrap cursor-pointer ${
                      writingSubTab === 'config'
                        ? 'bg-[#5D7B6F] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Cấu hình
                  </button>

                  <button
                    type="button"
                    onClick={() => setWritingSubTab('workspace')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold sm:text-xs transition-all flex items-center justify-center gap-1 text-center whitespace-nowrap cursor-pointer ${
                      writingSubTab === 'workspace'
                        ? 'bg-[#5D7B6F] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Bài làm</span>
                    {currentResult && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWritingSubTab('eval')}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-bold sm:text-xs transition-all flex items-center justify-center gap-1 text-center whitespace-nowrap cursor-pointer ${
                      writingSubTab === 'eval'
                        ? 'bg-[#5D7B6F] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Đánh giá AI</span>
                    {writingEvalResult && (
                      <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded-full shrink-0">
                        {writingEvalResult.score}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'writing' ? (
              <>
                {writingSubTab === 'config' && (
                  <Card className="border-gray-200 shadow-sm rounded-3xl overflow-hidden bg-white shrink-0">
                    <CardHeader className="bg-emerald-50/40 border-b border-gray-100 p-4 px-6 shrink-0">
                      <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        Luyện Viết & AI Đánh giá bài làm
                      </CardTitle>
                      <CardDescription className="text-xs">Nhập thông tin yêu cầu để AI tự động biên soạn học liệu văn bản chuẩn hóa</CardDescription>
                    </CardHeader>
                    <CardContent className="p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {/* Language Selector */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              Ngôn ngữ AI sinh ra
                            </label>
                            <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                              <SelectTrigger className="w-full h-10 rounded-xl border-2 border-slate-200/90 font-bold text-xs bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-2 focus:ring-[#5D7B6F]/10 shadow-xs">
                                <SelectValue placeholder="Chọn ngôn ngữ..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                                {LANGUAGES.map((lang) => (
                                  <SelectItem key={lang.code} value={lang.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                                    {lang.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Số lượng từ cho Luyện viết */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              Số lượng từ (Tối đa 500 từ)
                            </label>
                            <Input
                              type="number"
                              min={20}
                              max={500}
                              value={writingWordCount}
                              onChange={(e) => {
                                const val = e.target.value
                                if (val === '') {
                                  setWritingWordCount('')
                                  return
                                }
                                const num = Number(val)
                                if (!isNaN(num)) {
                                  setWritingWordCount(num)
                                }
                              }}
                              onBlur={() => {
                                const num = Number(writingWordCount)
                                if (!writingWordCount || isNaN(num) || num < 20) {
                                  setWritingWordCount(20)
                                } else if (num > 500) {
                                  setWritingWordCount(500)
                                }
                              }}
                              className="border-slate-200 focus:border-[#5D7B6F] rounded-xl h-10 font-bold text-xs bg-white"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              Trình độ Khung Đánh giá
                            </label>
                            <Select value={cefrLevel} onValueChange={setCefrLevel}>
                              <SelectTrigger className="w-full h-10 rounded-xl border-2 border-slate-200/90 font-bold text-xs bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-2 focus:ring-[#5D7B6F]/10 shadow-xs">
                                <SelectValue placeholder="Chọn trình độ..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                                {activeLevelOptions.map((lvl) => (
                                  <SelectItem key={lvl.code} value={lvl.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                                    {lvl.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* English Tense Selector */}
                          {targetLanguage === 'English' && (
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                Tùy chọn Thì Tiếng Anh (English Tense)
                              </label>
                              <Select value={englishTense} onValueChange={setEnglishTense}>
                                <SelectTrigger className="w-full h-10 rounded-xl border-2 border-emerald-300/80 font-bold text-xs bg-emerald-50/40 text-slate-800 focus:border-[#5D7B6F] focus:ring-2 focus:ring-[#5D7B6F]/10 shadow-xs">
                                  <SelectValue placeholder="Tất cả thì (Tự động)" />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl border-emerald-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50">
                                  {ENGLISH_TENSES.map((t) => (
                                    <SelectItem key={t.code || 'all'} value={t.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                                      {t.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              Chủ đề bài học
                            </label>
                            <Select
                              value={selectedTopicSlug}
                              onValueChange={(val) => {
                                setSelectedTopicSlug(val)
                              }}
                            >
                              <SelectTrigger className="w-full h-10 rounded-xl border-2 border-slate-200/90 font-bold text-xs bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-2 focus:ring-[#5D7B6F]/10 shadow-xs">
                                <SelectValue placeholder="Chọn chủ đề..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 max-h-72">
                                {COMMON_TOPICS.map((t) => (
                                  <SelectItem
                                    key={t.code}
                                    value={t.code}
                                    className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]"
                                  >
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {selectedTopicSlug === 'custom' && (
                            <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                              <label className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                                Nhập chủ đề tùy chỉnh của bạn
                              </label>
                              <Input
                                value={customTopicInput}
                                onChange={(e) => setCustomTopicInput(e.target.value)}
                                placeholder="Ví dụ: Công nghệ AI, Bảo vệ môi trường, Du lịch Nhật Bản..."
                                className="border-emerald-300 focus:border-[#5D7B6F] rounded-xl h-10 font-bold text-xs bg-emerald-50/20"
                              />
                            </div>
                          )}

                          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              Thể loại văn bản & Cách viết
                            </label>
                            <Select value={textGenre} onValueChange={setTextGenre}>
                              <SelectTrigger className="w-full h-10 rounded-xl border-2 border-slate-200/90 font-bold text-xs bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-2 focus:ring-[#5D7B6F]/10 shadow-xs">
                                <SelectValue placeholder="Chọn thể loại văn bản..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 max-h-72">
                                {TEXT_GENRES.map((g) => (
                                  <SelectItem key={g.code} value={g.code} className="rounded-xl font-bold py-2 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                                    {g.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                              Bối cảnh / Tình huống cụ thể (Tùy chọn bổ sung)
                            </label>
                            <Input
                              value={situationalContext}
                              onChange={(e) => setSituationalContext(e.target.value)}
                              placeholder="VD: Khi bị quá cước hành lý tại sân bay, Thư xin nghỉ phép 2 ngày..."
                              className="border-slate-200 focus:border-[#5D7B6F] rounded-xl h-10 font-bold text-xs bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex justify-end">
                        <Button
                          onClick={handleGenerate}
                          disabled={loading}
                          className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl text-xs font-bold h-10"
                        >
                          {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                          Yêu cầu AI sinh bài học
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {writingSubTab === 'workspace' && renderWritingWorkspace(currentResult?.content)}
                {writingSubTab === 'eval' && renderWritingEvalResult()}
              </>
            ) : (
              viewMode === 'config' ? (
                <Card className="border-gray-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                  <CardHeader className="bg-emerald-50/40 border-b border-gray-100 p-5 shrink-0">
                    <CardTitle className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      {activeTab === 'vocabulary' && 'Tạo thẻ Từ vựng & Ví dụ câu'}
                      {activeTab === 'grammar' && 'Phân tích & Giải thích Ngữ pháp'}
                      {activeTab === 'reading' && 'Đọc hiểu & Biên soạn Ngữ cảnh'}
                      {activeTab === 'translation' && 'Dịch thuật & Phân tích cấu trúc câu'}
                    </CardTitle>
                    <CardDescription>Nhập thông tin yêu cầu để AI tự động biên soạn học liệu văn bản chuẩn hóa</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 flex flex-col justify-between space-y-5">
                    <div className="space-y-5">
                      {/* Reading Sub-modes selector */}
                      {activeTab === 'reading' && (
                        <div className="space-y-1 mb-2">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                            Chọn dạng bài đọc hiểu
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                              { id: 'sentence', label: 'Mẫu câu ứng dụng' },
                              { id: 'paragraph', label: 'Bài đọc theo chủ đề' },
                              { id: 'dialogue', label: 'Hội thoại mẫu' },
                              { id: 'story', label: 'Truyện ngắn học tập' },
                            ].map((mode) => {
                              const isSelected = readingSubMode === mode.id
                              return (
                                <button
                                  key={mode.id}
                                  type="button"
                                  onClick={() => setReadingSubMode(mode.id as ReadingSubMode)}
                                  className={`flex items-center justify-center px-2 py-1.5 rounded-lg border text-[11px] font-bold transition-all text-center ${
                                    isSelected
                                      ? 'bg-[#5D7B6F] text-white border-[#5D7B6F] shadow-xs'
                                      : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                                  }`}
                                >
                                  <span>{mode.label}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

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
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Ngôn ngữ Giải thích / Dịch nghĩa
                              </label>
                              <Select value={explanationLanguage} onValueChange={setExplanationLanguage}>
                                <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-slate-200/90 font-bold text-sm bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-xs">
                                  <SelectValue placeholder="Chọn ngôn ngữ giải thích..." />
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

                            <div className="space-y-2">
                              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Trình độ Khung Đánh giá
                              </label>
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
                          </>
                        )}

                        {/* English Tense Selector */}
                        {targetLanguage === 'English' && activeTab !== 'translation' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Tùy chọn Thì Tiếng Anh (English Tense)
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

                        {activeTab === 'grammar' && (
                          <div className="space-y-2">
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
                              placeholder="Nhập hoặc dán đoạn văn bản cần dịch..."
                              rows={4}
                              className="w-full border-2 border-slate-200 focus:border-[#5D7B6F] rounded-2xl p-4 text-sm font-medium bg-white outline-none resize-none shadow-xs"
                            />
                          </div>
                        )}

                        {/* Domain Topic Selector — Available for ALL tabs EXCEPT translation */}
                        {activeTab !== 'translation' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                              Chủ đề bài học
                            </label>
                            <Select
                              value={selectedTopicSlug}
                              onValueChange={(val) => {
                                setSelectedTopicSlug(val)
                              }}
                            >
                              <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-slate-200/90 font-bold text-sm bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-xs">
                                <SelectValue placeholder="Chọn chủ đề..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 max-h-72">
                                {COMMON_TOPICS.map((t) => (
                                  <SelectItem
                                    key={t.code}
                                    value={t.code}
                                    className="rounded-xl font-bold py-2.5 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]"
                                  >
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {activeTab !== 'translation' && selectedTopicSlug === 'custom' && (
                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                              Nhập chủ đề tùy chỉnh của bạn
                            </label>
                            <Input
                              value={customTopicInput}
                              onChange={(e) => setCustomTopicInput(e.target.value)}
                              placeholder="Ví dụ: Công nghệ AI, Bảo vệ môi trường, Du lịch Nhật Bản..."
                              className="border-emerald-300 focus:border-[#5D7B6F] rounded-2xl h-12 font-bold text-sm bg-emerald-50/20"
                            />
                          </div>
                        )}

                        {/* Text Genre selector */}
                        {activeTab === 'reading' && (readingSubMode === 'paragraph' || readingSubMode === 'dialogue' || readingSubMode === 'story') && (
                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                              Thể loại văn bản & Cách viết
                            </label>
                            <Select value={textGenre} onValueChange={setTextGenre}>
                              <SelectTrigger className="w-full h-12 rounded-2xl border-2 border-slate-200/90 font-bold text-sm bg-white text-slate-800 focus:border-[#5D7B6F] focus:ring-4 focus:ring-[#5D7B6F]/10 shadow-xs">
                                <SelectValue placeholder="Chọn thể loại văn bản..." />
                              </SelectTrigger>
                              <SelectContent className="rounded-2xl border-slate-200 bg-white/95 backdrop-blur-xl shadow-2xl p-1.5 z-50 max-h-72">
                                {TEXT_GENRES.map((g) => (
                                  <SelectItem key={g.code} value={g.code} className="rounded-xl font-bold py-2.5 cursor-pointer hover:bg-emerald-50 focus:bg-emerald-50 focus:text-[#5D7B6F]">
                                    {g.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {activeTab === 'reading' && (readingSubMode === 'paragraph' || readingSubMode === 'dialogue' || readingSubMode === 'story') && (
                          <div className="space-y-2 sm:col-span-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-500">
                              Bối cảnh / Tình huống cụ thể (Tùy chọn bổ sung)
                            </label>
                            <Input
                              value={situationalContext}
                              onChange={(e) => setSituationalContext(e.target.value)}
                              placeholder="VD: Khi bị quá cước hành lý tại sân bay, Thư xin nghỉ phép 2 ngày..."
                              className="border-slate-200 focus:border-[#5D7B6F] rounded-2xl h-12 font-bold text-sm bg-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 pt-4 border-t border-slate-100 flex justify-end">
                      <Button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="bg-[#5D7B6F] hover:bg-[#4a6358] shadow-md px-6 rounded-xl text-sm font-bold h-11"
                      >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                        Yêu cầu AI sinh bài học
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Results Display for other tabs */
                currentResult && (
                  <Card className="border-emerald-200 bg-emerald-50/10 shadow-md rounded-3xl overflow-hidden h-full flex flex-col animate-in fade-in duration-300">
                    <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-emerald-100 bg-emerald-100/20 px-6 py-4 shrink-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#5D7B6F]" />
                        <CardTitle className="text-base font-bold text-gray-800">Kết quả phản hồi từ AI</CardTitle>
                        {currentResult.reused && (
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
                          onClick={handleBackToConfig}
                          className="text-xs font-bold text-slate-600 border-slate-300 hover:bg-slate-100 rounded-xl"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Cấu hình mới
                        </Button>
                        {activeTab !== 'vocabulary' && (
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
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="animate-in fade-in duration-200">
                        {activeTab === 'translation' && renderTranslationResult(currentResult.content)}
                        {activeTab === 'vocabulary' && renderVocabularyResult(currentResult.content)}
                        {activeTab === 'grammar' && renderGrammarResult(currentResult.content)}
                        {activeTab === 'reading' && (
                          <>
                            {readingSubMode === 'sentence' && renderSentenceResult(currentResult.content)}
                            {readingSubMode === 'paragraph' && renderParagraphResult(currentResult.content)}
                            {readingSubMode === 'dialogue' && renderDialogueResult(currentResult.content)}
                            {readingSubMode === 'story' && renderStoryResult(currentResult.content)}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              )
            )}
          </div>
        </div>
      </div>
    </DevOnlyGuard>
  )
}
