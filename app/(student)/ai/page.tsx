'use client'

import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { DevOnlyGuard } from '@/components/shared/DevOnlyGuard'
import { Skeleton } from '@/components/shared/ui/skeleton'
import {
  useAISession,
  ENGLISH_TENSES,
  TEXT_GENRES,
  COMMON_TOPICS,
  LANGUAGES,
} from '@/hooks/useAISession'
import { AIFeatureHeader } from '@/components/ai/AIFeatureHeader'
import { AIVocabStudio } from '@/components/ai/AIVocabStudio'
import { AIGrammarStudio } from '@/components/ai/AIGrammarStudio'
import { AIReadingStudio } from '@/components/ai/AIReadingStudio'
import { AITranslationStudio } from '@/components/ai/AITranslationStudio'
import { AIWritingStudio } from '@/components/ai/AIWritingStudio'

// Code-splitting non-critical drawer via next/dynamic
const AISavedAssetsDrawer = dynamic(() => import('@/components/ai/AISavedAssetsDrawer'), {
  loading: () => <Skeleton className="h-64 w-full" />,
  ssr: false,
})

export default function StudentAIAssistantPage() {
  const [drawerOpen, setDrawerOpen] = useState(false)

  const {
    activeTab, setActiveTab,
    mobileDropdownOpen, setMobileDropdownOpen,
    readingSubMode, setReadingSubMode,
    explanationLanguage, setExplanationLanguage,
    loading, viewMode, setViewMode,
    targetLanguage, setTargetLanguage,
    sourceLanguage, setSourceLanguage,
    selectedTopicSlug, setSelectedTopicSlug,
    customTopicInput, setCustomTopicInput,
    textGenre, setTextGenre,
    situationalContext, setSituationalContext,
    cefrLevel, setCefrLevel,
    englishTense, setEnglishTense,
    wordInput, setWordInput,
    grammarTopic, setGrammarTopic,
    translationText, setTranslationText,
    currentResult,
    paraAnswers, setParaAnswers,
    showParagraphTranslation, setShowParagraphTranslation,
    showStoryTranslation, setShowStoryTranslation,
    writingWordCount, setWritingWordCount,
    writingSubTab, setWritingSubTab,
    userSubmissionLanguage, setUserSubmissionLanguage,
    userWritingInput, setUserWritingInput,
    evaluatingWriting, writingEvalResult,
    savingVocabIds, savedVocabIds,
    savingFlashcard, savedSuccess,
    activeLevelOptions,
    handleGenerate,
    handleEvaluateWriting,
    handleSaveSingleVocabulary,
    handleSaveToFlashcard,
    setResultCache,
  } = useAISession()

  return (
    <DevOnlyGuard>
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6 min-h-screen">
        {/* Header & Feature Navigation */}
        <AIFeatureHeader
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          mobileDropdownOpen={mobileDropdownOpen}
          setMobileDropdownOpen={setMobileDropdownOpen}
          targetLanguage={targetLanguage}
          setTargetLanguage={setTargetLanguage}
          cefrLevel={cefrLevel}
          setCefrLevel={setCefrLevel}
          activeLevelOptions={activeLevelOptions}
          explanationLanguage={explanationLanguage}
          setExplanationLanguage={setExplanationLanguage}
        />

        {/* Feature Studio Rendering */}
        {activeTab === 'vocabulary' && (
          <AIVocabStudio
            viewMode={viewMode}
            setViewMode={setViewMode}
            wordInput={wordInput}
            setWordInput={setWordInput}
            selectedTopicSlug={selectedTopicSlug}
            setSelectedTopicSlug={setSelectedTopicSlug}
            customTopicInput={customTopicInput}
            setCustomTopicInput={setCustomTopicInput}
            commonTopics={COMMON_TOPICS}
            loading={loading}
            handleGenerate={handleGenerate}
            currentResult={currentResult}
            savingVocabIds={savingVocabIds}
            savedVocabIds={savedVocabIds}
            handleSaveSingleVocabulary={handleSaveSingleVocabulary}
            handleSaveToFlashcard={handleSaveToFlashcard}
            savingFlashcard={savingFlashcard}
            savedSuccess={savedSuccess}
          />
        )}

        {activeTab === 'grammar' && (
          <AIGrammarStudio
            viewMode={viewMode}
            setViewMode={setViewMode}
            grammarTopic={grammarTopic}
            setGrammarTopic={setGrammarTopic}
            targetLanguage={targetLanguage}
            englishTense={englishTense}
            setEnglishTense={setEnglishTense}
            englishTensesOptions={ENGLISH_TENSES}
            loading={loading}
            handleGenerate={handleGenerate}
            currentResult={currentResult}
            handleSaveToFlashcard={handleSaveToFlashcard}
            savingFlashcard={savingFlashcard}
            savedSuccess={savedSuccess}
          />
        )}

        {activeTab === 'reading' && (
          <AIReadingStudio
            viewMode={viewMode}
            setViewMode={setViewMode}
            readingSubMode={readingSubMode}
            setReadingSubMode={setReadingSubMode}
            selectedTopicSlug={selectedTopicSlug}
            setSelectedTopicSlug={setSelectedTopicSlug}
            customTopicInput={customTopicInput}
            setCustomTopicInput={setCustomTopicInput}
            textGenre={textGenre}
            setTextGenre={setTextGenre}
            commonTopics={COMMON_TOPICS}
            textGenresOptions={TEXT_GENRES}
            loading={loading}
            handleGenerate={handleGenerate}
            currentResult={currentResult}
            showParagraphTranslation={showParagraphTranslation}
            setShowParagraphTranslation={setShowParagraphTranslation}
            showStoryTranslation={showStoryTranslation}
            setShowStoryTranslation={setShowStoryTranslation}
            paraAnswers={paraAnswers}
            setParaAnswers={setParaAnswers}
          />
        )}

        {activeTab === 'translation' && (
          <AITranslationStudio
            viewMode={viewMode}
            setViewMode={setViewMode}
            translationText={translationText}
            setTranslationText={setTranslationText}
            sourceLanguage={sourceLanguage}
            setSourceLanguage={setSourceLanguage}
            targetLanguage={targetLanguage}
            setTargetLanguage={setTargetLanguage}
            languagesOptions={LANGUAGES}
            loading={loading}
            handleGenerate={handleGenerate}
            currentResult={currentResult}
            handleSaveToFlashcard={handleSaveToFlashcard}
            savingFlashcard={savingFlashcard}
            savedSuccess={savedSuccess}
          />
        )}

        {activeTab === 'writing' && (
          <AIWritingStudio
            writingSubTab={writingSubTab}
            setWritingSubTab={setWritingSubTab}
            writingWordCount={writingWordCount}
            setWritingWordCount={setWritingWordCount}
            selectedTopicSlug={selectedTopicSlug}
            setSelectedTopicSlug={setSelectedTopicSlug}
            customTopicInput={customTopicInput}
            setCustomTopicInput={setCustomTopicInput}
            textGenre={textGenre}
            setTextGenre={setTextGenre}
            situationalContext={situationalContext}
            setSituationalContext={setSituationalContext}
            userWritingInput={userWritingInput}
            setUserWritingInput={setUserWritingInput}
            userSubmissionLanguage={userSubmissionLanguage}
            setUserSubmissionLanguage={setUserSubmissionLanguage}
            explanationLanguage={explanationLanguage}
            setExplanationLanguage={setExplanationLanguage}
            commonTopics={COMMON_TOPICS}
            textGenresOptions={TEXT_GENRES}
            languagesOptions={LANGUAGES}
            loading={loading}
            handleGenerate={handleGenerate}
            currentResult={currentResult}
            evaluatingWriting={evaluatingWriting}
            writingEvalResult={writingEvalResult}
            handleEvaluateWriting={handleEvaluateWriting}
            cefrLevel={cefrLevel}
            setResultCache={setResultCache}
          />
        )}

        {/* Off-screen Drawer (Code-Split) */}
        {drawerOpen && (
          <AISavedAssetsDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        )}
      </div>
    </DevOnlyGuard>
  )
}
