---
name: fquiz-network-optimization
description: Network and data-loading optimization standards for FQuiz Next.js App Router project. Prevents unnecessary route prefetching, duplicate server queries, un-cached data fetching, and incorrect cache invalidation.
version: 2.1
priority: high
---

# FQuiz Network & Data Loading Optimization

## Core Rules

### 1. Navigation Prefetch Control (`prefetch={false}`)
- **Global / Shared Navigation**: Disable automatic prefetching (`prefetch={false}`) on all globally visible links (Sidebar, Header, Navbar, Footer, Mobile Drawer, User Dropdown) to prevent mass background RSC prefetch requests.
  ```tsx
  <Link href="/explore" prefetch={false}>
  ```
- **Local In-Page Links**: Keep default prefetch for next/prev lesson, pagination, or breadcrumbs within current page flow.

---

### 2. Server Caching & Deduplication
- Use `unstable_cache()` or `React.cache()` for expensive MongoDB read operations (e.g. categories list, course structures, public quiz summaries).
  ```ts
  export const getCategories = unstable_cache(
    async () => {
      await connectDB()
      return Category.find().sort({ name: 1 }).select('name').lean()
    },
    ['categories-list'],
    { revalidate: 300, tags: ['categories'] }
  )
  ```

---

### 3. API & Query Parallelization
- **Parallel Queries (`Promise.all`)**: Run independent database calls or external API calls in parallel using `Promise.all()` to eliminate server waterfalls.
- **Client Cache Configuration**: Set clear `staleTime` (e.g. `1000 * 60 * 5`) in TanStack Query hooks to avoid redundant background refetches.

---

## Verification Protocol
Execute verification before completing network optimization work:
```bash
npm run lint
npm run check-types
npm test
node .agents/scripts/verify.js --strict
```
