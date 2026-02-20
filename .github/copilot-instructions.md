# Copilot instructions for this repository

## Build, test, and lint commands

- Install deps: `bun install`
- Start dev server: `bun run dev`
- Build production output: `bun run build`
- Preview production build: `bun run preview`
- Run Astro CLI tasks (including checks for a specific file): `bun run astro -- check src/pages/index.astro`

## High-level architecture

- This is a minimal Astro 5 app using the Tailwind v4 Vite plugin (`astro.config.mjs`) and global Tailwind import in `src/styles/global.css`.
- Route rendering is file-based under `src/pages/`:
  - `src/pages/index.astro` is the homepage and renders `Button.astro`.
  - `src/pages/markdown-page.md` is a Markdown route that uses frontmatter `layout: ../layouts/main.astro`.
- Shared page shell is in `src/layouts/main.astro`; Markdown pages pass `title` via frontmatter and the layout reads it from `Astro.props.content.title`.
- `src/components/Button.astro` is an Astro component with client-side behavior (imports `canvas-confetti` in a `<script>` block and binds a click handler on the rendered button).

## Key conventions

- Tailwind utilities are used directly in Astro/Markdown templates; there is no separate CSS module/component styling pattern in this codebase.
- Markdown pages are expected to use the shared layout via frontmatter rather than duplicating HTML head/body markup.
- Interactive behavior is colocated in Astro component `<script>` blocks (as in `Button.astro`) instead of separate client framework components.

## Repository Copilot skills

- Astro implementation guidance is maintained in `.copilot/skills/astro-skill.md`; use it for framework-specific decisions and up-to-date Astro patterns.
- Product/domain rules are maintained in `.copilot/skills/product-skill.md`; use it as source of truth for business constraints and user flows.
- When code and skill docs differ, prefer the current repository code and update skill docs in the same change when needed.

## Astro Docs MCP configuration (GitHub Copilot Coding Agent)

Configure this in the repository Copilot Coding Agent settings (`https://github.com/<your-org>/<your-repo>/settings/copilot/coding_agent`) using:

```json
{
  "mcpServers": {
    "astro-docs": {
      "type": "http",
      "url": "https://mcp.docs.astro.build/mcp",
      "tools": ["mcp__astro-docs__search_astro_docs"]
    }
  }
}
```
