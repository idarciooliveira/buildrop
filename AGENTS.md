# AGENTS.md — Buildrop

## Project Overview

Buildrop is an **Astro 6.x** app using **Bun**, **strict TypeScript**, **Tailwind CSS 4**,
**lucide-astro** for icons, **Dropzone** for frontend-only drag-and-drop file selection,
and a small **Tailwind v4 design system** defined in `src/styles/global.css`.
The project is an ES module (`"type": "module"`).

Requires **Node >= 22.12.0**.

## Agent Rules Sources

- No `.cursorrules` file exists
- No `.cursor/rules/` directory exists
- No `.github/copilot-instructions.md` file exists
- This `AGENTS.md` is the project-specific instruction source for coding agents

## Project Structure

```text
src/
├── components/          # Reusable Astro UI components
│   ├── BuildropDropzone.astro
│   └── NavBar.astro
├── lib/                 # Frontend helpers like auth-client.ts
├── layouts/             # Shared layout wrappers
├── pages/               # File-based routes
├── styles/              # Global CSS, theme tokens, and ds-* utilities
│   └── global.css
└── types/               # Local type declarations (e.g. dropzone.d.ts)
convex/                  # Convex backend source
├── auth.config.ts       # Convex auth provider config
├── auth.ts              # Better Auth factory + Convex adapter
├── convex.config.ts     # Component registration
├── http.ts              # Better Auth HTTP route registration
├── _generated/          # Generated Convex API/types
└── tsconfig.json
public/                  # Static files served as-is
astro.config.mjs         # Astro config with Tailwind Vite plugin
tsconfig.json            # Strict Astro TS config
.env.example             # Example required environment variables
```

## Commands

### Package Manager

Always use **bun**. Do not use npm, yarn, or pnpm.

```bash
bun install
```

### Development

```bash
bun dev
bun run dev:full
bun run build
bun run preview
```

### Convex

```bash
bun run convex:dev
bun run convex:codegen
```

Notes:
- `bun run dev:full` runs both Astro and Convex watchers together
- `bun run convex:codegen` requires the Convex backend to already be running
- `convex dev` may show a TypeScript "No inputs were found" error until real Convex source files like `convex/schema.ts` exist

### Better Auth

Current setup status:
- `@convex-dev/better-auth` and `better-auth` are installed
- `convex/auth.config.ts` exposes `getAuthConfigProvider()`
- `convex/convex.config.ts` registers the Better Auth component
- `convex/auth.ts` creates `authComponent` and `createAuth()`
- `convex/http.ts` mounts Better Auth routes at `/api/auth`
- `src/lib/auth-client.ts` exposes a frontend Better Auth client
- Email/password auth is enabled in config
- Sign-in/sign-up UI is not implemented yet
- OAuth providers, email verification, and password reset flows are not configured yet

Use `.env.example` as the source of truth for required environment variables.

### Type Checking

```bash
bunx astro check
```

### Linting / Formatting

No ESLint or Prettier config is currently present.

If you add linting or formatting:
- Prefer `eslint.config.mjs` over legacy `.eslintrc`
- Use `eslint-plugin-astro`
- Run tools with `bunx`

### Testing

No test runner is configured yet.

If adding tests, prefer **Vitest**:

```bash
bunx vitest
bunx vitest run
bunx vitest run path/to/file.test.ts
bunx vitest run -t "test name"
```

## Current Stack

- **Astro 6** for pages, layouts, and component composition
- **Tailwind CSS 4** via `@tailwindcss/vite`
- **Tailwind v4 theme tokens** via `@theme` in `src/styles/global.css`
- **lucide-astro** for icons instead of inline SVG where practical
- **dropzone** for client-side drag-and-drop upload UI
- **Convex** for backend functions and generated API/types
- **Better Auth** via `@convex-dev/better-auth` and `better-auth`
- **@astrojs/check** and `typescript` for strict checking
- **concurrently** for running Astro and Convex dev servers together

## Configuration Notes

- `astro.config.mjs` uses `tailwindcss()` in `vite.plugins`
- Global CSS is imported from `src/layouts/Layout.astro`
- `src/styles/global.css` imports both `tailwindcss` and `dropzone/dist/dropzone.css`
- `src/styles/global.css` is the design-system source for `@theme` tokens, base styles, and `@utility ds-*` classes
- `src/types/dropzone.d.ts` contains local typings for the Dropzone package
- `.env.example` is the canonical reference for required environment variables
- `convex/tsconfig.json` is owned by Convex and typechecks Convex source files

## Design System

The current design system is lightweight and CSS-first. It lives in `src/styles/global.css` and is composed of:

- Tailwind v4 `@theme` tokens for fonts, colors, radii, and shadows
- `@layer base` rules for app-wide typography, focus states, and element defaults
- Reusable `@utility ds-*` classes for page, hero, surface, navigation, icon, button, and step UI patterns

Current token groups:

- `--font-sans`
- `--color-brand-*`
- `--color-surface-*`
- `--color-text-*`
- `--color-border-*`
- `--color-state-*`
- `--radius-*`
- `--shadow-*`

Current `ds-*` utility classes:

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

## Code Style Guidelines

### Astro Components

Preferred structure:

1. Frontmatter imports and prop typing
2. `Astro.props` destructuring/defaults
3. Template markup
4. Optional `<script>`
5. Optional `<style>`

Example:

```astro
---
import Component from '../components/Component.astro';

interface Props {
	title?: string;
}

const { title = 'Buildrop' } = Astro.props;
---

<Component title={title} />
```

### Imports

- Use ESM imports only
- Order imports: external packages first, then local components/types/styles
- Use relative paths for local Astro files
- Prefer `lucide-astro` icons over hand-written inline SVG when an equivalent exists
- Import global CSS from layouts, not ad hoc per page unless there is a clear reason

### TypeScript

- Strict typing is enabled; do not use `any`
- Use `interface` for component props
- Add local `.d.ts` files when third-party packages do not ship usable types
- Type inline script parameters explicitly when Astro check requires it
- Keep helper types close to the component unless they are reused broadly

### HTML / Markup

- Use semantic elements: `header`, `main`, `section`, `nav`, etc.
- Keep page-level structure in pages and reusable UI in `src/components/`
- Put repeated UI blocks into dedicated components instead of duplicating markup
- Preserve accessibility basics: meaningful button text, `aria-hidden` for decorative icons

### Styling

- Prefer the existing design-system layer before introducing new one-off styling
- Use Tailwind utility classes for layout and spacing, and use the shared `ds-*` utilities for repeated visual patterns
- Reuse `@theme` tokens from `src/styles/global.css` instead of hardcoding hex colors, shadows, or radii when an equivalent token already exists
- Keep component-scoped `<style>` blocks for behavior-specific or third-party state styling
- Use global CSS only for app-wide imports and truly global rules
- Reuse the current visual language: blue/cyan brand gradients, soft slate surfaces, rounded panels, and pill buttons
- Keep above-the-fold landing page sections compact so they fit within the viewport when intended
- If you need a new shared pattern, add or extend a `ds-*` utility in `src/styles/global.css` instead of duplicating long utility strings across components

### Client-Side Behavior

- Keep browser-only integrations self-contained inside the component that owns the UI
- For Dropzone, prefer reusable component boundaries like `BuildropDropzone.astro`
- Avoid page-level selectors for component internals
- Expose reuse through props and custom DOM events instead of hardcoding page-specific behavior
- Current Dropzone usage is **frontend-only**; do not assume a working upload backend exists

### Naming Conventions

- Components: PascalCase filenames, e.g. `NavBar.astro`, `BuildropDropzone.astro`
- Pages: lowercase route filenames, e.g. `index.astro`
- TS variables/functions: camelCase
- TS types/interfaces: PascalCase
- CSS utility class ordering should stay readable and grouped by purpose

## Reuse Patterns

### Shared Components

- `NavBar.astro` owns the top navigation/header
- `BuildropDropzone.astro` owns the upload panel, Dropzone initialization, status text, and submit button

### Auth Helpers

- `src/lib/auth-client.ts` owns the frontend Better Auth client configuration
- Keep auth UI separate from the Convex backend setup in `convex/`
- Reuse the existing auth client instead of creating ad hoc Better Auth clients in pages or components

### Design System Usage

- `Layout.astro` is responsible for loading `src/styles/global.css`
- `index.astro` composes the page using `ds-page`, `ds-hero`, `ds-title`, `ds-subtitle`, `ds-icon-tile`, `ds-step-label`, and `ds-step-copy`
- `NavBar.astro` uses token-backed color values plus `ds-icon-tile`, `ds-nav-link`, and `ds-nav-link-active`
- `BuildropDropzone.astro` uses `ds-surface`, `ds-dropzone`, and `ds-button-primary`, with component-scoped CSS reserved for Dropzone hover and upload tone states

### Better Auth Integration

Current backend files:
- `convex/auth.config.ts`
- `convex/convex.config.ts`
- `convex/auth.ts`
- `convex/http.ts`

Current frontend auth file:
- `src/lib/auth-client.ts`

Current behavior:
- Better Auth routes are registered through Convex at `/api/auth`
- Better Auth uses the Convex adapter from `authComponent.adapter(ctx)`
- The client uses `createAuthClient()` plus `convexClient()`
- Auth UI and session-aware app behavior still need to be built

### BuildropDropzone API

Current reusable props:

- `id`
- `action`
- `acceptedFiles`
- `buttonLabel`
- `emptyLabel`
- `readyMessage`
- `invalidFileMessage`
- `containerClass`
- `dropzoneClass`

Current custom DOM events:

- `buildrop:file-added`
- `buildrop:cleared`
- `buildrop:error`
- `buildrop:submit`

When extending this component, preserve its frontend-only default behavior unless requirements change.

## Error Handling

- Validate component props with TypeScript instead of runtime-heavy guards when possible
- For client UI, prefer clear user-facing status text over silent failure
- If a third-party library lacks types, add or update local declarations in `src/types/`
- If Convex typecheck reports no inputs, add real source files under `convex/` before treating it as a backend bug
- Better Auth methods that rely on cookies/session state should be invoked via the client or through component helpers; do not assume Convex functions can set browser cookies directly

## Git / Generated Files

- Never commit `.env` or `.env.production`
- Never commit `.env.local`
- Do not commit `dist/`, `.astro/`, or `node_modules/`
- `bun.lock` should be updated when dependencies change
- Do not hand-edit files in `convex/_generated/`

## Practical Guidance For Agents

- Read the existing component boundary before refactoring
- Read `src/styles/global.css` before changing shared UI patterns or introducing new styling primitives
- Prefer small, reusable Astro components over large page files
- Keep homepage-specific copy in the page, not in shared components, unless it is a prop default
- When adding icons, use `lucide-astro` first
- Prefer extending the current token and `ds-*` utility system over inventing a parallel design abstraction
- When changing upload behavior, update both `BuildropDropzone.astro` and `src/types/dropzone.d.ts` if needed
- When working on Convex code, always read `convex/_generated/ai/guidelines.md` first
- When working on auth, read `.env.example` for expected variables and `convex/auth.ts` plus `convex/http.ts` for the current integration shape
- Keep Better Auth backend configuration inside `convex/`; do not move it into Astro routes unless requirements explicitly change
- Treat `convex/` as the source of backend logic and `convex/_generated/` as generated output
- After meaningful changes, run:

```bash
bun run build
bunx astro check
```

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
