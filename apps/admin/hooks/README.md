# Admin hooks

Hooks in this directory coordinate Admin-side queries, form state, and mutations. They are organized by domain under folders such as `categories/`, `question-bank/`, `quiz/`, `quizzes/`, and `users/`.

Keep authorization and persistence checks on the server. A client hook may improve interaction flow but does not replace API validation. See [`docs/SECURITY.md`](../../../docs/SECURITY.md) and [`docs/TESTING.md`](../../../docs/TESTING.md).
