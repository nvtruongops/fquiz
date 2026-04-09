import { v2 as cloudinary } from 'cloudinary'
import * as fs from 'fs'
import * as path from 'path'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

async function uploadTxtSample() {
  try {
    const filePath = path.join(process.cwd(), 'quiz-valid-txt.txt')
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    
    console.log('Uploading TXT sample from local file...')
    const txtResult = await cloudinary.uploader.upload(
      `data:text/plain;base64,${Buffer.from(fileContent).toString('base64')}`,
      {
        folder: 'fquiz/import-samples',
        public_id: 'quiz-valid-txt',
        resource_type: 'raw',
        overwrite: true,
      }
    )
    console.log('TXT uploaded successfully!')
    console.log('URL:', txtResult.secure_url)
    console.log('\nUpdate this URL in components/quiz/QuizImportPanel.tsx:')
    console.log(`const CLOUDINARY_SAMPLE_TXT_URL = '${txtResult.secure_url}'`)
  } catch (error) {
    console.error('Upload failed:', error)
  }
}

uploadTxtSample()
