# Web core infrastructure

This folder contains app-wide infrastructure shared by Web feature modules, including database connection helpers, model registration, API utilities, security, AI providers, cache, events, search, and dependency wiring.

Use shared packages for behavior that must be consumed by both apps. Keep feature-specific rules in [`../modules/`](../modules/README.md), and avoid adding detailed file lists here because the source tree changes more often than this boundary guide.
