# Cải Thiện Bảo Mật - Next.js 16 DAL Pattern

## Tổng Quan

Dự án đã được cập nhật để tuân thủ **Next.js 16 Authentication Best Practices**, loại bỏ các lỗ hổng bảo mật nghiêm trọng.

## Các Vấn Đề Đã Được Fix

### ❌ Trước Đây (Không An Toàn)

1. **Không kiểm tra user banned**
   - `/api/auth/me` chỉ kiểm tra user tồn tại
   - User bị banned vẫn truy cập được hệ thống
   - Navbar hiển thị bình thường cho user banned

2. **Không có route protection**
   - User chưa đăng nhập vào được URL trực tiếp
   - Layouts không redirect
   - Client-side authentication dễ bypass

3. **JWT cũ vẫn hoạt động**
   - Admin ban user → User vẫn dùng được trong 60s (cache)
   - Không clear session ngay lập tức

### ✅ Sau Khi Fix (An Toàn)

## 1. Data Access Layer (DAL)

Tạo file `lib/dal.ts` theo Next.js 16 best practices:

```typescript
// Verify session với cache deduplication
export const verifySession = cache(async (): Promise<SessionUser | null> => {
  // 1. Verify JWT token
  // 2. Check user trong database
  // 3. Check banned status
  // 4. Check token version
})

// Require authentication (throw nếu không đăng nhập)
export async function requireAuth(): Promise<SessionUser>

// Require admin role
export async function requireAdmin(): Promise<SessionUser>
```

**Lợi ích:**
- ✅ Kiểm tra auth gần với data access (không phải ở edge)
- ✅ Tự động dedupe requests trong cùng 1 render
- ✅ Kiểm tra banned status mỗi request
- ✅ An toàn hơn middleware (theo Next.js team)

## 2. Layout Protection

### Student Layout (`app/(student)/layout.tsx`)
```typescript
export default async function StudentLayout({ children }) {
  const user = await verifySession()
  
  if (!user) {
    redirect('/login') // ← Redirect ngay nếu chưa đăng nhập
  }
  
  return <Navbar initialUser={user} />
}
```

### Admin Layout (`app/(admin)/admin/layout.tsx`)
```typescript
export default async function AdminLayout({ children }) {
  try {
    await requireAdmin() // ← Throw nếu không phải admin
  } catch {
    redirect('/login')
  }
  
  return <AdminSidebar />
}
```

### Auth Layout (`app/(auth)/layout.tsx`)
```typescript
export default async function AuthLayout({ children }) {
  const user = await verifySession()
  
  if (user) {
    // Đã đăng nhập → redirect về dashboard
    redirect(user.role === 'admin' ? '/admin' : '/dashboard')
  }
  
  return <LoginForm />
}
```

## 3. API Banned Check

### `/api/auth/me`
```typescript
const user = await User.findById(userId).select('status')

if (user.status === 'banned') {
  const response = NextResponse.json({ user: null, banned: true }, { status: 403 })
  response.cookies.delete('auth-token') // ← Clear cookie ngay
  return response
}
```

### `/api/admin/users/[id]` (Ban User)
```typescript
await User.findByIdAndUpdate(id, { status: 'banned' })

// Clear cache ngay lập tức
clearUserStatusCache(id) // ← User bị kick ngay, không đợi 60s
```

## 4. Client-Side Handling

### Navbar Component
```typescript
useEffect(() => {
  fetch('/api/auth/me').then(async (res) => {
    if (res.status === 403) {
      const data = await res.json()
      if (data.banned) {
        // Redirect với message
        window.location.href = '/login?reason=account_banned'
      }
    }
  })
}, [])
```

### Login Page
```typescript
// Hiển thị thông báo dựa trên URL params
const reason = params.get('reason')

if (reason === 'account_banned') {
  toast.error('Tài khoản của bạn đã bị khóa bởi quản trị viên.')
} else if (reason === 'session_expired') {
  toast.error('Phiên đăng nhập đã hết hạn.')
}
```

## 5. Cache Management

### `lib/auth.ts`
```typescript
// Clear cache khi admin ban/unban user
export function clearUserStatusCache(userId: string): void {
  userStatusCache.delete(userId)
}

// Clear all cache cho bulk operations
export function clearAllUserStatusCache(): void {
  userStatusCache.clear()
}
```

## Tại Sao Không Dùng Middleware?

### ❌ Middleware/Proxy (Deprecated trong Next.js 16)

```typescript
// KHÔNG NÊN LÀM NHƯ NÀY
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')
  
  // ⚠️ Vấn đề:
  // 1. Chạy ở Edge Runtime - không thể query DB phức tạp
  // 2. CVE-2025-29927 - lỗ hổng bảo mật
  // 3. Next.js team không khuyến nghị
  // 4. Khó debug và maintain
}
```

### ✅ DAL Pattern (Recommended)

```typescript
// NÊN LÀM NHƯ NÀY
export default async function ProtectedPage() {
  const user = await verifySession() // ← Server Component
  
  if (!user) redirect('/login')
  
  // ✅ Lợi ích:
  // 1. Chạy ở Node.js Runtime - query DB thoải mái
  // 2. An toàn hơn (theo Next.js team)
  // 3. Dễ test và debug
  // 4. Cache tự động với React cache()
}
```

## Flow Bảo Mật Mới

### 1. User Chưa Đăng Nhập
```
User → /dashboard
  ↓
Layout: verifySession() → null
  ↓
redirect('/login')
```

### 2. User Đã Đăng Nhập Nhưng Bị Ban
```
User → /dashboard
  ↓
Layout: verifySession()
  ↓
Check DB: status = 'banned'
  ↓
Return null
  ↓
redirect('/login')
```

### 3. Admin Ban User (Real-time)
```
Admin → Click "Ban User"
  ↓
API: Update status = 'banned'
  ↓
clearUserStatusCache(userId) ← Clear cache ngay
  ↓
User's next request:
  ↓
verifySession() → Check DB (cache miss)
  ↓
status = 'banned' → Return null
  ↓
redirect('/login?reason=account_banned')
```

## Testing

### Test 1: User Chưa Đăng Nhập
```bash
# Xóa cookie
# Truy cập /dashboard
# Expected: Redirect về /login
```

### Test 2: User Bị Ban
```bash
# Admin ban user
# User refresh trang
# Expected: Redirect về /login với message "Tài khoản đã bị khóa"
```

### Test 3: User Đã Đăng Nhập Vào Auth Pages
```bash
# Đăng nhập
# Truy cập /login
# Expected: Redirect về /dashboard
```

## References

- [Next.js 16 Authentication Guide](https://nextjs.org/docs/app/guides/authentication)
- [CVE-2025-29927 Security Vulnerability](https://www.franciscomoretti.com/blog/modern-nextjs-authentication-best-practices)
- [Data Access Layer Pattern](https://nextjs.org/docs/app/building-your-application/data-fetching/patterns#data-access-layer)

## Kết Luận

✅ **Đã fix tất cả 3 vấn đề bảo mật:**
1. ✅ Kiểm tra banned status trong mọi request
2. ✅ Route protection với DAL pattern
3. ✅ Clear cache ngay khi admin ban user

✅ **Tuân thủ Next.js 16 best practices**
✅ **An toàn hơn, dễ maintain hơn**
✅ **Performance tốt hơn với React cache()**
