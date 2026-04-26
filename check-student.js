const mongoose = require('mongoose')
require('dotenv').config({ path: '.env.local' })

// Models
const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  role: String,
  status: String,
  created_at: Date
}, { collection: 'users' })

const sessionSchema = new mongoose.Schema({
  student_id: mongoose.Schema.Types.ObjectId,
  quiz_id: mongoose.Schema.Types.ObjectId,
  status: String,
  score: Number,
  user_answers: Array,
  completed_at: Date,
  started_at: Date,
  mode: String
}, { collection: 'quizsessions' })

const quizSchema = new mongoose.Schema({
  title: String,
  course_code: String,
  created_by: mongoose.Schema.Types.ObjectId,
  questionCount: Number
}, { collection: 'quizzes' })

const User = mongoose.model('User', userSchema)
const QuizSession = mongoose.model('QuizSession', sessionSchema)
const Quiz = mongoose.model('Quiz', quizSchema)

async function checkStudent() {
  try {
    await mongoose.connect(process.env.MONGODB_URI)
    console.log('Connected to MongoDB')

    const email = 'nvtruongops@gmail.com'
    console.log('Checking student:', email)

    // Tìm user
    const user = await User.findOne({ email: email })
    if (!user) {
      console.log('❌ User not found')
      
      // Tìm user tương tự
      const similarUsers = await User.find({ 
        email: { $regex: 'conchimnon', $options: 'i' } 
      }).limit(5)
      console.log('Similar users found:', similarUsers.map(u => ({ email: u.email, username: u.username })))
      return
    }

    console.log('\n--- User Info ---')
    console.log('ID:', user._id)
    console.log('Username:', user.username)
    console.log('Email:', user.email)
    console.log('Role:', user.role)
    console.log('Status:', user.status)
    console.log('Created:', user.created_at)

    // Kiểm tra sessions
    console.log('\n--- Learning Sessions ---')
    const sessions = await QuizSession.find({ 
      student_id: user._id 
    })
    .sort({ started_at: -1 })
    .lean()

    console.log(`Total sessions: ${sessions.length}`)

    if (sessions.length === 0) {
      console.log('❌ No learning sessions found')
      
      // Kiểm tra có quiz nào user tạo không
      console.log('\n--- Created Quizzes ---')
      const createdQuizzes = await Quiz.find({ created_by: user._id }).lean()
      console.log(`Quizzes created: ${createdQuizzes.length}`)
      
      if (createdQuizzes.length > 0) {
        createdQuizzes.forEach(quiz => {
          console.log(`- ${quiz.title || 'Untitled'} (${quiz.course_code || 'No code'})`)
        })
      }
      
      // Kiểm tra có saved quizzes không
      const savedQuizSchema = new mongoose.Schema({
        user_id: mongoose.Schema.Types.ObjectId,
        quiz_id: mongoose.Schema.Types.ObjectId,
        saved_at: Date
      }, { collection: 'savedquizzes' })
      
      const SavedQuiz = mongoose.model('SavedQuiz', savedQuizSchema)
      const savedQuizzes = await SavedQuiz.find({ user_id: user._id }).lean()
      console.log(`Saved quizzes: ${savedQuizzes.length}`)
      
      // Kiểm tra highlights
      const highlightSchema = new mongoose.Schema({
        user_id: mongoose.Schema.Types.ObjectId,
        quiz_id: mongoose.Schema.Types.ObjectId,
        created_at: Date
      }, { collection: 'userhighlights' })
      
      const Highlight = mongoose.model('Highlight', highlightSchema)
      const highlights = await Highlight.find({ user_id: user._id }).lean()
      console.log(`Highlights: ${highlights.length}`)
      
      // Kiểm tra feedback
      const feedbackSchema = new mongoose.Schema({
        user_id: mongoose.Schema.Types.ObjectId,
        message: String,
        created_at: Date
      }, { collection: 'feedbacks' })
      
      const Feedback = mongoose.model('Feedback', feedbackSchema)
      const feedbacks = await Feedback.find({ user_id: user._id }).lean()
      console.log(`Feedbacks submitted: ${feedbacks.length}`)
      
      // Kiểm tra login logs
      const loginLogSchema = new mongoose.Schema({
        user_id: mongoose.Schema.Types.ObjectId,
        login_at: Date,
        ip_address: String
      }, { collection: 'loginlogs' })
      
      const LoginLog = mongoose.model('LoginLog', loginLogSchema)
      const loginLogs = await LoginLog.find({ user_id: user._id })
        .sort({ login_at: -1 })
        .limit(5)
        .lean()
      console.log(`Recent logins: ${loginLogs.length}`)
      
      if (loginLogs.length > 0) {
        console.log('Login details:')
        loginLogs.forEach((log, i) => {
          console.log(`  ${i+1}. ${log.login_at || log.created_at || 'Unknown time'} - IP: ${log.ip_address || 'Unknown'}`)
        })
      }
      
      return
    }

    // Thống kê sessions
    const statusCount = {}
    const modeCount = {}
    sessions.forEach(s => {
      statusCount[s.status] = (statusCount[s.status] || 0) + 1
      modeCount[s.mode] = (modeCount[s.mode] || 0) + 1
    })

    console.log('Sessions by status:', statusCount)
    console.log('Sessions by mode:', modeCount)

    // Lấy quiz IDs
    const quizIds = [...new Set(sessions.map(s => s.quiz_id.toString()))]
    console.log(`Unique quizzes attempted: ${quizIds.length}`)

    // Lấy thông tin quizzes
    const quizzes = await Quiz.find({ 
      _id: { $in: quizIds.map(id => new mongoose.Types.ObjectId(id)) } 
    }).lean()

    console.log('\n--- Quiz Details ---')
    for (const quiz of quizzes) {
      const quizSessions = sessions.filter(s => s.quiz_id.toString() === quiz._id.toString())
      const completedSessions = quizSessions.filter(s => s.status === 'completed')
      
      console.log(`\n📚 ${quiz.title || 'Untitled Quiz'}`)
      console.log(`   Course: ${quiz.course_code || 'N/A'}`)
      console.log(`   Questions: ${quiz.questionCount || 0}`)
      console.log(`   Total attempts: ${quizSessions.length}`)
      console.log(`   Completed: ${completedSessions.length}`)
      
      if (completedSessions.length > 0) {
        const scores = completedSessions.map(s => s.score || 0)
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
        const maxScore = Math.max(...scores)
        console.log(`   Average score: ${avgScore.toFixed(1)}`)
        console.log(`   Best score: ${maxScore}`)
      }
    }

    // Recent activity
    console.log('\n--- Recent Activity (Last 5) ---')
    const recentSessions = sessions.slice(0, 5)
    for (const session of recentSessions) {
      const quiz = quizzes.find(q => q._id.toString() === session.quiz_id.toString())
      console.log(`${session.started_at?.toISOString().split('T')[0]} - ${quiz?.title || 'Unknown Quiz'} (${session.status})`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await mongoose.disconnect()
  }
}

checkStudent()