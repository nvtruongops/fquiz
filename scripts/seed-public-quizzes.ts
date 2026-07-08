/**
 * Seed public quizzes for testing /explore page
 * Run: npx tsx scripts/seed-public-quizzes.ts
 */
import mongoose from 'mongoose'
import { Quiz } from '../models/Quiz'
import { Category } from '../models/Category'
import { User } from '../models/User'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fquiz'

async function seedPublicQuizzes() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✓ Connected to MongoDB')

    // Find or create a public category
    let category = await Category.findOne({ is_public: true, status: 'approved' })
    
    if (!category) {
      category = await Category.create({
        name: 'Toán học',
        is_public: true,
        status: 'approved',
        type: 'public',
        owner_id: null,
      })
      console.log('✓ Created public category:', category.name)
    } else {
      console.log('✓ Using existing category:', category.name)
    }

    // Find admin user or create one
    let adminUser = await User.findOne({ role: 'admin' })
    
    if (!adminUser) {
      console.log('⚠ No admin user found. Creating one...')
      const bcrypt = await import('bcryptjs')
      const hashedPassword = await bcrypt.default.hash('Admin@123456', 10)
      
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@fquiz.dev',
        password: hashedPassword,
        role: 'admin',
        is_verified: true,
      })
      console.log('✓ Created admin user')
    }

    // Sample quiz data
    const sampleQuizzes = [
      {
        title: 'Đại số cơ bản',
        description: 'Kiểm tra kiến thức về đại số cơ bản',
        course_code: 'MATH101',
        questions: [
          {
            text: '2 + 2 = ?',
            options: ['3', '4', '5', '6'],
            correct_answer: [1],
            explanation: '2 + 2 = 4',
          },
          {
            text: '5 × 3 = ?',
            options: ['10', '15', '20', '25'],
            correct_answer: [1],
            explanation: '5 × 3 = 15',
          },
          {
            text: '10 - 7 = ?',
            options: ['2', '3', '4', '5'],
            correct_answer: [1],
            explanation: '10 - 7 = 3',
          },
        ],
      },
      {
        title: 'Hình học cơ bản',
        description: 'Các câu hỏi về hình học',
        course_code: 'MATH102',
        questions: [
          {
            text: 'Hình vuông có mấy cạnh?',
            options: ['3', '4', '5', '6'],
            correct_answer: [1],
            explanation: 'Hình vuông có 4 cạnh',
          },
          {
            text: 'Tổng các góc trong tam giác bằng bao nhiêu độ?',
            options: ['90°', '180°', '270°', '360°'],
            correct_answer: [1],
            explanation: 'Tổng các góc trong tam giác = 180°',
          },
        ],
      },
      {
        title: 'Phân số và số thập phân',
        description: 'Bài tập về phân số và số thập phân',
        course_code: 'MATH103',
        questions: [
          {
            text: '1/2 = ?',
            options: ['0.25', '0.5', '0.75', '1.0'],
            correct_answer: [1],
            explanation: '1/2 = 0.5',
          },
          {
            text: '3/4 + 1/4 = ?',
            options: ['1/2', '3/4', '1', '5/4'],
            correct_answer: [2],
            explanation: '3/4 + 1/4 = 4/4 = 1',
          },
          {
            text: '0.25 × 4 = ?',
            options: ['0.5', '1', '2', '4'],
            correct_answer: [1],
            explanation: '0.25 × 4 = 1',
          },
        ],
      },
    ]

    // Create or update quizzes
    for (const quizData of sampleQuizzes) {
      const existing = await Quiz.findOne({
        course_code: quizData.course_code,
        created_by: adminUser._id,
      })

      if (existing) {
        console.log(`⚠ Quiz ${quizData.course_code} already exists, skipping...`)
        continue
      }

      const quiz = await Quiz.create({
        ...quizData,
        category_id: category._id,
        created_by: adminUser._id,
        is_public: true,
        status: 'published',
        questionCount: quizData.questions.length,
        studentCount: Math.floor(Math.random() * 100) + 10, // Random student count for demo
      })

      console.log(`✓ Created quiz: ${quiz.course_code} (${quiz._id})`)
    }

    console.log('\n✅ Seeding completed!')
    console.log('\nYou can now visit /explore to see these quizzes')
    
  } catch (error) {
    console.error('❌ Error seeding data:', error)
    process.exit(1)
  } finally {
    await mongoose.disconnect()
    console.log('\n✓ Disconnected from MongoDB')
  }
}

seedPublicQuizzes()
