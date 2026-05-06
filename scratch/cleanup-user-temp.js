require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function cleanupOldTemp() {
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
  const oldQuizId = new mongoose.Types.ObjectId('69f5e3e1dcb9eb60e1afc219');

  console.log('Cleaning up quiz:', oldQuizId);

  const sessionDel = await QuizSession.deleteMany({ quiz_id: oldQuizId, student_id: userId, is_temp: true });
  console.log('Deleted sessions:', sessionDel.deletedCount);

  const quizDel = await Quiz.deleteOne({ _id: oldQuizId, is_temp: true });
  console.log('Deleted quiz:', quizDel.deletedCount);

  mongoose.disconnect();
}

cleanupOldTemp().catch(console.error);
