---
name: vercel-deploy
description: Standard, safe deployment procedures for the FQuiz Next.js Monorepo on Vercel Production. Strictly separates Web Student/Teacher (fquiz) from Admin Portal (fquiz-admin) to prevent directory mismatch or cross-project overwrites.
version: 2.0
priority: high
---

# Vercel Monorepo Deployment Skill (FQuiz)

## 📌 Monorepo System Overview

FQuiz is a Next.js 16 Monorepo comprising **2 independent applications** linked to 2 distinct Vercel Projects under a single GitHub repository:

| Application | Working Directory (`Cwd`) | Vercel Project | Project ID | Production URL |
|---|---|---|---|---|
| **Student & Teacher Web Portal** | `d:\Code\fquiz` (Root) | `fquiz` | `prj_sg6yZhxUXYxH4wIDRnNZjQEpsOKO` | `https://fquiz-web.vercel.app` |
| **Admin Portal** | `d:\Code\fquiz\apps\admin` | `fquiz-admin` | `prj_W1ylsbBg92Vjny82E58RNxZXTFTE` | `https://fquiz-admin.vercel.app` |

---

## 🛡️ Anti-Mistake Deployment Invariants

1. **NEVER deploy from the wrong working directory**:
   - To deploy **Admin**: Target working directory MUST be `d:\Code\fquiz\apps\admin` (or pass `--project fquiz-admin`).
   - To deploy **Web**: Target working directory MUST be `d:\Code\fquiz` (Root).
2. **Always verify `.vercel/project.json`** prior to triggering deployment:
   - `apps/admin/.vercel/project.json` must contain `"projectId": "prj_W1ylsbBg92Vjny82E58RNxZXTFTE"`.
   - `d:\Code\fquiz\.vercel/project.json` must contain `"projectId": "prj_sg6yZhxUXYxH4wIDRnNZjQEpsOKO"`.
3. **Mandatory 4-Step Pre-Deployment Verification**:
   - Never deploy code containing TypeScript errors, lint violations, or unverified strict rules.

---

## 📋 1. Pre-Deployment Verification Sequence

Execute the required 4-step sequence from the monorepo root (`d:\Code\fquiz`):

```bash
# 1. Monorepo-wide lint check
npm run lint

# 2. TypeScript type check across all 7 workspaces
npm run check-types

# 3. Unit & integration test suites (66 suites, 430 tests)
npm test

# 4. AI Rule Engine verification in strict mode (18 rules)
node .agents/scripts/verify.js --strict
```

---

### 🅰️ Deploying Student & Teacher Web Portal (`fquiz-web`)

```bash
# Execute from Monorepo Root (d:\Code\fquiz)
npx vercel --prod --yes --scope nvtruongops
```

> **Target Output**: `https://fquiz-web.vercel.app` (Deployment: `fquiz-web`, Root Directory: `apps/web`)

---

### 🅱️ Deploying Admin Portal (`fquiz-admin`)

```bash
# Execute from Monorepo Root (d:\Code\fquiz)
npx vercel --prod --yes --scope nvtruongops --project fquiz-admin
```

> **Target Output**: `https://fquiz-admin.vercel.app` (Deployment: `fquiz-admin`, Root Directory: `apps/admin`)

---

## 🔍 3. Post-Deployment Verification Checklist

Verify HTTP status codes and core interfaces on production endpoints:

### 1. Web Portal (`https://fquiz-web.vercel.app`)
- [ ] `GET https://fquiz-web.vercel.app` → HTTP 200 OK (Home landing page and hero section render cleanly).
- [ ] `GET https://fquiz-web.vercel.app/explore` → HTTP 200 OK (Explore public quiz categories).
- [ ] `GET https://fquiz-web.vercel.app/login` → HTTP 200 OK (Sign-in form, Google OAuth button).
- [ ] `GET https://fquiz-web.vercel.app/community` → HTTP 200 OK (Knowledge sharing community forum).

### 2. Admin Portal (`https://fquiz-admin.vercel.app`)
- [ ] `GET https://fquiz-admin.vercel.app/login` → HTTP 200 OK (Standalone admin authentication portal).
- [ ] Sign in with an Administrator account on `fquiz-web` → Verify seamless redirect to `fquiz-admin`.
- [ ] Verify Zero-Trust Proxy (`apps/admin/proxy.ts`): Navigating to `/quizzes` unauthenticated → Automatically redirects to `/login`.

---

## 🛠️ Deployment Troubleshooting

- **Inspect Runtime Logs**: `npx vercel logs <deployment-url>`
- **Inspect Build Metadata**: `npx vercel inspect <deployment-url>`
- **Relink Projects**:
  - Admin: `cd apps/admin && npx vercel link --project fquiz-admin --yes --scope nvtruongops`
  - Web: `cd d:\Code\fquiz && npx vercel link --project fquiz --yes --scope nvtruongops`
