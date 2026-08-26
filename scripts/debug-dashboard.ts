/**
 * Debug dashboard stats for a specific user
 * Usage: npx tsx --env-file=.env.local scripts/debug-dashboard.ts [username]
 */
import mongoose from 'mongoose'
import { connectDB } from '@/lib/mongodb'
import { QuizSession } from '@/models/QuizSession'
import { User } from '@/models/User'
import { Types } from 'mongoose'

const USERNAME = process.argv[2] || 'nvtruongops'

async function main() {
  await connectDB()

  // Find user
  const user = await User.findOne({ username: USERNAME }).lean() as any
  if (!user) { console.log('❌ User not found:', USERNAME); process.exit(1) }

  console.log('\n=== USER ===')
  console.log('ID:', user._id.toString())
  console.log('Username:', user.username)
  console.log('Role:', user.role)

  const userId = new Types.ObjectId(user._id)

  // Check all sessions
  const allSessions = await QuizSession.find({ student_id: userId }).lean() as any[]
  console.log('\n=== SESSIONS ===')
  console.log('Total sessions:', allSessions.length)
  console.log('Completed:', allSessions.filter(s => s.status === 'completed').length)
  console.log('Active:', allSessions.filter(s => s.status === 'active').length)

  const now = new Date()
  const expiredActive = allSessions.filter(s => s.status === 'active' && new Date(s.expires_at) < now)
  console.log('Active but EXPIRED:', expiredActive.length)

  if (allSessions.length === 0) {
    console.log('\n❌ No sessions found for this user!')
    console.log('   Dashboard will show all zeros because there are no completed sessions.')
    await mongoose.disconnect()
    return
  }

  // Show sample sessions
  console.log('\nSample sessions:')
  allSessions.slice(0, 5).forEach(s => {
    const expired = new Date(s.expires_at) < now
    console.log(`  - ${s._id} | status: ${s.status}${expired ? ' (EXPIRED)' : ''} | score: ${s.score} | answers: ${s.user_answers?.length ?? 0} | expires: ${s.expires_at}`)
  })

  if (expiredActive.length > 0) {
    console.log('\n⚠️  User has expired active sessions that were never submitted.')
    console.log('   These count as "abandoned" - not completed.')
    console.log('   Dashboard shows 0 because no sessions were formally submitted.')
  }

  // Simulate dashboard API active sessions query
  console.log('\n=== ACTIVE SESSIONS FOR DASHBOARD ===')
  const latestActiveIdsByQuiz = await QuizSession.aggregate([
    { $match: { student_id: userId, status: 'active' } },
    { $sort: { started_at: -1 } },
    {
      $group: {
        _id: '$quiz_id',
        latestSessionId: { $first: '$_id' },
        startedAt: { $first: '$started_at' },
      },
    },
    { $sort: { startedAt: -1 } },
    { $limit: 5 },
    { $project: { _id: 0, latestSessionId: 1, startedAt: 1, quizId: '$_id' } },
  ])
  console.log('Active sessions by quiz:', latestActiveIdsByQuiz.length)
  latestActiveIdsByQuiz.forEach(s => {
    console.log(`  - sessionId: ${s.latestSessionId} | quizId: ${s.quizId} | started: ${s.startedAt}`)
  })

  // Run the same aggregate as dashboard API
  console.log('\n=== DASHBOARD AGGREGATE ===')
  const latestStatsResult = await QuizSession.aggregate([
    { $match: { student_id: userId, status: 'completed' } },
    { $sort: { completed_at: -1 } },
    { $group: { _id: '$quiz_id', latestSession: { $first: '$$ROOT' } } },
    { $replaceRoot: { newRoot: '$latestSession' } },
    {
      $lookup: {
        from: 'quizzes',
        localField: 'quiz_id',
        foreignField: '_id',
        as: 'quizDoc',
      },
    },
    { $addFields: { quizDoc: { $arrayElemAt: ['$quizDoc', 0] } } },
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

  console.log('Stats aggregate result:', JSON.stringify(latestStatsResult, null, 2))

  if (latestStatsResult.length === 0) {
    console.log('\n⚠️  Aggregate returned empty - checking why...')

    const completedSessions = await QuizSession.find({ student_id: userId, status: 'completed' }).lean() as any[]
    console.log('Completed sessions count:', completedSessions.length)

    if (completedSessions.length > 0) {
      const s = completedSessions[0]
      console.log('Sample completed session:')
      console.log('  student_id type:', typeof s.student_id, s.student_id?.toString())
      console.log('  userId type:', typeof userId, userId.toString())
      console.log('  Match?', s.student_id?.toString() === userId.toString())
    }
  }

  // Check recent activities
  console.log('\n=== RECENT ACTIVITIES ===')
  const recentIds = await QuizSession.aggregate([
    { $match: { student_id: userId, status: 'completed' } },
    { $sort: { completed_at: -1 } },
    { $group: { _id: '$quiz_id', latestSessionId: { $first: '$_id' }, completedAt: { $first: '$completed_at' } } },
    { $sort: { completedAt: -1 } },
    { $limit: 5 },
  ])
  console.log('Recent quiz IDs:', recentIds.map(r => r._id?.toString()))

  await mongoose.disconnect()
}

main().catch(console.error)
