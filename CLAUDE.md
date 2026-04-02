# Buildrop

## Project Overview

Buildrop is an **Astro 6.x** app using **Bun**, **strict TypeScript**, **Tailwind CSS 4**,
**lucide-astro** for icons, **Dropzone** for frontend-only drag-and-drop file selection,
**Convex** as its backend, and a lightweight **Tailwind v4 design system** defined in
`src/styles/global.css`.

Requires **Node >= 22.12.0**.

## Stack

- Astro 6
- Tailwind CSS 4 via `@tailwindcss/vite`
- Tailwind v4 `@theme` tokens and `@utility ds-*` classes in `src/styles/global.css`
- lucide-astro
- dropzone
- Convex
- @astrojs/check
- TypeScript strict mode

## Commands

Use **bun** for package management and scripts.

```bash
bun install
bun dev
bun run dev:full
bun run build
bun run preview
bunx astro check
bun run convex:dev
bun run convex:codegen
```

### Notes

- `bun run dev:full` runs both Astro and Convex dev processes together
- `bun run convex:dev` currently uses the standard Convex dev flow
- `bun run convex:codegen` requires the Convex backend to already be running
- No test runner is configured yet; if adding one, prefer Vitest

## Project Structure

```text
src/
├── components/
│   ├── BuildropDropzone.astro
│   └── NavBar.astro
├── layouts/
├── pages/
├── styles/
│   └── global.css
└── types/
convex/
├── _generated/
└── tsconfig.json
public/
astro.config.mjs
tsconfig.json
```

## Code Conventions

### Astro

- Use frontmatter for imports, prop interfaces, and setup
- Keep page-specific layout/content in `src/pages/`
- Keep reusable UI and client behavior in `src/components/`
- Preferred component order: frontmatter, markup, `<script>`, `<style>`

### Imports

- Use ESM imports only
- Order imports: external packages first, then local modules
- Prefer `lucide-astro` icons over inline SVG when possible
- Import global CSS from `src/layouts/Layout.astro`

### TypeScript

- Strict typing is enabled; avoid `any`
- Use `interface` for props and small local helper types where appropriate
- Add local `.d.ts` files when package types are missing
- Type inline script parameters explicitly when Astro check requires it

### Styling

- Read `src/styles/global.css` before changing shared UI patterns
- Prefer the existing design system before adding one-off styling
- Use Tailwind utility classes for layout and spacing, and shared `ds-*` utilities for repeated visual patterns
- Reuse `@theme` tokens instead of hardcoded colors, radii, and shadows when matching an existing token
- Use scoped `<style>` blocks for behavior-specific states or third-party selectors
- Keep visual language consistent: blue/cyan gradients, soft slate surfaces, rounded panels, and pill buttons
- Keep landing pages compact above the fold when intended

### Design System

The current design system is CSS-first and lives in `src/styles/global.css`.

- `@theme` defines the shared font, color, radius, and shadow tokens
- `@layer base` sets global typography and focus styling
- `@utility ds-*` provides shared visual patterns used by the current UI

Current `ds-*` utilities:

- `ds-page`
- `ds-hero`
- `ds-title`
- `ds-subtitle`
- `ds-surface`
- `ds-dropzone`
- `ds-icon-tile`
- `ds-button-primary`
- `ds-button-primary-disabled`
- `ds-nav-link`
- `ds-nav-link-active`
- `ds-step-label`
- `ds-step-copy`

### Client-Side UI

- Browser-only behavior should stay inside the component that owns the UI
- `BuildropDropzone.astro` owns Dropzone initialization, state text, and submit behavior
- Prefer props and custom events over page-specific hardcoding for reusable components
- Current upload behavior is frontend-only; do not assume backend upload handling exists yet

## Shared Components

### `NavBar.astro`

- Owns the top navigation/header
- Uses Lucide icons and design-system navigation/icon utilities

### `BuildropDropzone.astro`

- Owns the upload panel and frontend Dropzone integration
- Uses `ds-surface`, `ds-dropzone`, and `ds-button-primary` for shared styling
- Current reusable props:
  - `id`
  - `action`
  - `acceptedFiles`
  - `buttonLabel`
  - `emptyLabel`
  - `readyMessage`
  - `invalidFileMessage`
  - `containerClass`
  - `dropzoneClass`
- Current custom DOM events:
  - `buildrop:file-added`
  - `buildrop:cleared`
  - `buildrop:error`
  - `buildrop:submit`

## Convex

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first**.
Those guidelines override generic Convex assumptions.

Current Convex state:

- `convex/` exists
- `convex/_generated/` exists
- `.env.local` contains local Convex deployment values
- `.env.local` is gitignored

### Convex Guidance

- Do not delete or hand-edit generated files in `convex/_generated/`
- Prefer adding real Convex source files like `convex/schema.ts` or `convex/*.ts`
- `convex dev` may report a typecheck error if `convex/` contains no source files yet
- If you change Convex functions or schema, regenerate/check against the running Convex dev process

Convex agent skills for common tasks can be installed with:

```bash
npx convex ai-files install
```

## Generated / Ignored Files

- Never commit `.env`, `.env.production`, or `.env.local`
- Do not commit `dist/`, `.astro/`, or `node_modules/`
- `bun.lock` should change when dependencies change

## Verification

After meaningful changes, run:

```bash
bun run build
bunx astro check
```
