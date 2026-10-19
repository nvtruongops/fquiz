# Web application library

This directory separates app-wide infrastructure from feature-owned behavior:

- `core/` contains infrastructure used across Web features.
- `modules/` contains domain behavior grouped by feature.

Keep shared app infrastructure in `core/`, feature rules in the owning module, and cross-app code in `packages/`. See the [`core guide`](./core/README.md) and [`feature module guide`](./modules/README.md).
