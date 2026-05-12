async function testMix() {
  try {
    const response = await fetch('http://localhost:3000/api/sessions/mix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quiz_ids: ["663c9a6e1234567890abcdef", "663c9a6f1234567890abcdef"],
        question_count: 10,
        mode: 'immediate',
        difficulty: 'random'
      })
    });
    const status = response.status;
    const data = await response.json();
    console.log('Status:', status);
    console.log('Data:', data);
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testMix();
