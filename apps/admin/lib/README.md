# Admin application services

This directory contains Admin-specific server helpers, including authentication, database access, schemas, security utilities, and formatting helpers.

- Reuse shared authentication, database, and model packages when the behavior is common to both applications.
- Keep Admin-only behavior here; do not import implementation files from `apps/web`.
- Confirm route callers before changing authorization or data-access helpers.
