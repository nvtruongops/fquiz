# Authentication feature module

This module contains Web authentication flows, authorization helpers, user-facing auth schemas, and account-related services. Shared primitives belong in [`packages/auth`](../../../../../packages/auth/README.md).

Keep credential handling and access decisions on the server. When changing a guard or token flow, inspect route callers and update [`docs/SECURITY.md`](../../../../../docs/SECURITY.md) if the documented contract changes.
