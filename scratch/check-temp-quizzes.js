require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkTempQuizzes() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const Quiz = mongoose.connection.collection('quizzes');
  const QuizSession = mongoose.connection.collection('quizsessions');
  const User = mongoose.connection.collection('users');

  const user = await User.findOne({ username: 'nvtruongops' });
  if (!user) {
    console.log('User nvtruongops not found');
    process.exit(1);
  }

  const userId = user._id;
  console.log('User ID:', userId);

  const tempQuizzes = await Quiz.find({ created_by: userId, is_temp: true }).toArray();
  console.log('Found', tempQuizzes.length, 'temp quizzes for user:');
  tempQuizzes.forEach(q => {
    console.log(`- Quiz ID: ${q._id}, Title: ${q.title}, Created At: ${q.created_at || q.createdAt}`);
  });

  const tempSessions = await QuizSession.find({ student_id: userId, is_temp: true }).toArray();
  console.log('\nFound', tempSessions.length, 'temp sessions for user:');
  tempSessions.forEach(s => {
    console.log(`- Session ID: ${s._id}, Quiz ID: ${s.quiz_id}, Status: ${s.status}, Started At: ${s.started_at}`);
  });

  mongoose.disconnect();
}

checkTempQuizzes().catch(console.error);
