# Auth Module (`lib/modules/auth/`)

Authentication and authorization module — JWT lifecycle, password hashing, role-based access control (RBAC), and site settings.

## Structure

```
auth/
├── models/
│   ├── User.ts                # User model (role, token_version, ban status)
│   ├── EmailVerification.ts   # OTP verification
│   ├── LoginLog.ts            # Login audit trail
│   ├── SiteSettings.ts        # Global config (maintenance, LLM keys)
│   └── Feedback.ts            # User feedback
├── types/
│   ├── user.ts                # IUser interface
│   ├── settings.ts            # ISiteSettings, ILLMConfig
│   └── login-log.ts           # ILoginLog
├── schemas/
│   ├── auth.ts                # LoginSchema, RegisterSchema
│   └── user.ts                # UpdateUserSchema, UpdateSiteSettingsSchema
├── services/
│   └── UserService.ts         # IUserService implementation
├── auth.ts                    # JWT sign/verify, token rotation, user status cache
├── authz.ts                   # Resource authorization
├── dal.ts                     # verifySession(), requireAuth(), requireAdmin()
├── with-auth.ts               # withAuth() HOF — API route protection
├── verification-code.ts       # OTP generation/validation
├── index.ts                   # registerModel() bootstrap (5 models)
└── __tests__/
```

## Core Auth Flow

### JWT (`jose` library)
```
User login → signToken(userId, role, tokenVersion) → set auth-token cookie
                                                     (httpOnly, sameSite: strict, secure)

Request → verifySession() → read cookie → decrypt JWT → check DB:
  1. User exists and is active (60s in-memory cache)
  2. token_version in JWT === token_version in DB
  → return SessionUser { userId, role, username... }
  → fail: clearUserStatusCache() + 401 Unauthorized
```

### Token Rotation
- `JWT_SECRET`: Current active signing key
- `JWT_SECRET_PREV`: Previous key (for seamless transition during key rotation)
- Verification: Attempt verify with `JWT_SECRET` $\rightarrow$ fallback to `JWT_SECRET_PREV`
- On key rotation: Set `JWT_SECRET_PREV = old JWT_SECRET`, deploy new `JWT_SECRET`

### Token Versioning
- `token_version` in User document is incremented upon:
  - Password change
  - Admin banning the user
- All existing active tokens for that user are immediately invalidated

## withAuth HOF

```typescript
export function withAuth<P = any>(
  handler: Handler<P>,
  options: { roles?: string[] } = {}
)
```
- Verifies JWT from cookie or `Authorization` header
- Performs role check if `roles` are specified
- Injects verified `payload` (`userId`, `role`) into the route handler
- Returns 401 Unauthorized or 403 Forbidden upon failure

## UserService

```typescript
class UserService implements IUserService {
  async getUsernames(userIds: string[]): Promise<Map<string, string>>
}
```

Implements the `IUserService` interface (defined in the quiz module). Used by the quiz module for username batch lookups without cross-importing the `User` model.

## SiteSettings

```typescript
interface ISiteSettings {
  maintenance_mode: boolean
  public_access_enabled: boolean
  rate_limit_enabled: boolean
  rate_limit_max_requests: number
  rate_limit_window_ms: number
  llm_config: {
    active_provider: 'gemini' | 'openai' | 'custom'
    openai: { apiKey, baseUrl, model }
    gemini: { apiKey, model }
    custom: { apiKey, baseUrl, model }
  }
}
```

## Security Features

- Passwords: `bcryptjs` with salt work factor 10
- Email verification: 6-digit OTP, hashed before DB persistence
- Password reset: Cryptographically secure random token, 1-hour TTL
- `sharing_violations` counter for account sharing abuse detection
- Login audit trail via `LoginLog` collection
