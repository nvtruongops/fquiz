import { z } from 'zod'
import type { PromptDefinition } from './types'

export const PROMPT_VERSION = '1.0.0'

const WordByWordItemSchema = z.preprocess(
  (val) => {
    if (typeof val === 'string') {
      return { source: val, translated: '' }
    }
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>
      return {
        source: String(obj.source ?? obj.word ?? obj.original ?? obj.text ?? obj.src ?? obj.term ?? ''),
        translated: String(obj.translated ?? obj.translation ?? obj.target ?? obj.meaning ?? obj.dest ?? ''),
        notes: obj.notes != null ? String(obj.notes) : null,
      }
    }
    return val
  },
  z.object({
    source: z.string().default(''),
    translated: z.string().default(''),
    notes: z.string().nullable().optional(),
  })
)

export const GeneratedTranslationSchema = z.preprocess(
  (val) => {
    if (val && typeof val === 'object') {
      const obj = val as Record<string, unknown>
      return {
        ...obj,
        sourceText: String(obj.sourceText ?? obj.source ?? obj.text ?? obj.original ?? ''),
        translatedText: String(obj.translatedText ?? obj.translation ?? obj.translated ?? obj.target ?? ''),
      }
    }
    return val
  },
  z.object({
    sourceText: z.string().default(''),
    translatedText: z.string().default(''),
    transliteration: z.string().nullable().optional(),
    wordByWord: z.array(WordByWordItemSchema).nullable().optional(),
    grammarNotes: z.union([
      z.string(),
      z.array(z.string()).transform((arr) => arr.join('\n')),
    ]).nullable().optional(),
    alternatives: z.array(z.string()).nullable().optional(),
  })
)

export type GeneratedTranslation = z.infer<typeof GeneratedTranslationSchema>

export interface TranslationPromptParams {
  sourceLanguage: string
  targetLanguage: string
  text: string
  context?: string
  formality?: 'casual' | 'neutral' | 'formal'
  includeWordByWord?: boolean
}

export const translation: PromptDefinition<TranslationPromptParams, typeof GeneratedTranslationSchema> = {
  name: 'translation',
  version: PROMPT_VERSION,
  schema: GeneratedTranslationSchema,
  buildPrompt: (params: TranslationPromptParams): string => {
    const formalityNote = params.formality === 'formal'
      ? 'Use formal/polite language appropriate for business or official contexts.'
      : params.formality === 'casual'
      ? 'Use casual/everyday language appropriate for friends and family.'
      : 'Use neutral, standard language appropriate for general learning contexts.'
    const wordByWordNote = params.includeWordByWord !== false
      ? '\n- wordByWord: optional breakdown of each word/phrase'
      : ''
    const contextNote = params.context
      ? `\n\nContext: ${params.context}`
      : ''

    return `Translate the following text from ${params.sourceLanguage} to ${params.targetLanguage}.${contextNote}

Source text: "${params.text}"

Provide:
1. sourceText (original text)
2. translatedText (natural translation in ${params.targetLanguage})
3. transliteration (optional: pronunciation guide if ${params.targetLanguage} uses non-Latin script)
${wordByWordNote}
4. grammarNotes (optional: notable grammatical differences)
5. alternatives (optional: 1-3 alternative translations)

Style: ${formalityNote}

Rules:
- The translation must be natural and idiomatic in ${params.targetLanguage}
- Preserve the tone and register of the original
- For ambiguous phrases, choose the most contextually appropriate meaning
- If multiple interpretations exist, list alternatives

Respond ONLY with a valid JSON object matching the provided schema.`
  },
}

