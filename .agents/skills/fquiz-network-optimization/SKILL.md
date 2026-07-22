---
name: fquiz-network-optimization
description: Enforce consistent network and data-loading optimization for the FQuiz Next.js App Router project. Prevent unnecessary route prefetching, redundant server queries, duplicate client fetching, and incorrect cache invalidation while maintaining predictable performance.
version: 2.0
priority: high
---

# FQuiz Network & Data Loading Optimization Skill

## Goal

This skill defines the mandatory performance rules for every page, layout, API route, and data-fetching layer inside FQuiz.

The primary objectives are:

- Prevent unnecessary network requests.
- Prevent unrelated RSC (_rsc) requests.
- Reduce duplicated database queries.
- Maximize cache hit rate.
- Maintain predictable client caching.
- Keep page navigation lightweight.
- Ensure cache invalidation is always correct after mutations.

If multiple implementation choices exist, always choose the one that minimizes network traffic while preserving correctness.

---

# Scope

Apply this skill whenever modifying or creating files inside:

```
app/**
components/**
lib/**
server/**
actions/**
api/**
hooks/**
features/**
```

Especially:

```
app/layout.tsx
app/**/layout.tsx
components/layout/**
components/navigation/**
components/sidebar/**
components/header/**
```

---

# Priority Rules

## P0 (Critical)

Must never be violated.

- Never preload unrelated routes.
- Never issue duplicated server queries.
- Never disable caching without justification.
- Never fetch identical data multiple times in one request lifecycle.
- Never leave stale cache after a mutation.

---

## P1 (Required)

Must be implemented whenever applicable.

- Use server-side caching.
- Disable automatic Link prefetch in shared navigation.
- Configure proper staleTime.
- Configure cache invalidation.

---

## P2 (Recommended)

Improve performance when possible.

- Deduplicate query keys.
- Reuse cached server functions.
- Reduce waterfall requests.
- Batch lightweight queries.

---

# Core Principles

---

## Principle 1 — Navigation Prefetch Control

### Problem

Next.js App Router automatically prefetches visible links.

Shared layouts may accidentally trigger many hidden RSC requests.

Example:

Dashboard loads
↓
Sidebar renders
↓
Sidebar contains
```
Explore
Courses
History
Leaderboard
Settings
```
↓
Browser prefetches every page.

Result: 8–15 unnecessary requests.

---

### Rule

Any navigation rendered globally must disable prefetch.

Examples:
- Sidebar
- Navbar
- Header
- Footer navigation
- User dropdown
- Admin menu
- Dashboard navigation
- Mobile drawer

Correct:
```tsx
<Link
    href="/explore"
    prefetch={false}
>
```

Incorrect:
```tsx
<Link href="/explore">
```

---

### Exception

Local page navigation may keep default prefetch.

Examples:
- pagination
- previous/next lesson
- related courses
- breadcrumb inside current page

---

# Principle 2 — Server Cache

Expensive server operations must be cached.

Examples:
- Mongo queries
- count()
- aggregate()
- lookup()
- statistics
- leaderboard
- category list
- dashboard summary

Use: `unstable_cache()` or `cache()`

Example:
```ts
export const getCategories = unstable_cache(
    async () => {
        await connectDB()
        return Category.find(...)
            .sort(...)
            .lean()
    },
    ["categories"],
    {
        revalidate: 300,
        tags: ["categories"]
    }
)
```

---

## Cache Duration Guidelines

| Data | Revalidate |
|--------|------------|
| Categories | 300 sec |
| Courses | 300 sec |
| Subjects | 300 sec |
| User Profile | 300 sec |
| Dashboard Stats | 60 sec |
| Rankings | 60 sec |
| Analytics | 120 sec |

---

## Never Cache

Real-time data only.

Examples:
- OTP
- payment callback
- websocket state
- authentication verification
- live exam timer

---

# Principle 3 — Cache Invalidation

Every mutation must invalidate cache.

Mutation includes: POST, PUT, PATCH, DELETE

Immediately after successful mutation call `revalidateTag()` or `revalidatePath()`.

Example (Next.js 16):
```ts
await Category.create(...)

revalidateTag("categories", "default")
```

Never forget cache invalidation.

---

# Principle 4 — Client Query Rules

TanStack Query defaults are NOT acceptable.

Always configure: `staleTime`, `gcTime`, `refetchOnWindowFocus`

Recommended Stable data:
```ts
staleTime: 5 * 60 * 1000
gcTime: 10 * 60 * 1000
refetchOnWindowFocus: false
```

Dashboard:
```ts
staleTime: 60 * 1000
gcTime: 5 * 60 * 1000
refetchOnWindowFocus: false
```

Live data:
Use `refetchInterval` instead of `invalidate every render`.

---

# Principle 5 — Query Key Consistency

Never create unstable query keys.

Correct:
```ts
["categories"]
["course", slug]
["dashboard", userId]
```

Incorrect:
```ts
["course", Date.now()]
["course", Math.random()]
```

---

# Principle 6 — Avoid Duplicate Fetching

If Server Component already fetched data, do not immediately fetch identical data again in Client Component.

Prefer: Server Component → props → Client Component
Instead of: Server fetch → Hydration → Client fetch again

---

# Principle 7 — Fetch Policy

Avoid `cache: "no-store"` unless:
- realtime
- authentication
- payment
- live monitoring

Otherwise prefer: `force-cache`, `revalidate`, `unstable_cache`

---

# Principle 8 — Dynamic Route Strategy

Public pages (`course/[slug]`, `lesson/[id]`, `category/[slug]`) prefer `revalidate`, `cache`, `ISR`.

Avoid `dynamic = "force-dynamic"` unless absolutely necessary.

---

# Forbidden Patterns

Never introduce:
- `<Link href="/explore">` inside shared layouts without `prefetch={false}`.
- `cache: "no-store"` without explanation.
- `useEffect(() => { fetch() })` when TanStack Query should be used.
- Multiple identical database queries in one request.
- Random Query Keys (`Math.random()`, `Date.now()`).
- Missing Cache Invalidation on POST / PUT / DELETE without `revalidateTag()` / `revalidatePath()`.

---

# Performance Targets

Every optimization should aim for:
- No unrelated RSC requests.
- No duplicated Mongo queries.
- One request per dataset.
- Cache hit rate above 80%.
- Minimal layout-triggered network activity.
- Navigation should not preload unrelated pages.
- Avoid request waterfalls.

---

# Page Audit Checklist

For every new page:
- [ ] Navigation: Shared Link uses `prefetch={false}`
- [ ] Server: Cached with `unstable_cache()`
- [ ] Mutation: Cache invalidation exists (`revalidateTag("tag", "default")`)
- [ ] Client: `staleTime` configured
- [ ] Query: Stable `queryKey`
- [ ] Network: No duplicate requests

---

# Agent Workflow

Whenever editing code:

**Step 1**: Inspect navigation — Search `<Link` and verify `prefetch={false}` where applicable.

**Step 2**: Inspect server queries — Search `find(`, `aggregate(`, `count(` and ensure expensive operations are cached.

**Step 3**: Inspect API mutations — Search `POST`, `PUT`, `PATCH`, `DELETE` and verify `revalidateTag()` / `revalidatePath()` exists.

**Step 4**: Inspect Client Queries — Search `useQuery(` and verify `staleTime`, `gcTime`, `refetchOnWindowFocus`.

**Step 5**: Inspect duplicate fetching — Ensure Server Component → Client does not fetch same data twice.

---

# Expected Report

After completing changes, always report:
- **Files Modified**
- **Performance Improvements**
- **Cache Changes**
- **Remaining Risks**
- **Verification** (`npm run lint`, `npm run build`)

---

# Validation Commands

Run before completing any task:
```bash
npm run lint
npm run build
```

If either command fails, the task is not considered complete.

---

# Success Criteria

This skill is successful when:
- Navigation generates no unnecessary route prefetching.
- Shared layouts remain lightweight.
- Server queries are cached.
- Client queries avoid redundant refetching.
- Cache invalidation is reliable.
- Database load is minimized.
- Network traffic is predictable.
- Performance remains consistent across all pages.
