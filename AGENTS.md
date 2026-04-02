# AGENTS.md — Buildrop

## Project Overview

Buildrop is an **Astro 6.x** app using **Bun**, **strict TypeScript**, **Tailwind CSS 4**,
**lucide-astro** for icons, and **Dropzone** for frontend-only drag-and-drop file selection.
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
├── layouts/             # Shared layout wrappers
├── pages/               # File-based routes
├── styles/              # Global CSS entrypoints
└── types/               # Local type declarations (e.g. dropzone.d.ts)
public/                  # Static files served as-is
astro.config.mjs         # Astro config with Tailwind Vite plugin
tsconfig.json            # Strict Astro TS config
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
bun run build
bun run preview
```

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
- **lucide-astro** for icons instead of inline SVG where practical
- **dropzone** for client-side drag-and-drop upload UI
- **@astrojs/check** and `typescript` for strict checking

## Configuration Notes

- `astro.config.mjs` uses `tailwindcss()` in `vite.plugins`
- Global CSS is imported from `src/layouts/Layout.astro`
- `src/styles/global.css` imports both `tailwindcss` and `dropzone/dist/dropzone.css`
- `src/types/dropzone.d.ts` contains local typings for the Dropzone package

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

- Prefer Tailwind utility classes for layout, spacing, typography, and color
- Keep component-scoped `<style>` blocks for behavior-specific or third-party state styling
- Use global CSS only for app-wide imports and truly global rules
- Reuse existing visual language: rounded panels, blue/cyan gradients, soft slate neutrals
- Keep above-the-fold landing page sections compact so they fit within the viewport when intended

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

## Git / Generated Files

- Never commit `.env` or `.env.production`
- Do not commit `dist/`, `.astro/`, or `node_modules/`
- `bun.lock` should be updated when dependencies change

## Practical Guidance For Agents

- Read the existing component boundary before refactoring
- Prefer small, reusable Astro components over large page files
- Keep homepage-specific copy in the page, not in shared components, unless it is a prop default
- When adding icons, use `lucide-astro` first
- When changing upload behavior, update both `BuildropDropzone.astro` and `src/types/dropzone.d.ts` if needed
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
