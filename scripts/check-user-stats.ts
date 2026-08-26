import { connectDB } from '@/lib/mongodb'
import { QuizSession } from '@/models/QuizSession'
import { Quiz } from '@/models/Quiz'
import { User } from '@/models/User'
import mongoose, { Types } from 'mongoose'

async function checkUserStats() {
  try {
    console.log('Connecting to database...')
    await connectDB()

    // Tìm user theo username hoặc email
    const username = 'nvtruongops' // Thay bằng username trong ảnh
    console.log(`\nTìm kiếm user: ${username}`)

    const user = await User.findOne({ username }).lean()
    
    if (!user) {
      console.log(`❌ Không tìm thấy user: ${username}`)
      process.exit(0)
    }

    console.log(`✅ Tìm thấy user: ${user.username} (${user.email})`)
    const userId = new Types.ObjectId(user._id)

    // Lấy stats giống như API dashboard
    const latestStatsResult = await QuizSession.aggregate([
      { $match: { student_id: userId, status: 'completed' } },
      { $sort: { completed_at: -1 } },
      {
        $group: {
          _id: '$quiz_id',
          latestSession: { $first: '$$ROOT' },
        },
      },
      {
        $replaceRoot: {
          newRoot: '$latestSession',
        },
      },
      {
        $lookup: {
          from: 'quizzes',
          localField: 'quiz_id',
          foreignField: '_id',
          as: 'quizDoc',
        },
      },
      {
        $addFields: {
          quizDoc: { $arrayElemAt: ['$quizDoc', 0] },
        },
      },
      {
        $addFields: {
          totalQuestions: {
            $ifNull: [
              '$quizDoc.questionCount',
              { $size: { $ifNull: ['$quizDoc.questions', []] } },
            ],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalQuizzes: { $sum: 1 },
          averageScore: {
            $avg: {
              $cond: [
                { $gt: ['$totalQuestions', 0] },
                { $multiply: [{ $divide: ['$score', '$totalQuestions'] }, 10] },
                0,
              ],
            },
          },
          totalCorrectAnswers: {
            $sum: {
              $size: {
                $filter: {
                  input: '$user_answers',
                  as: 'ans',
                  cond: { $eq: ['$$ans.is_correct', true] },
                },
              },
            },
          },
        },
      },
    ])

    const stats = latestStatsResult[0] || {
      totalQuizzes: 0,
      averageScore: 0,
      totalCorrectAnswers: 0,
    }

    console.log(`\n📊 Stats:`)
    console.log(`   Total Quizzes: ${stats.totalQuizzes}`)
    console.log(`   Average Score: ${stats.averageScore?.toFixed(1) || '0.0'}`)
    console.log(`   Total Correct Answers: ${stats.totalCorrectAnswers}`)

    // Lấy chi tiết các sessions
    console.log(`\n📝 Chi tiết sessions:`)
    const sessions = await QuizSession.find({ 
      student_id: userId, 
      status: 'completed' 
    })
    .sort({ completed_at: -1 })
    .limit(10)
    .lean()

    for (const session of sessions) {
      const quiz = await Quiz.findById(session.quiz_id).select('title course_code questionCount questions').lean()
      const totalQuestions = quiz?.questionCount || quiz?.questions?.length || 0
      const scoreOutOf10 = totalQuestions > 0 ? (session.score / totalQuestions) * 10 : 0

      console.log(`\n   Quiz: ${quiz?.course_code || 'N/A'}`)
      console.log(`   Score: ${session.score}/${totalQuestions} = ${scoreOutOf10.toFixed(1)}/10`)
      console.log(`   Completed: ${session.completed_at}`)
    }

  } catch (error) {
    console.error('❌ Lỗi:', error)
  } finally {
    await mongoose.connection.close()
    console.log('\n✅ Đã đóng kết nối database')
  }
}

checkUserStats()
