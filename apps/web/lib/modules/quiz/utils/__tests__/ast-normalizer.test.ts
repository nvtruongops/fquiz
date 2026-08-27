import { normalizeTextAST, generateCanonicalQuestionHash } from '../ast-normalizer'
import { calculateQuizSimilarity, auditQuizzesSimilarity } from '../quiz-similarity'

describe('AST Normalizer & Canonical Question Hash', () => {
  describe('normalizeTextAST', () => {
    it('strips trailing dots and punctuation', () => {
      const t1 = normalizeTextAST('Con mèo có mấy chân?')
      const t2 = normalizeTextAST('Con mèo có mấy chân.')
      const t3 = normalizeTextAST('Con mèo có mấy chân...')
      expect(t1).toBe('con mèo có mấy chân')
      expect(t2).toBe('con mèo có mấy chân')
      expect(t3).toBe('con mèo có mấy chân')

    })

    it('strips HTML tags and extra spaces', () => {
      const htmlText = normalizeTextAST('<p>Thủ đô <span>Việt Nam</span> là gì ? </p>')
      expect(htmlText).toBe('thủ đô việt nam là gì')
    })


    it('strips option letter prefixes', () => {
      expect(normalizeTextAST('A. Hà Nội')).toBe('hà nội')
      expect(normalizeTextAST('B) TP. Hồ Chí Minh')).toBe('tp. hồ chí minh')
      expect(normalizeTextAST('[C] Đà Nẵng')).toBe('đà nẵng')
    })
  })

  describe('generateCanonicalQuestionHash', () => {
    it('generates identical hash when questions differ only by trailing dot', () => {
      const q1 = { text: 'Quang trung là ai?', options: ['Vua', 'Chúa'], correct_answer: 0 }
      const q2 = { text: 'Quang trung là ai.', options: ['Vua.', 'Chúa'], correct_answer: 0 }
      expect(generateCanonicalQuestionHash(q1)).toBe(generateCanonicalQuestionHash(q2))
    })

    it('generates identical hash when options are shuffled but correct answer matches', () => {
      const q1 = { text: 'Thủ đô Việt Nam?', options: ['Hà Nội', 'Huế'], correct_answer: 0 }
      const q2 = { text: 'Thủ đô Việt Nam?', options: ['Huế', 'Hà Nội'], correct_answer: 1 }
      expect(generateCanonicalQuestionHash(q1)).toBe(generateCanonicalQuestionHash(q2))
    })

    it('generates identical hash when HTML tags or spaces differ', () => {
      const q1 = { text: 'Thủ đô Việt Nam?', options: ['Hà Nội', 'Huế'], correct_answer: 0 }
      const q2 = { text: '<p>Thủ đô Việt Nam ? </p>', options: ['A. Hà Nội', 'B. Huế'], correct_answer: 0 }
      expect(generateCanonicalQuestionHash(q1)).toBe(generateCanonicalQuestionHash(q2))
    })

    it('generates different hash when correct answer text actually differs', () => {
      const q1 = { text: 'Thủ đô Việt Nam?', options: ['Hà Nội', 'Huế'], correct_answer: 0 }
      const q2 = { text: 'Thủ đô Việt Nam?', options: ['Hà Nội', 'Huế'], correct_answer: 1 }
      expect(generateCanonicalQuestionHash(q1)).not.toBe(generateCanonicalQuestionHash(q2))
    })
  })

  describe('Hierarchy Quiz Similarity Audit (Category -> Quiz -> Question)', () => {
    const quiz1 = {
      _id: 'q1',
      title: 'Đề thi NWC303 Đề 1',
      course_code: 'NWC303_1',
      category_id: 'cat_net',
      questions: [
        { text: 'Protocol là gì?', options: ['Giao thức', 'Báo cáo'], correct_answer: 0 },
        { text: 'IP address là gì?', options: ['Địa chỉ IP', 'Tên miền'], correct_answer: 0 }
      ]
    }

    const quiz2NearDup = {
      _id: 'q2',
      title: 'Đề thi NWC303 Đề 2 (Đổi thứ tự đáp án & thêm dấu chấm)',
      course_code: 'NWC303_2',
      category_id: 'cat_net',
      questions: [
        { text: 'Protocol là gì.', options: ['Báo cáo', 'A. Giao thức'], correct_answer: 1 },
        { text: 'IP address là gì?', options: ['Địa chỉ IP', 'Tên miền'], correct_answer: 0 }
      ]
    }

    it('detects 100% similarity across quizzes with shuffled options and punctuation differences', () => {
      const sim = calculateQuizSimilarity(quiz1, quiz2NearDup)
      expect(sim.similarityPercent).toBe(100)
      expect(sim.isExactDuplicate).toBe(true)
    })

    it('audits a collection of quizzes and reports exact/near duplicates', () => {
      const audit = auditQuizzesSimilarity([quiz1, quiz2NearDup])
      expect(audit.exactDuplicates.length).toBe(1)
      expect(audit.uniqueQuizCount).toBe(1)
    })
  })
})
