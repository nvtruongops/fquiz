# Test helpers

This directory contains shared test support code. It is not itself a Jest suite; Jest discovers test files according to `jest.config.ts`.

Keep reusable harness behavior small and explicit. Place tests beside their owning package or app using the configured `.test.ts` or `.test.tsx` patterns. See [`docs/TESTING.md`](../docs/TESTING.md).
