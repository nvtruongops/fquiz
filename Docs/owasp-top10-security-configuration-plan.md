# FQuiz OWASP Top 10 (2021) Security Configuration Plan

## 1) Muc tieu va pham vi

Tai lieu nay dinh huong cac thay doi ky thuat de dua du an FQuiz can bang voi OWASP Top 10 (2021), theo huong:

- Kiem soat rui ro theo uu tien kinh doanh va kha nang khai thac.
- Chuyen tu bao mat muc co ban sang mo hinh co kiem soat, co giamsat, co xac minh tu dong.
- Tich hop bao mat vao vong doi phat trien (SDLC) cua du an Next.js + MongoDB.

Pham vi:

- Frontend va API routes tren Next.js App Router.
- Xac thuc, phan quyen, quan ly phien, upload media, config runtime.
- Chuoi cung ung thu vien npm va quy trinh CI/CD.
- Logging, monitoring, va incident response muc do ung dung.

Ngoai pham vi (de xu ly pha sau):

- Bao mat ha tang cloud chi tiet (WAF, network segmentation cap VPC).
- Pentest ben thu 3 quy mo lon.

## 2) Baseline hien trang FQuiz

### 2.1 Kien truc va thanh phan lien quan bao mat

- Framework: Next.js 14 (App Router), API route handlers.
- Auth: JWT HS256, cookie httpOnly auth-token, role admin/student.
- DB: MongoDB qua Mongoose singleton.
- Validation: Zod cho nhieu endpoint.
- Upload media: Cloudinary.
- Logging: pino.
- Security headers: da co CSP + X-Frame-Options + nosniff + Referrer-Policy.

### 2.2 Diem manh hien co

- Co xac thuc JWT va role guard cho nhieu route.
- Co hash mat khau bang bcrypt (10 rounds).
- Co validation input voi Zod o cac API auth/chuc nang chinh.
- Co co che projection du lieu nhay cam cho quiz session.
- Co mot so test bao mat/chuc nang o cap API va property-based tests.

### 2.3 Khoang trong bao mat quan sat duoc

- CSP hien tai van cho phep unsafe-inline va unsafe-eval.
- Rate limit dang luu in-memory, khong on dinh tren serverless scale-out.
- Chua thay co che CSRF token cho cac thao tac state-changing dung cookie.
- Reset token luu plain text trong DB, chua hash token reset.
- Chua co policy quan ly secret rotation/JWT key rotation.
- Chua thay pipeline bat buoc audit dependencies + SAST + secret scanning.
- Logging chua co correlation-id, chua co alerting runbook ro rang.
- Chua co kiem soat outbound request theo allowlist de giam SSRF.

## 3) Danh gia theo OWASP Top 10 (2021)

Bang danh gia:

- Muc do: Cao / Trung binh / Thap
- Trang thai: Da co / Mot phan / Chua co

### A01: Broken Access Control

- Trang thai: Mot phan
- Muc do: Cao
- Hien co:
  - Middleware co phan luong trang va API theo role.
  - verifyToken + requireRole duoc dung trong nhieu route.
- Rui ro con lai:
  - Co nguy co IDOR neu endpoint truy cap tai nguyen theo id nhung khong so huu-check day du.
  - Kiem tra authorization chua duoc chuan hoa thanh middleware chung cho tat ca API.
- Ke hoach:
  - Tao utility authorizeResourceOwnership dung chung cho quiz/session/highlight/history.
  - Viet test matrix RBAC + IDOR cho toan bo endpoint nhay cam.

### A02: Cryptographic Failures

- Trang thai: Mot phan
- Muc do: Cao
- Hien co:
  - Password hash bang bcrypt.
  - Cookie auth-token co httpOnly, secure (production), sameSite lax.
- Rui ro con lai:
  - JWT dung 1 secret tinh, chua rotation/chua versioning (kid).
  - reset_token dang luu plain text.
  - Chua co quy chuan do dai/entropy secret bat buoc trong startup check.
- Ke hoach:
  - Hash reset token (SHA-256 + random token), chi luu hash trong DB.
  - Ap dung JWT key ring (active + previous) va chu ky rotation.
  - Bo sung startup validation cho tat ca secret quan trong.

### A03: Injection

- Trang thai: Mot phan
- Muc do: Cao
- Hien co:
  - Da dung Zod cho nhieu input.
  - Login by username co escapeRegex.
- Rui ro con lai:
  - Van co truy van regex tao tu user input chua escape o mot so route tim kiem.
  - Chua co query hardening pattern thong nhat cho MongoDB ($ operators, regex limits).
- Ke hoach:
  - Tao helper safeRegexFromUserInput (gioi han do dai, timeout-safe pattern).
  - Thay regex tim kiem bang text index hoac exact-prefix voi sanitization.
  - Them test anti-injection (NoSQL operator injection, regex DoS inputs).

### A04: Insecure Design

- Trang thai: Chua co day du
- Muc do: Trung binh-Cao
- Hien co:
  - Co tai lieu requirements/design co phan security.
- Rui ro con lai:
  - Chua co threat model theo luong auth, quiz session, upload media.
  - Chua co abuse-case catalog (credential stuffing, account sharing bypass, scraping).
- Ke hoach:
  - Tao threat model STRIDE nhe cho 5 domain chinh.
  - Dinh nghia security acceptance criteria bat buoc trong PR template.

### A05: Security Misconfiguration

- Trang thai: Mot phan
- Muc do: Cao
- Hien co:
  - Da set mot so security headers tai next.config.js.
- Rui ro con lai:
  - CSP cho phep unsafe-inline/unsafe-eval.
  - Chua co HSTS, Permissions-Policy, COOP/COEP/CORP ro rang.
  - Chua co CORS strategy hien thi ro cho API.
  - Mismatch cau hinh giua dev/staging/prod co the xay ra.
- Ke hoach:
  - Chuyen sang CSP nonces/hash cho script/style va loai bo unsafe-eval.
  - Them bo header day du theo baseline web app hardening.
  - Tao security config matrix theo moi environment.

### A06: Vulnerable and Outdated Components

- Trang thai: Mot phan
- Muc do: Trung binh-Cao
- Hien co:
  - Co su dung package hien dai (Next, Zod, jose, mongoose).
- Rui ro con lai:
  - Chua thay gate bat buoc npm audit/Dependabot/SCA trong CI.
  - Chua co SLA cap nhat patch cho dependency security advisories.
- Ke hoach:
  - Bat Dependabot/Renovate + npm audit --production trong CI.
  - Dat policy: Critical <= 24h, High <= 7 ngay, Medium <= 30 ngay.

### A07: Identification and Authentication Failures

- Trang thai: Mot phan
- Muc do: Cao
- Hien co:
  - Dang nhap, dang xuat, forgot/reset password.
  - Rate limit co ton tai o login route.
- Rui ro con lai:
  - Rate limit in-memory khong hieu qua trong serverless nhieu instance.
  - Chua co MFA cho admin.
  - Chua co session anomaly detection day du (IP/device drift policy).
- Ke hoach:
  - Chuyen rate limit sang MongoDB shared limiter (collection TTL + bucket counter).
  - MFA cho tai khoan admin.
  - Bo sung lockout strategy + audit login events theo threshold.

### A08: Software and Data Integrity Failures

- Trang thai: Chua co day du
- Muc do: Trung binh
- Hien co:
  - Co lockfile va pipeline build/test co ban.
- Rui ro con lai:
  - Chua thay ky artifact/attestation trong build.
  - Chua co verify integrity cua third-party scripts ngoai stricter CSP governance.
- Ke hoach:
  - Ap dung provenance/SBOM cho build artifacts.
  - Kiem soat nghiem script nguon ngoai, uu tien self-host hoac SRI khi phu hop.

### A09: Security Logging and Monitoring Failures

- Trang thai: Mot phan
- Muc do: Trung binh-Cao
- Hien co:
  - Logging JSON voi pino.
  - Co event logs co ban cho JWT/rate-limit/DB.
- Rui ro con lai:
  - Chua co correlation-id xuyen suot request.
  - Chua co canh bao tu dong va runbook ung pho su co.
  - Chua xac dinh ro retention va masking PII.
- Ke hoach:
  - Them request-id middleware + log schema chuan.
  - Tich hop alerting (failed login burst, 5xx spike, suspicious admin actions).
  - Soan incident response playbook va tabletop test.

### A10: Server-Side Request Forgery (SSRF)

- Trang thai: Chua co day du
- Muc do: Trung binh
- Hien co:
  - Upload anh chu yeu thong qua Cloudinary API.
- Rui ro con lai:
  - Upload helper cho phep input image URL, co the kich hoat fetch server-side boi ben thu ba neu khong allowlist chat.
  - Chua co outbound allowlist/chinh sach URL parser cho remote fetch use-cases.
- Ke hoach:
  - Bat buoc base64 upload hoac allowlist host cho remote URL.
  - Chan private IP ranges, localhost, metadata endpoints theo SSRF guard.

## 4) Security Configuration Baseline can dat

### 4.1 HTTP Security Headers (bat buoc)

- Content-Security-Policy:
  - Loai bo unsafe-eval.
  - Giam dan unsafe-inline bang nonce/hash.
  - Them frame-ancestors 'none' (neu khong can embeddable).
  - object-src 'none', base-uri 'self', form-action 'self'.
- Strict-Transport-Security: max-age=31536000; includeSubDomains; preload.
- X-Frame-Options: DENY (hoac SAMEORIGIN neu co ly do).
- X-Content-Type-Options: nosniff.
- Referrer-Policy: strict-origin-when-cross-origin.
- Permissions-Policy: tat cac tinh nang khong dung (camera, microphone, geolocation, ...).
- Cross-Origin-Opener-Policy: same-origin.
- Cross-Origin-Resource-Policy: same-site (canh chinh voi Cloudinary use-case).

### 4.2 Auth va Session baseline

- Cookie auth-token:
  - httpOnly=true, secure=true (prod), sameSite=Lax/Strict theo flow.
  - Xem xet doi ten cookie theo __Host- prefix trong production.
- JWT:
  - Secret length >= 32 bytes random.
  - Key rotation theo lich 90 ngay.
  - Clock skew tolerance va explicit issuer/audience.
- Password reset:
  - Luu hash reset token, token TTL <= 15-30 phut.
  - 1 lan su dung, revoke ngay sau thanh cong.

### 4.3 Validation va data access baseline

- Zod schema bat buoc cho 100% endpoint nhan input.
- Sanitize va gioi han do dai cho tat ca query params tim kiem.
- Cam cac toan tu MongoDB nguy hiem tu input nguoi dung ($where, $regex raw operator payload).
- Standard hoa ownership check cho tai nguyen co user scope.

### 4.4 Logging, monitoring, alerting baseline

- Log schema co: timestamp, level, service, route, request_id, user_id (neu co), outcome.
- Khong log token, password, reset token, cookie.
- Alert toi thieu:
  - brute-force login,
  - tang dot bien 401/403/429,
  - tang 5xx,
  - hanh vi admin bat thuong.

### 4.5 Dependency va supply chain baseline

- CI bat buoc:
  - npm audit (production deps),
  - SAST,
  - secret scanning,
  - license policy check.
- Tu dong mo PR update dependencies va gate theo severity threshold.

## 5) Lo trinh trien khai (90 ngay)

## Phase 0 (Tuan 1-2): Quick Wins - giam rui ro cao ngay

Muc tieu:

- Giam ngay be mat tan cong de khai thac de.

Cong viec:

1. Hardening headers bo sung HSTS, Permissions-Policy, frame-ancestors, object-src.
2. Chot CSP roadmap: bo unsafe-eval truoc, lap backlog loai unsafe-inline.
3. Chuyen log console.error troi noi thanh logger co context.
4. Khoa reset token response o moi moi truong, dam bao khong leak URL token ngoai development controlled.

Deliverables:

- Security headers policy doc + config da cap nhat.
- Risk acceptance list cho cac phan tam thoi chua bo duoc.

## Phase 1 (Tuan 3-5): Auth va Access Control

Muc tieu:

- Dong cac lo hong A01, A07, A02 muc do cao.

Cong viec:

1. Thay rate-limit in-memory bang MongoDB shared limiter.
2. Them CSRF protection cho state-changing requests su dung cookie auth.
3. Hash reset token + rut ngan TTL + enforce one-time use.
4. Standard hoa ownership authorization utility cho API user-scoped.
5. Them MFA cho admin (totp hoac email otp).

Deliverables:

- Auth hardening complete checklist.
- Bo test integration cho auth flows va IDOR.

## Phase 2 (Tuan 6-8): Injection, Misconfiguration, SSRF

Muc tieu:

- Dong A03, A05, A10 o muc policy + implementation.

Cong viec:

1. Refactor cac query regex user-input sang safe helper / text index.
2. CSP nonce/hash implementation cho script/style quan trong.
3. Bo sung CORS policy ro rang cho API.
4. Them SSRF guard cho remote URL processing (allowlist + private IP block).

Deliverables:

- Security config matrix cho dev/staging/prod.
- Test suite anti-injection va SSRF negative cases.

## Phase 3 (Tuan 9-12): Monitoring, Supply Chain, Governance

Muc tieu:

- Hoan thien A06, A08, A09 va van hanh ben vung.

Cong viec:

1. Bat SCA/SAST/secret scanning trong CI voi policy fail-the-build.
2. Them request-id, log schema chuan, dashboard canh bao.
3. Soan incident response playbook + dien tap su co (tabletop).
4. Tao threat model va cap nhat Security Requirements gate trong PR.

Deliverables:

- Bao cao maturity truoc/sau.
- SOP ung pho su co va tai lieu van hanh bao mat.

## 6) Backlog ky thuat chi tiet theo nhom file

Nhom 1 - Runtime config va headers:

- next.config.js:
  - Cap nhat CSP directives va bo sung header thieu.
- middleware.ts:
  - Giam leakage thong tin loi, bo sung request-id propagation.

Nhom 2 - Auth API:

- app/api/auth/login/route.ts:
  - Thay failedAttempts Map bang shared rate limiter.
  - Them anti-automation controls (progressive delay/captcha policy tuong lai).
- app/api/auth/forgot-password/route.ts:
  - Token generation + hash persist + anti-abuse throttle.
- app/api/auth/reset-password/route.ts:
  - Verify token hash, revoke one-time, logging security event.

Nhom 3 - Data/query hardening:

- Cac route tim kiem, list admin, list student co nhan search query:
  - sanitize + length limit + safe query strategy.

Nhom 4 - Upload/media:

- lib/cloudinary.ts:
  - Restrict image input type.
  - SSRF guard cho URL mode.
- lib/image-utils.ts:
  - Tai su dung allowlist parser thong nhat.

Nhom 5 - Logging va observability:

- lib/logger.ts:
  - Add helper redact fields + structured event contracts.
- Toan bo API handlers:
  - Chuyen tu console.* sang logger co request context.

## 7) Chi so thanh cong (KPI)

- 100% endpoint state-changing co CSRF protection hoac co ly do loai tru duoc phe duyet.
- 100% endpoint nhan input co schema validation.
- 0 Critical va 0 High vulnerability qua 7 ngay khong xu ly.
- >= 90% endpoint nhay cam co test authz (role + ownership + idor).
- MTTD su co bao mat < 30 phut, MTTR < 4 gio cho su co muc do cao.

## 8) Tieu chi nghiem thu (Definition of Done)

Mot hang muc bao mat duoc xem la hoan tat khi:

1. Da co thay doi code/config + test tuong ung.
2. Da cap nhat tai lieu van hanh (runbook/policy).
3. Da duoc review boi it nhat 1 reviewer co trach nhiem security.
4. Da qua gate CI security.
5. Da co rollback plan neu thay doi anh huong production.

## 9) Ke hoach kiem thu va xac minh

Kiem thu tu dong can co:

- Unit test cho helper auth/security utils.
- Integration test cho login, forgot/reset, cookie policy, RBAC/IDOR.
- Negative tests cho injection payloads va SSRF payloads.
- CI security jobs: npm audit, SAST, secret scan.

Kiem thu thu cong (hang thang):

- Review headers bang browser security scanner.
- Thu exploit co kiem soat cho top abuse cases.
- Review random 20 log events de dam bao redaction dung.

## 10) Van hanh va quan tri

- Tao Security Champion cho team (1 nguoi chinh + 1 backup).
- Review backlog OWASP moi sprint, gan severity va due date.
- Quarterly review:
  - Cap nhat threat model,
  - Danh gia lai OWASP scorecard,
  - Chot muc tieu quy tiep theo.

## 11) Scorecard muc tieu sau 90 ngay

- A01: Mot phan -> Da co (co ownership check + test matrix)
- A02: Mot phan -> Da co (hash reset token + JWT rotation)
- A03: Mot phan -> Da co (safe query pattern enforce)
- A04: Chua co -> Mot phan/Da co (co threat model + abuse cases)
- A05: Mot phan -> Da co (headers + env matrix + CSP hardening)
- A06: Mot phan -> Da co (SCA + policy SLA)
- A07: Mot phan -> Da co (shared rate limit + MFA admin)
- A08: Chua co -> Mot phan/Da co (SBOM/provenance tu muc tieu)
- A09: Mot phan -> Da co (request-id + alerting + runbook)
- A10: Chua co -> Da co (SSRF guard policy)

## 12) Uu tien implementation ngay sau khi phe duyet

Top 5 viec nen lam truoc:

1. Chuyen rate-limit login sang MongoDB shared limiter.
2. Hash reset token + revoke one-time + throttle forgot-password.
3. Hardening CSP/header (loai unsafe-eval truoc).
4. Standard hoa authz ownership check cho API user-scoped.
5. Bat security gates trong CI (audit + SAST + secret scan).

Neu can trien khai theo cach it rui ro nhat, thuc hien theo thu tu: 1 -> 2 -> 3 -> 4 -> 5.
