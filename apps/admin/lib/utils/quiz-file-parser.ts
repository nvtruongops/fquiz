import type { QuestionItem } from '@/hooks/quiz/types'

export interface ParsedQuizFileContent {
  questions: QuestionItem[]
  description: string
  courseCode: string
}

/**
 * Parses quiz content from JSON or plaintext format.
 * Throws an Error if no valid questions are recognized.
 */
export function parseQuizFileContent(fileName: string, text: string): ParsedQuizFileContent {
  let parsedQuestions: QuestionItem[] = []
  let parsedDescription = ''
  let parsedCourseCode = ''

  // Format 1: JSON
  if (fileName.endsWith('.json') || text.trim().startsWith('[') || text.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed) && typeof parsed === 'object') {
        if (parsed.description) parsedDescription = String(parsed.description)
        if (parsed.course_code || parsed.courseCode) {
          parsedCourseCode = String(parsed.course_code || parsed.courseCode)
        }
        const items = parsed.questions || parsed.items || []
        parsedQuestions = items.map((item: any, idx: number) => ({
          question_id: item.question_id,
          text: String(item.text || item.question || `Question ${idx + 1}`),
          options: Array.isArray(item.options) ? item.options.map(String) : ['', '', '', ''],
          correct_answer: Array.isArray(item.correct_answer)
            ? item.correct_answer.map(Number)
            : [Number(item.answer ?? 0)],
          explanation: item.explanation || item.description || '',
        }))
      } else if (Array.isArray(parsed)) {
        parsedQuestions = parsed.map((item: any, idx: number) => ({
          question_id: item.question_id,
          text: String(item.text || item.question || `Question ${idx + 1}`),
          options: Array.isArray(item.options) ? item.options.map(String) : ['', '', '', ''],
          correct_answer: Array.isArray(item.correct_answer)
            ? item.correct_answer.map(Number)
            : [Number(item.answer ?? 0)],
          explanation: item.explanation || item.description || '',
        }))
      }
    } catch {
      // Fallback to text parser
    }
  }

  // Format 2: Text / TXT Parser
  if (parsedQuestions.length === 0) {
    const blocks = text.split(/\n\s*(?=(?:Câu\s*\d+|Question\s*\d+|\d+[\.\)])\s*[:\.]?)/i)

    for (let bIdx = 0; bIdx < blocks.length; bIdx++) {
      const block = blocks[bIdx]
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
      if (lines.length === 0) continue

      if (bIdx === 0 && !/^(?:Câu\s*\d+|Question\s*\d+|\d+[\.\)])/i.test(lines[0])) {
        for (const l of lines) {
          const descMatch = l.match(/^(?:Mô tả|Description|Ghi chú|Note)[:\s]*(.+)/i)
          if (descMatch) parsedDescription = descMatch[1].trim()

          const codeMatch = l.match(/^(?:Mã đề|Mã môn|Quiz Code|Course Code)[:\s]*([A-Z0-9_-]+)/i)
          if (codeMatch) parsedCourseCode = codeMatch[1].trim().toUpperCase()
        }
      }

      let qText = ''
      const options: string[] = []
      let correctAnswers: number[] = [0]
      let explanation = ''

      for (const line of lines) {
        const descExpMatch = line.match(/^(?:Mô tả[:\s]*Giải thích|Mô tả|Giải thích|Explanation|HD|HDG|Note)[:\s]*(.+)/i)
        if (descExpMatch) {
          explanation = descExpMatch[1].trim()
          continue
        }

        const ansMatch = line.match(/^(?:Đáp án|Answer|Key|ĐA)[:\s]*([A-H0-9,\s]+)/i)
        if (ansMatch) {
          const rawAnswers = ansMatch[1]
          const letters = rawAnswers.match(/[A-H]/gi)
          if (letters && letters.length > 0) {
            correctAnswers = letters.map((char) => char.toUpperCase().charCodeAt(0) - 65)
          } else {
            const numbers = rawAnswers.match(/\d+/g)
            if (numbers && numbers.length > 0) {
              correctAnswers = numbers.map((n) => Math.max(0, Number(n) - 1))
            }
          }
          continue
        }

        const optMatch = line.match(/^[A-H][\.\)\:\-]\s*(.+)/i)
        if (optMatch) {
          options.push(optMatch[1].trim())
          continue
        }

        if (options.length === 0) {
          const cleanLine = line
            .replace(/^(?:Câu\s*\d+|Question\s*\d+|\d+[\.\)])\s*[:\.]?\s*/i, '')
            .replace(/^(?:Câu\s*hỏi|Question)[:\s]*/i, '')
            .trim()
          if (cleanLine) {
            qText = qText ? `${qText}\n${cleanLine}` : cleanLine
          }
        }
      }

      if (qText || options.length > 0) {
        parsedQuestions.push({
          text: qText || 'Untitled question',
          options: options.length >= 2 ? options : ['', '', '', ''],
          correct_answer: correctAnswers.map((idx) => Math.max(0, Math.min(options.length - 1, idx))),
          explanation,
        })
      }
    }
  }

  if (parsedQuestions.length === 0) {
    throw new Error('No questions recognized from file. Please check file format.')
  }

  return {
    questions: parsedQuestions,
    description: parsedDescription,
    courseCode: parsedCourseCode,
  }
}
