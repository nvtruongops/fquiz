import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const sampleJSON = {
  title: "Sample Quiz",
  description: "This is a sample quiz for testing import functionality",
  category: "General",
  questions: [
    {
      question: "What is 2 + 2?",
      options: ["3", "4", "5", "6"],
      correctAnswer: 1,
      explanation: "2 + 2 equals 4"
    },
    {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      explanation: "Paris is the capital of France"
    }
  ]
}

const sampleTXT = `Title: Sample Quiz
Description: This is a sample quiz for testing import functionality
Category: General

Q: What is 2 + 2?
A) 3
B) 4 [correct]
C) 5
D) 6
Explanation: 2 + 2 equals 4

Q: What is the capital of France?
A) London
B) Berlin
C) Paris [correct]
D) Madrid
Explanation: Paris is the capital of France
`

async function uploadSamples() {
  try {
    console.log('Uploading JSON sample...')
    const jsonResult = await cloudinary.uploader.upload(
      `data:application/json;base64,${Buffer.from(JSON.stringify(sampleJSON, null, 2)).toString('base64')}`,
      {
        folder: 'fquiz/import-samples',
        public_id: 'quiz-valid-json',
        resource_type: 'raw',
        overwrite: true,
      }
    )
    console.log('JSON uploaded:', jsonResult.secure_url)

    console.log('Uploading TXT sample...')
    const txtResult = await cloudinary.uploader.upload(
      `data:text/plain;base64,${Buffer.from(sampleTXT).toString('base64')}`,
      {
        folder: 'fquiz/import-samples',
        public_id: 'quiz-valid-txt',
        resource_type: 'raw',
        overwrite: true,
      }
    )
    console.log('TXT uploaded:', txtResult.secure_url)

    console.log('\nUpdate these URLs in components/quiz/QuizImportPanel.tsx:')
    console.log(`const CLOUDINARY_SAMPLE_JSON_URL = '${jsonResult.secure_url}'`)
    console.log(`const CLOUDINARY_SAMPLE_TXT_URL = '${txtResult.secure_url}'`)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

uploadSamples()
