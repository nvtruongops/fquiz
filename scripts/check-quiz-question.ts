import { connectDB } from '@/lib/mongodb'
import { Quiz } from '@/models/Quiz'
import mongoose from 'mongoose'

async function checkQuizQuestion() {
  try {
    console.log('Connecting to database...')
    await connectDB()

    const courseCode = 'FRS401C_SP25_RE'
    console.log(`\nTìm kiếm quiz: ${courseCode}`)

    const quiz = await Quiz.findOne({ course_code: courseCode }).lean()
    
    if (!quiz) {
      console.log(`❌ Không tìm thấy quiz: ${courseCode}`)
      process.exit(0)
    }

    console.log(`✅ Tìm thấy quiz: ${quiz.title}`)
    console.log(`   Số câu hỏi: ${quiz.questions?.length || 0}`)

    // Kiểm tra câu 32 (index 31)
    const questionIndex = 31
    const question = quiz.questions?.[questionIndex]

    if (!question) {
      console.log(`\n❌ Không tìm thấy câu ${questionIndex + 1}`)
      process.exit(0)
    }

    console.log(`\n📝 Câu ${questionIndex + 1}:`)
    console.log(`   Text: ${question.text}`)
    console.log(`   Options: ${JSON.stringify(question.options, null, 2)}`)
    console.log(`   Correct Answer: ${JSON.stringify(question.correct_answer)}`)
    console.log(`   Type: ${Array.isArray(question.correct_answer) ? 'Array' : typeof question.correct_answer}`)
    console.log(`   Length: ${Array.isArray(question.correct_answer) ? question.correct_answer.length : 'N/A'}`)
    
    // Tính answer_selection_count theo logic hiện tại
    const answerSelectionCount = Array.isArray(question.correct_answer)
      ? Math.max(question.correct_answer.length, 1)
      : 1
    
    console.log(`\n🔢 Answer Selection Count (theo logic hiện tại): ${answerSelectionCount}`)
    
    // Kiểm tra tất cả câu hỏi có vấn đề tương tự
    console.log(`\n🔍 Kiểm tra tất cả câu hỏi:`)
    let problemCount = 0
    quiz.questions?.forEach((q, idx) => {
      const count = Array.isArray(q.correct_answer) ? q.correct_answer.length : 1
      const optionCount = q.options?.length || 0
      
      // Kiểm tra câu True/False (2 options) nhưng có nhiều đáp án đúng
      if (optionCount === 2 && count > 1) {
        problemCount++
        console.log(`   ⚠️  Câu ${idx + 1}: ${count} đáp án đúng nhưng chỉ có ${optionCount} options (True/False)`)
        console.log(`      Text: ${q.text?.substring(0, 80)}...`)
        console.log(`      Options: ${JSON.stringify(q.options)}`)
        console.log(`      Correct: ${JSON.stringify(q.correct_answer)}`)
        console.log('')
      }
      
      // Kiểm tra câu có nhiều đáp án đúng
      if (count > 1) {
        console.log(`   📌 Câu ${idx + 1}: ${count} đáp án đúng, ${optionCount} options`)
        console.log(`      Text: ${q.text?.substring(0, 80)}...`)
        console.log(`      Correct: ${JSON.stringify(q.correct_answer)}`)
        console.log('')
      }
    })
    
    console.log(`\n📊 Tổng kết:`)
    console.log(`   - Tổng số câu: ${quiz.questions?.length || 0}`)
    console.log(`   - Câu có vấn đề (True/False nhưng nhiều đáp án): ${problemCount}`)

  } catch (error) {
    console.error('❌ Lỗi:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n✅ Đã đóng kết nối database')
  }
}

checkQuizQuestion()
