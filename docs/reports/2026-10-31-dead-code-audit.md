# Báo cáo scan dead code — 31/10/2026

Phạm vi: working tree hiện tại tại `D:/Code/fquiz`, bao gồm thay đổi chưa commit. Local HEAD `004634197d01af77b877a43c488d8a178622bb01`; remote-tracking main `ee076c3058e79213a236ac79ce48b3026e35a9cf`. Local đang ahead 47/behind 52. Báo cáo này không đại diện nguyên trạng code trên VPS/main đã deploy.

Đã dùng Fallow 3.37.0, kiểm tra import/dynamic import, barrel exports, DI registration và references bằng `rg`; ba agent rà UI, shared packages và core modules độc lập. Chỉ đọc source; không sửa/xoá source, không chạy test, không sửa database/push/deploy.

## Kết quả máy quét

| Nhóm | Scan mặc định | Scan hiệu chỉnh entrypoints |
| --- | ---: | ---: |
| Unused files | 118 | 18 |
| Unused exports | 127 | 127 |
| Unused types | 85 | 85 |
| Dependency declarations nghi dư | 41 | 41 |
| Unused class members | 5 | 5 |
| Unused component props | 5 | 5 |
| Unresolved imports | 2 | 0 |
| Tổng findings | 388 | 286 |

41 dependency findings gồm 35 production declarations và 6 dev declarations, không phải 41 package có thể uninstall. Có 28 khai báo root đã được khai báo và import ở workspace con. Đây là dependency-placement/deduplication, không phải thư viện chết trong toàn repo.

Scan hiệu chỉnh dùng config tạm: coi `.agents/scripts/**/*.js`, `scripts/**/*.{ts,js,mjs,cjs}` và `ecosystem.config.js` là entrypoints; bỏ tài liệu/mã mẫu `.agents/skills/**`. Next.js/plugin vẫn tự nhận route/test/config entries. Tổng entrypoints hiệu chỉnh: 371, gồm 338 từ plugin, 17 từ package.json và 16 manual entries.

Cả hai lần scan trả exit 1 vì có findings, không phải scan crash. Đã bật `--fail-on-parse-error`, không có parse degradation diagnostic; hai diagnostics còn lại là architecture boundaries/rule packs chưa được cấu hình. Không coi số 0 architecture violations là bằng chứng đã kiểm tra kiến trúc. Chưa chạy TypeScript semantic companion hoặc thực thi build/tests cho một patch xoá thật.

## Danh sách đề xuất loại bỏ, theo số dòng giảm

Số dòng tính cả dòng trống/comment; là phạm vi dự kiến, chưa phải thống kê diff đã áp dụng.

| Ưu tiên | Đề xuất | Dòng dự kiến | Bằng chứng và phần cần giữ |
| --- | --- | ---: | --- |
| 1 | `delete:` 10 file UI không có consumer và alias chatbot | 395 | Kiểm tra tên và đường dẫn trên apps/packages/test/e2e/scripts; chi tiết dưới. Giữ implementation thật trong `packages/ui` và `QuizAIAssistantDrawer`. |
| 2 | `yagni:` DI event bus không có production consumer | 246 | 123 dòng source, 121 test, 2 import/registration. Không có `resolve('IEventBus')`; chỉ implementation, DI wiring, test và barrel tự tham chiếu. |
| 3 | `delete:` client-validation cùng test riêng | 134 | 56 source + 78 test; 5 helper chỉ được test của chính file gọi. |
| 4 | `yagni:` search provider placeholder cùng interface/wiring | 51 | 49 source + 2 wiring; `AtlasSearchProvider` trả `[]`, không có `resolve('ISearchProvider')`. |
| 5 | `delete:` shared aliases/schema/type không có consumer | 41 | RBAC 5, bulk-user schema/type 6, AI type 15, inferred types 15. Không bỏ runtime schemas đang dùng. |
| 6 | `delete:` 8 constants không có consumer | 8 | Chỉ có declarations trong constants/index.ts; giữ `COOKIE_MAX_AGE` và live reexports. |

Tổng các nhóm không trùng: **875 dòng**, gồm **676 dòng source/wiring và 199 dòng test chỉ phục vụ code đề xuất bỏ**. Đây là tiềm năng giảm mã bảo trì; chưa có số đo giảm bundle/RAM/thời gian build. Test vẫn được runner gọi, nên được bỏ cùng feature không còn consumer, không xoá test của code đang hoạt động.

### 1. UI — 394 dòng file + 1 alias

| File | Vị trí symbol/export | Dòng cả file |
| --- | ---: | ---: |
| `apps/web/components/shared/DevOnlyGuard.tsx` | 14 | 96 |
| `apps/web/components/quiz/shared/FlashcardReviewButton.tsx` | 17 | 91 |
| `apps/web/components/shared/ui/ScrollToTopButton.tsx` | 12 | 62 |
| `apps/admin/components/AdminHeader.tsx` | 15 | 60 |
| `apps/web/components/layout/TopHeaderBar.tsx` | 11 | 45 |
| `apps/admin/components/ui/dropdown-menu.tsx` | 3 | 20 |
| `apps/admin/components/ui/table.tsx` | 1 | 11 |
| `apps/web/components/shared/ui/avatar.tsx` | 3 | 4 |
| `apps/web/components/shared/ui/collapsible.tsx` | 3 | 4 |
| `apps/web/components/quiz/session/QuizAIChatbotDrawer.tsx` | 1 | 1 |

Bỏ thêm alias `QuizAIChatbotDrawer` tại `apps/web/components/quiz/session/QuizAIAssistantDrawer.tsx:544` sau khi bỏ compatibility barrel. Component thật vẫn được gọi và phải giữ.

Admin dashboard layout mount `AdminSidebar`, không mount `AdminHeader`. Flashcard review hiện fetch trực tiếp ở `FlashcardResultView.tsx:71`, không dùng `FlashcardReviewButton`. Bốn wrapper ui chỉ re-export, không được suy ra rằng package implementation/dependency có thể bỏ theo. Dropdown implementation vẫn được web sử dụng.

Fallow trace riêng `DevOnlyGuard.tsx` trả `UNREACHABLE`, export `DevOnlyGuard [unused]`, không có importers.

### 2. DI event bus — 246 dòng

- `apps/web/lib/core/events/in-memory-event-bus.ts`: 45 dòng.
- `apps/web/lib/core/events/domain-event.ts`: 44 dòng.
- `apps/web/lib/core/events/event-bus-interface.ts`: 31 dòng.
- `apps/web/lib/core/events/index.ts`: 3 dòng.
- `apps/web/lib/core/events/__tests__/in-memory-event-bus.test.ts`: 121 dòng.
- Bỏ import/registration tại `apps/web/lib/core/di/index.ts:4,12`: 2 dòng.

**Giữ** `apps/web/lib/core/events/event-bus.ts`: AI content service đang dùng event bus khác này. Giữ DI container, cache và AI provider: AI module resolve `IAIProvider`, `ICache`, `AIContentService` thực sự.

### 3. Client validation — 134 dòng

- `apps/web/lib/core/validation/client-validation.ts`: 56 dòng.
- `apps/web/lib/core/validation/__tests__/client-validation.test.ts`: 78 dòng.

Các symbol `validateClientData`, `normalizeSearchInput`, `clampPagination`, `sanitizeQueryParams`, `validateBase64Image` không có production callers; chỉ module và dedicated test tham chiếu. Không xoá validator boundary của API/import đang dùng.

### 4. Search provider placeholder — 51 dòng

- `apps/web/lib/core/search/atlas-search-provider.ts`: 15 dòng.
- `apps/web/lib/core/search/search-provider-interface.ts`: 34 dòng.
- Bỏ import/registration tại `apps/web/lib/core/di/index.ts:6,14`: 2 dòng.

Không ảnh hưởng các query/search API hiện hành vì chúng không resolve provider này. Không xoá MongoDB search logic khác theo tên tương tự.

### 5. Shared declarations — 41 dòng

- `packages/auth/src/rbac.ts:8,22`: `ROLE_HIERARCHY`, `hasRole` — 5 dòng; giữ `ROLE_ACCESS_HIERARCHY`, `expandAllowedRoles`.
- `packages/models/src/schemas/user.ts:35,71`: `BulkUserActionSchema`, `BulkUserActionInput` — 6 dòng.
- `packages/models/src/entities/ai.types.ts:47`: package `AIGenerationType` — 15 dòng. Runtime dùng type khác ở `apps/web/lib/modules/ai/types/ai-types.ts`; giữ `IAIAsset`/`IAILearningLog`.
- 15 dòng inferred types không có consumer: `LoginInput`, `RegisterInput`; `UpdateUserInput`, `UpdateStudentSettingsInput`, `UpdateSiteSettingsInput`, `UpdateProfileInput`; `QuizUpdateInput`, `CreateSessionInput`, `QuestionBankInput`; `PaginationQuery`, `SearchQuery`; `CategoryInput`, `CreateCategoryInput`; `UpdateClassroomInput`, `JoinClassroomInput`. Các file nằm dưới `packages/models/src/schemas/{auth,user,quiz,common,category,classroom}.ts`.

Giữ runtime schemas tương ứng khi còn caller. Giữ `CreateClassroomInput`, `CreateQuizAssignmentInput` vì có consumer qua barrel. Package nội bộ được đánh dấu private; nếu có consumer ngoài working tree phải xác minh riêng trước khi thay export API.

### 6. Constants — 8 dòng

Trong `apps/web/lib/core/constants/index.ts:12`: `JWT_EXPIRY`, `MAX_IMAGE_SIZE`, `ALLOWED_IMAGE_TYPES`, `PAGINATION_DEFAULT_LIMIT`, `PAGINATION_MAX_LIMIT`, `CACHE_TTL_SHORT`, `CACHE_TTL_MEDIUM`, `CACHE_TTL_LONG`. Tìm thấy declarations, không có consumer. Không bỏ auth cookie constants/reexports.

## Dependencies

`delete:` **2 package** `@vercel/analytics`, `@vercel/speed-insights`: không có application import/dynamic require; chỉ manifest declarations và skill examples. Bỏ ở root `package.json:61–62` và web `apps/web/package.json:32–33`, tổng 4 entries; regenerate lockfile khi thực hiện. Fallow dependency trace `@vercel/analytics`: `UNUSED`, `0 import(s)`.

`shrink:` `pino` ở `packages/auth/package.json:14`, `packages/database/package.json:12` không được hai packages dùng. Có thể bỏ hai declarations; web logger vẫn dùng pino nên không tính giảm một unique package.

Chưa đưa vào net package count:

- 28 root declarations trùng workspace: xem lại ownership/install flow trước khi dọn, không gọi là unused toàn repo.
- `recharts`: không tìm thấy application imports nhưng có cấu hình `optimizePackageImports` ở web/admin. Nếu dọn phải sửa đồng bộ declarations + config; không trộn vào hai telemetry package đã xác minh.
- Dev packages do công cụ báo có thể phục vụ CLI/config: `eslint-config-next`, `eslint-plugin-regexp`, `fast-check`, `jest-environment-node`, `jest-junit`, `shadcn`. Cần đối chiếu dotfiles/tooling/manual usage từng package; không auto-uninstall theo số findings.

## Ứng viên cần quyết định riêng

- `packages/models/src/models/MigrationLog.ts`: 61 dòng, cùng wrapper 1 dòng và ba registration/export references, tổng khoảng 65 dòng. Không tìm thấy writer/reader ngoài bootstrap. Đề xuất rà operational migration history trước khi bỏ registration. Không xoá collection MongoDB vì xoá source.
- Bảy barrel/type file khác trong danh sách 18 unused files chưa tính vào 875 dòng: `core/cache/index.ts`, `core/db/base-schema.ts`, `core/events/index.ts`, `core/types/domain-metadata.ts`, `modules/auth/types/{login-log,settings,user}.ts`, `modules/classroom/types/classroom.ts`. Riêng events/index.ts đã tính trong nhóm DI; còn bảy file không được cộng thêm khi chưa rà xong consumer qua package/type paths.
- `maskEmail`, `logDBConnectionTimeout`, `logRateLimitTriggered`, `logSessionError` chỉ có dedicated test callers, nhưng là operational logging helpers: chưa đưa vào net đề xuất đợt đầu.

## Những cảnh báo không được chuyển thành lệnh xoá

1. `.agents/scripts/engine/loader.js:51–69` discover rule directories và `require(indexPath)` động. Chín rule files không phải dead code.
2. `ecosystem.config.js` là PM2 entry, `deploy/deploy-vps.sh:51,87,89` dùng khi reload/start. Phải giữ.
3. `app/**/{route,page,layout}.*`, `proxy.ts` và các Next convention files là framework entries; không cần import thủ công.
4. Model bootstrap/module indexes có side effects; `core/db/mongodb.ts` import chúng để register models và cleanup. Giữ registry và base schema thật trong shared package.
5. `sendResetPasswordMail` và `sendVerificationCodeMail` bị báo unused export nhưng `mail.ts:258–259` gọi nội bộ. Có thể bỏ modifier `export` nếu API nội bộ không cần; không xoá thân hàm.
6. `PROMPT_VERSION`, các Generated*Schema có thể chỉ dư public export, vẫn tham gia prompt definitions/generic types. Phải phân biệt internal use và unused external export.
7. Không xoá `SessionSaveStatus`, answer sync/draft/retry chỉ vì kế hoạch UI trước yêu cầu bỏ nút draft. Chúng vẫn có consumer, cần thay đổi hợp đồng lưu đáp án riêng.

## Thứ tự dọn khi triển khai

1. Commit UI dead files/wrappers/alias + shared declarations + constants; giữ nguyên component/package implementations đang dùng.
2. Commit xoá DI event/search branches và test đi kèm, giữ live DI providers/bus khác; bỏ client-validation cùng dedicated test khi xác nhận không có consumer mới.
3. Commit dependency cleanup, regenerate lockfile, review diff install tree; không dùng auto-fix toàn bộ 286 findings.
4. Với từng commit: lint/type-check/test thích hợp, strict verifier; trước push chạy đủ gate repo và build web/admin để kiểm tra dynamic entrypoints. Scan lại với cùng config để so sánh. Chưa có patch xoá nên lượt báo cáo này không tuyên bố các gate đã pass.
5. Rebase/check remote và working tree tại thời điểm dọn: danh sách dựa local dirty tree, không áp dụng mù lên production/main.

## Tái lập và artifacts

Lệnh scan:

```powershell
npx --yes fallow@3.37.0 dead-code --format json --no-cache --no-package-baselines --fail-on-parse-error
npx --yes fallow@3.37.0 dead-code --root D:/Code/fquiz --config tasks/dead-code-audit/2026-10-31/scan-config.json --format json --no-cache --no-package-baselines --fail-on-parse-error
npx --yes fallow@3.37.0 dead-code --trace-file apps/web/components/shared/DevOnlyGuard.tsx
npx --yes fallow@3.37.0 dead-code --trace-dependency @vercel/analytics
```

Artifacts trong workspace: `tasks/dead-code-audit/2026-10-31/fallow-raw.json`, `fallow-calibrated.json`, `scan-config.json`. Báo cáo đã đọc và phân loại kết quả exit 1; các JSON là danh sách ứng viên, không phải danh sách xoá tự động.

net: khoảng **-875 dòng, -2 deps possible**, cộng **-2 pino manifest declarations** mà không loại pino khỏi ứng dụng. Chưa áp dụng xoá code.
