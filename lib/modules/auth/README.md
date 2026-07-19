# Auth Module (`lib/modules/auth/`)

Module xác thực và phân quyền — JWT, password hashing, role-based access, site settings.

## Cấu trúc

```
auth/
├── models/
│   ├── User.ts                # User model (role, token_version, ban)
│   ├── EmailVerification.ts   # OTP verification
│   ├── LoginLog.ts            # Login audit trail
│   ├── SiteSettings.ts        # Global config (maintenance, LLM)
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

### JWT (jose library)
```
User login → signToken(userId, role, tokenVersion) → set auth-token cookie
                                                     (httpOnly, sameSite: strict, secure)

Request → verifySession() → read cookie → decrypt JWT → check DB:
  1. User tồn tại + active (60s in-memory cache)
  2. token_version trong JWT === token_version trong DB
  → return SessionUser { userId, role, username... }
  → fail: clearUserStatusCache() + 401
```

### Token Rotation
- `JWT_SECRET`: current signing key
- `JWT_SECRET_PREV`: previous key (for transition period)
- Middleware: try verify with `JWT_SECRET` → fallback to `JWT_SECRET_PREV`
- On key rotation: update `JWT_SECRET_PREV = old JWT_SECRET`, set new `JWT_SECRET`

### Token Versioning
- `token_version` in User document incremented on:
  - Password change
  - Admin ban user
- All existing tokens for that user become invalid immediately

## withAuth HOF

```typescript
export function withAuth<P = any>(
  handler: Handler<P>,
  options: { roles?: string[] } = {}
)
```
- Verifies JWT from cookie or Authorization header
- Role check if roles specified
- Injects `payload` (userId, role) into handler
- Returns 401/403 on failure

## UserService

```typescript
class UserService implements IUserService {
  async getUsernames(userIds: string[]): Promise<Map<string, string>>
}
```

Implements `IUserService` interface (defined in quiz module). Used by quiz module for username lookups without importing User model.

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

- Password: `bcryptjs` with cost factor 10
- Email verification: 6-digit OTP, hashed before DB storage
- Password reset: random token, 1h TTL
- `sharing_violations` counter for abuse detection
- Login audit trail via `LoginLog` collection
