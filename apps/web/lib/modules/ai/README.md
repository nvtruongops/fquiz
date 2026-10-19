# AI feature module

This module owns Web-side AI prompts, content-generation services, AI asset persistence, and quiz-assistant orchestration.

- Prompt definitions and prompt registry live under `prompts/`.
- Request orchestration and feature services live alongside the module entry point.
- Follow [`docs/AI_CHATBOT_SPEC.md`](../../../../../docs/AI_CHATBOT_SPEC.md) for the documented assistant scope and [`docs/SECURITY.md`](../../../../../docs/SECURITY.md) for handling user input and secrets.
- Treat provider output as untrusted input and validate it at the boundary.
