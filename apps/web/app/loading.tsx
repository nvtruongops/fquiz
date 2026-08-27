// The global PageTransitionLoader in layout.tsx already handles the full-screen
// loading overlay for all client-side navigation. This file exists solely as a
// Next.js Suspense boundary so the framework can stream the shell while the
// page component loads. Returning null is correct — the layout overlay covers
// everything, and rendering a second overlay here would cause a double-flash
// (progress resets from ~80% to 5% when this instance mounts).
export default function GlobalLoading() {
  return null
}
