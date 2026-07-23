'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/store/shared/toast-store'
import { withCsrfHeaders } from '@/lib/core/security/csrf'

export type AIFeatureType =
  | 'vocabulary'
  | 'grammar'
  | 'reading'
  | 'translation'
  | 'writing'

export type ReadingSubMode =
  | 'sentence'
  | 'paragraph'
  | 'dialogue'
  | 'story'

export const LANGUAGES = [
  { code: 'English', label: 'Tiếng Anh (English)' },
  { code: 'Japanese', label: 'Tiếng Nhật (日本語)' },
  { code: 'Mandarin Chinese', label: 'Tiếng Trung (中文)' },
  { code: 'Korean', label: 'Tiếng Hàn (한국어)' },
  { code: 'French', label: 'Tiếng Pháp (Français)' },
  { code: 'German', label: 'Tiếng Đức (Deutsch)' },
  { code: 'Spanish', label: 'Tiếng Tây Ban Nha (Español)' },
  { code: 'Vietnamese', label: 'Tiếng Việt (Vietnamese)' },
]

export const LEVEL_CONFIG_BY_LANG: Record<string, { code: string; label: string }[]> = {
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

export const ENGLISH_TENSES = [
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

export const TEXT_GENRES = [
  { code: 'random', label: 'Ngẫu nhiên / Tự do (Mặc định)' },
  { code: 'informational', label: 'Bài viết thông tin (Informational Text)' },
  { code: 'formal_email', label: 'Email công việc trang trọng (Formal Email)' },
  { code: 'informal_email', label: 'Thư / Chat thân mật (Casual Email/Chat)' },
  { code: 'essay_opinion', label: 'Bài luận nghị luận (Opinion Essay)' },
  { code: 'story_narrative', label: 'Truyện kể & Nhật ký (Narrative Story)' },
  { code: 'news_report', label: 'Bài báo & Tin tức (News Report)' },
  { code: 'descriptive', label: 'Bài văn miêu tả (Descriptive Text)' },
]

export const COMMON_TOPICS = [
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

function buildAIPromptParams(
  promptType: string,
  targetLanguage: string,
  cefrLevel: string,
  explanationLanguage: string,
  situationalContext: string,
  topicValue: string,
  genreValue: string,
  wordInput: string,
  grammarTopic: string,
  englishTense: string,
  sourceLanguage: string,
  translationText: string,
  writingWordCount: number | string
) {
  const base = {
    language: targetLanguage,
    cefr: cefrLevel,
    explanationLanguage,
    context: situationalContext,
  }

  if (promptType === 'vocabulary') {
    return { ...base, topic: topicValue, word: wordInput, count: 2 }
  }
  if (promptType === 'grammar') {
    const gTopic = targetLanguage === 'English' && englishTense ? `${grammarTopic} (${englishTense})` : grammarTopic
    return { ...base, topic: gTopic }
  }
  if (promptType === 'paragraph' || promptType === 'dialogue') {
    return { ...base, topic: topicValue, genre: genreValue }
  }
  if (promptType === 'sentence') {
    const targetVocabArr = wordInput.trim() ? [wordInput.trim()] : undefined
    return { ...base, topic: topicValue, targetVocab: targetVocabArr }
  }
  if (promptType === 'story') {
    return { ...base, theme: topicValue, genre: genreValue }
  }
  if (promptType === 'translation') {
    return { sourceLanguage, targetLanguage, text: translationText }
  }
  if (promptType === 'writing') {
    return {
      ...base,
      topic: topicValue,
      genre: genreValue,
      wordCount: Math.min(500, Math.max(20, Number(writingWordCount) || 100)),
    }
  }
  return base
}

function buildFlashcardItemData(
  activeTab: AIFeatureType,
  content: any,
  wordInput: string,
  grammarTopic: string,
  readingSubMode: ReadingSubMode,
  translationText: string,
  topic: string,
  cefrLevel: string
) {
  if (activeTab === 'vocabulary') {
    const item = Array.isArray(content) ? content[0] : content
    return {
      itemType: 'vocabulary' as const,
      data: {
        lemma: item?.lemma || wordInput,
        display: item?.display || item?.lemma || wordInput,
        ipa: item?.ipa,
        definition: item?.definition,
        partOfSpeech: item?.partOfSpeech,
        examples: item?.examples,
        cefrLevel: item?.cefrLevel || cefrLevel,
      },
    }
  }

  if (activeTab === 'grammar') {
    return {
      itemType: 'grammar' as const,
      data: {
        pattern: content?.pattern || grammarTopic,
        explanation: content?.explanation || content?.definition,
        examples: content?.examples,
        cefrLevel,
      },
    }
  }

  if (activeTab === 'reading' && readingSubMode === 'sentence') {
    const item = Array.isArray(content) ? content[0] : content
    return {
      itemType: 'sentence' as const,
      data: {
        text: item?.text || item?.sentence,
        translation: item?.translation,
        cefrLevel: item?.difficulty || cefrLevel,
      },
    }
  }

  if (activeTab === 'translation') {
    return {
      itemType: 'sentence' as const,
      data: {
        text: content?.sourceText || translationText,
        translation: content?.translatedText,
        cefrLevel,
      },
    }
  }

  const item = Array.isArray(content) ? content[0] : content
  const loType = item?.text ? 'sentence' : item?.pattern ? 'grammar' : 'vocabulary'
  return {
    itemType: loType,
    data: {
      lemma: item?.lemma || item?.word || wordInput,
      text: item?.text || item?.sentence || topic,
      translation: item?.translation,
      definition: item?.definition || item?.explanation,
      cefrLevel,
    },
  }
}

export function useAISession() {
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

  // Result cache
  const [resultCache, setResultCache] = useState<Map<string, any>>(new Map())
  const activeCacheKey = activeTab === 'reading' ? `reading:${readingSubMode}` : activeTab
  const currentResult = resultCache.get(activeCacheKey)

  // View mode
  const [viewMode, setViewMode] = useState<'config' | 'result'>('config')

  // Interactive UI states
  const [flashcardIndex, setFlashcardIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [paraAnswers, setParaAnswers] = useState<Record<number, number>>({})
  const [showParagraphTranslation, setShowParagraphTranslation] = useState(false)
  const [showStoryTranslation, setShowStoryTranslation] = useState(false)

  // Writing states
  const [writingWordCount, setWritingWordCount] = useState<number | string>(100)
  const [writingSubTab, setWritingSubTab] = useState<'config' | 'workspace' | 'eval'>('config')
  const [userSubmissionLanguage, setUserSubmissionLanguage] = useState('Vietnamese')
  const [userWritingInput, setUserWritingInput] = useState('')
  const [evaluatingWriting, setEvaluatingWriting] = useState(false)
  const [writingEvalResult, setWritingEvalResult] = useState<any>(null)
  const [savingVocabIds, setSavingVocabIds] = useState<Record<string, boolean>>({})
  const [savedVocabIds, setSavedVocabIds] = useState<Record<string, boolean>>({})
  const [savingFlashcard, setSavingFlashcard] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Level options
  const activeLevelOptions = useMemo(
    () => LEVEL_CONFIG_BY_LANG[targetLanguage] || LEVEL_CONFIG_BY_LANG.English,
    [targetLanguage]
  )

  useEffect(() => {
    if (!activeLevelOptions.some((l) => l.code === cefrLevel)) {
      setCefrLevel(activeLevelOptions[0].code)
    }
  }, [targetLanguage, activeLevelOptions, cefrLevel])

  useEffect(() => {
    const key = activeTab === 'reading' ? `reading:${readingSubMode}` : activeTab
    setViewMode(resultCache.has(key) ? 'result' : 'config')
  }, [activeTab, readingSubMode, resultCache])

  useEffect(() => {
    if (currentResult?.targetLanguage) {
      setUserSubmissionLanguage(currentResult.targetLanguage)
    } else {
      setUserSubmissionLanguage(explanationLanguage || targetLanguage)
    }
  }, [currentResult, explanationLanguage, targetLanguage])

  useEffect(() => {
    setFlashcardIndex(0)
    setIsFlipped(false)
    setShowHint(false)
    setQuizAnswers({})
    setQuizSubmitted(false)
    setParaAnswers({})
    setShowParagraphTranslation(false)
    setShowStoryTranslation(false)
    setSavedSuccess(false)

    if (activeTab === 'writing' && currentResult) {
      if (currentResult.userWritingInput !== undefined) {
        setUserWritingInput(currentResult.userWritingInput)
      }
      if (currentResult.writingEvalResult !== undefined) {
        setWritingEvalResult(currentResult.writingEvalResult)
      }
      if (currentResult.writingSubTab) {
        setWritingSubTab(currentResult.writingSubTab)
      }
    }
  }, [currentResult, activeTab])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
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

    const params = buildAIPromptParams(
      promptType,
      targetLanguage,
      cefrLevel,
      explanationLanguage,
      situationalContext,
      topicValue,
      genreValue,
      wordInput,
      grammarTopic,
      englishTense,
      sourceLanguage,
      translationText,
      writingWordCount
    )

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? ''}/api/v1/ai/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ type: promptType, params }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi sinh nội dung AI')
      } else {
        const cachePayload = activeTab === 'writing' ? {
          ...json.data,
          userWritingInput: '',
          writingEvalResult: null,
          writingSubTab: 'workspace',
        } : json.data

        setResultCache(prev => new Map(prev).set(activeCacheKey, cachePayload))
        if (activeTab === 'writing') {
          setUserWritingInput('')
          setWritingEvalResult(null)
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
  }, [
    activeTab, readingSubMode, targetLanguage, cefrLevel, explanationLanguage,
    situationalContext, selectedTopicSlug, customTopicInput, englishTense, textGenre,
    wordInput, grammarTopic, sourceLanguage, translationText, writingWordCount,
    activeCacheKey, toast
  ])

  const handleEvaluateWriting = useCallback(async () => {
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
            sourceLanguage: exercise.sourceLanguage || 'English',
            userAnswer: userWritingInput,
            userLanguage: userSubmissionLanguage || exercise.targetLanguage || targetLanguage,
            sampleAnswer: exercise.sampleAnswer,
            cefrLevel: exercise.cefrLevel || cefrLevel,
            explanationLanguage: 'Vietnamese',
          },
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi khi AI đánh giá bài viết')
      } else {
        const evalContent = json.data.content
        setWritingEvalResult(evalContent)
        setWritingSubTab('eval')
        setResultCache(prev => {
          const existing = prev.get('writing')
          if (!existing) return prev
          return new Map(prev).set('writing', {
            ...existing,
            userWritingInput,
            writingEvalResult: evalContent,
            writingSubTab: 'eval',
          })
        })
        toast.success('AI đã chấm điểm & nhận xét bài viết thành công!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Không thể kết nối dịch vụ AI chấm điểm')
    } finally {
      setEvaluatingWriting(false)
    }
  }, [currentResult, userWritingInput, userSubmissionLanguage, targetLanguage, cefrLevel, toast])

  const handleSaveSingleVocabulary = useCallback(async (wordItem: any, idx: number) => {
    const key = wordItem.lemma || `word-${idx}`
    setSavingVocabIds(prev => ({ ...prev, [key]: true }))

    try {
      const res = await fetch('/api/v1/learning/save-item', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          itemType: 'vocabulary',
          data: {
            lemma: wordItem.lemma || wordItem.display,
            display: wordItem.display || wordItem.lemma,
            ipa: wordItem.ipa,
            definition: wordItem.definition,
            partOfSpeech: wordItem.partOfSpeech,
            examples: wordItem.examples,
            cefrLevel: wordItem.cefrLevel || cefrLevel,
          },
          targetLanguage,
          sourceLanguage: explanationLanguage,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || `Lỗi khi lưu từ "${wordItem.lemma || wordItem.display}"`)
      } else {
        setSavedVocabIds(prev => ({ ...prev, [key]: true }))
        toast.success(`Đã lưu từ "${wordItem.lemma || wordItem.display}" vào danh sách học!`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi mạng khi lưu từ vựng')
    } finally {
      setSavingVocabIds(prev => ({ ...prev, [key]: false }))
    }
  }, [cefrLevel, targetLanguage, explanationLanguage, toast])

  const handleSaveToFlashcard = useCallback(async () => {
    if (!currentResult?.content) return
    setSavingFlashcard(true)

    const payload = buildFlashcardItemData(
      activeTab,
      currentResult.content,
      wordInput,
      grammarTopic,
      readingSubMode,
      translationText,
      topic,
      cefrLevel
    )

    try {
      const res = await fetch('/api/v1/learning/save-item', {
        method: 'POST',
        credentials: 'include',
        headers: withCsrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ...payload,
          targetLanguage,
          sourceLanguage: explanationLanguage,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        toast.error(json.error || 'Lỗi khi lưu vật phẩm vào Flashcard SRS')
      } else {
        setSavedSuccess(true)
        toast.success(json.message || 'Đã lưu học liệu thành công vào Flashcard SRS!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi mạng khi kết nối lưu dữ liệu')
    } finally {
      setSavingFlashcard(false)
    }
  }, [currentResult, activeTab, wordInput, grammarTopic, readingSubMode, translationText, topic, cefrLevel, targetLanguage, explanationLanguage, toast])

  return {
    activeTab, setActiveTab,
    mobileDropdownOpen, setMobileDropdownOpen,
    readingSubMode, setReadingSubMode,
    explanationLanguage, setExplanationLanguage,
    loading, viewMode, setViewMode,
    targetLanguage, setTargetLanguage,
    sourceLanguage, setSourceLanguage,
    topic, setTopic,
    selectedTopicSlug, setSelectedTopicSlug,
    customTopicInput, setCustomTopicInput,
    textGenre, setTextGenre,
    situationalContext, setSituationalContext,
    cefrLevel, setCefrLevel,
    englishTense, setEnglishTense,
    wordInput, setWordInput,
    grammarTopic, setGrammarTopic,
    translationText, setTranslationText,
    resultCache, setResultCache,
    activeCacheKey, currentResult,
    flashcardIndex, setFlashcardIndex,
    isFlipped, setIsFlipped,
    showHint, setShowHint,
    quizAnswers, setQuizAnswers,
    quizSubmitted, setQuizSubmitted,
    paraAnswers, setParaAnswers,
    showParagraphTranslation, setShowParagraphTranslation,
    showStoryTranslation, setShowStoryTranslation,
    writingWordCount, setWritingWordCount,
    writingSubTab, setWritingSubTab,
    userSubmissionLanguage, setUserSubmissionLanguage,
    userWritingInput, setUserWritingInput,
    evaluatingWriting, setEvaluatingWriting,
    writingEvalResult, setWritingEvalResult,
    savingVocabIds, savedVocabIds,
    savingFlashcard, savedSuccess,
    activeLevelOptions,
    handleGenerate,
    handleEvaluateWriting,
    handleSaveSingleVocabulary,
    handleSaveToFlashcard,
  }
}
