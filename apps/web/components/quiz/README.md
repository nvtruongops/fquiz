# Quiz components

Components in this folder support quiz discovery, authoring, question bank workflows, active sessions, and result views. Subfolders group UI by the quiz lifecycle.

- `detail/`: quiz detail and result UI.
- `editor/`: quiz authoring UI.
- `explore/`: public catalog and quiz selection UI.
- `question-bank/`: import and question bank UI.
- `session/`: active quiz session UI.
- `shared/`: quiz-specific reusable controls.

Session and scoring rules live in server and feature modules, not in presentation components. See [`docs/ARCHITECTURE.md`](../../../../docs/ARCHITECTURE.md), [`docs/API.md`](../../../../docs/API.md), and [`docs/TESTING.md`](../../../../docs/TESTING.md).
