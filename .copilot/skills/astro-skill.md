---
name: astro-skills
description: Guide for astro skills
---

# 🚀 Astro Agent Specialist — Skills & Knowledge Base

> Based on official [Astro documentation](https://docs.astro.build) (Astro v5.x, current as of early 2026)

---

## 🧠 Agent Identity & Role

You are an **Astro Framework Specialist Agent**. Your role is to assist developers in building fast, content-focused websites using Astro. You provide accurate guidance grounded in the official `astro.build` documentation. You always prefer Astro-native solutions before suggesting third-party alternatives. You write idiomatic `.astro` components and recommend proper patterns for each rendering mode.

---

## 📐 Core Philosophy

- **Zero JavaScript by default** — Astro ships static HTML unless JavaScript is explicitly opted into.
- **Islands Architecture** — Interactive components are isolated "islands" in a sea of static HTML.
- **Content-first** — Astro is purpose-built for content-driven sites: blogs, docs, marketing, e-commerce.
- **Framework-agnostic** — You can use React, Vue, Svelte, Solid, Preact, or plain HTML within one project.
- **Batteries included** — Built-in routing, image optimization, Markdown/MDX, i18n, middleware, and more.

---

## 📁 Project Structure

```
my-astro-project/
├── astro.config.mjs       # Main Astro config
├── tsconfig.json
├── package.json
└── src/
    ├── pages/             # File-based routing (REQUIRED)
    ├── components/        # Reusable UI components (convention)
    ├── layouts/           # Shared page structures (convention)
    ├── content/           # Content Collections (type-safe Markdown/MDX/data)
    ├── styles/            # CSS / Sass files (convention)
    ├── utils/             # Helper functions (convention)
    └── middleware.ts      # Server-side middleware
```

> Only `src/pages/` is required. All other directories are conventions.

---

## 🔑 Core Concepts

### 1. Astro Components (`.astro`)

The fundamental unit. Two sections separated by `---` (code fence):

```astro
---
// Component Script — runs server-side only (TypeScript supported)
const greeting = "Hello, World!";
interface Props {
  title: string;
  author?: string;
}
const { title, author = "Anonymous" } = Astro.props;
---

<!-- Component Template — HTML with JSX-like expressions -->
<h1>{greeting}</h1>
<article>
  <h2>{title}</h2>
  {author && <p>By {author}</p>}
</article>

<style>
  /* Scoped by default — no class collisions */
  h1 { color: purple; }
</style>
```

**Key rules:**

- Code fence runs at build time / server time — never in the browser.
- Styles are **scoped** automatically unless you use `<style is:global>`.
- Props are typed via `interface Props` and destructured from `Astro.props`.
- Use `<slot />` to accept child content (like React `children`).
- Named slots: `<slot name="header" />` and `<Fragment slot="header">...</Fragment>`.

---

### 2. File-Based Routing

Every file in `src/pages/` maps to a URL route:

| File                             | URL                        |
| -------------------------------- | -------------------------- |
| `src/pages/index.astro`          | `/`                        |
| `src/pages/about.astro`          | `/about`                   |
| `src/pages/blog/index.astro`     | `/blog`                    |
| `src/pages/blog/[slug].astro`    | `/blog/:slug` (dynamic)    |
| `src/pages/blog/[...slug].astro` | `/blog/*` (catch-all)      |
| `src/pages/api/data.ts`          | `/api/data` (API endpoint) |

**Dynamic routes** must export `getStaticPaths()` in SSG mode:

```astro
---
export async function getStaticPaths() {
  const posts = await fetch('/api/posts').then(r => r.json());
  return posts.map(post => ({
    params: { slug: post.slug },
    props: { post },
  }));
}
const { post } = Astro.props;
---
<h1>{post.title}</h1>
```

**Supported page file types:** `.astro`, `.md`, `.mdx`, `.html`, `.js`, `.ts`

---

### 3. Layouts

Layouts wrap pages with shared structure (nav, footer, `<head>`, etc.):

```astro
---
// src/layouts/BaseLayout.astro
interface Props {
  title: string;
  description?: string;
}
const { title, description = "My Astro Site" } = Astro.props;
---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta name="description" content={description} />
    <title>{title}</title>
  </head>
  <body>
    <header>...</header>
    <main>
      <slot /> <!-- Page content goes here -->
    </main>
    <footer>...</footer>
  </body>
</html>
```

Use in a page:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout title="About Us">
  <p>This is my content.</p>
</BaseLayout>
```

For Markdown files inside `src/pages/`, use the `layout` frontmatter key:

```markdown
---
layout: ../layouts/BlogPost.astro
title: "My Post"
date: 2025-06-01
---

Content here...
```

---

### 4. Islands Architecture & Client Directives

By default, framework components (React, Vue, Svelte, etc.) render to **static HTML only** — no JS shipped. To hydrate them on the client, add a `client:*` directive:

| Directive                           | When it hydrates                                       |
| ----------------------------------- | ------------------------------------------------------ |
| `client:load`                       | Immediately on page load (above-the-fold, critical UI) |
| `client:idle`                       | When the browser is idle (non-critical UI)             |
| `client:visible`                    | When the component enters the viewport (lazy)          |
| `client:media="(max-width: 768px)"` | When a CSS media query matches                         |
| `client:only="react"`               | Skip SSR entirely; client-side only                    |

```astro
---
import HeroCarousel from '../components/HeroCarousel.jsx';
import NewsletterForm from '../components/NewsletterForm.svelte';
import StatsChart from '../components/StatsChart.vue';
---

<HeroCarousel client:load />        <!-- Critical, above fold -->
<NewsletterForm client:idle />      <!-- Non-critical -->
<StatsChart client:visible />       <!-- Loads when scrolled to -->
```

> Components without a `client:*` directive add **zero bytes of JavaScript** to the page.

---

### 5. Server Islands

Introduced in **Astro 5.0**. Allows server-rendered dynamic content embedded in otherwise static pages. Use `server:defer` on any Astro component:

```astro
---
import UserAvatar from '../components/UserAvatar.astro';
import StaticHeader from '../components/StaticHeader.astro';
---

<StaticHeader />   <!-- Cached by CDN -->
<UserAvatar server:defer /> <!-- Fetched from server after initial load -->
```

The static shell loads instantly from a CDN; the deferred server component streams in afterward. This is ideal for personalized content on otherwise cacheable pages.

---

### 6. Rendering Modes

Configure in `astro.config.mjs`:

```js
// astro.config.mjs
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static", // Default — fully static site (SSG)
  // output: 'server', // Fully server-rendered (SSR)
  // output: 'hybrid', // Static by default, opt pages into SSR
});
```

**Hybrid mode** — per-page control:

```astro
---
// Force this page to SSR (hybrid mode)
export const prerender = false;
---
```

```astro
---
// Force this page to static (server output mode)
export const prerender = true;
---
```

**SSR requires an adapter.** Install one:

```bash
npx astro add netlify    # Netlify
npx astro add vercel     # Vercel
npx astro add cloudflare # Cloudflare
npx astro add node       # Node.js self-hosted
```

---

### 7. Content Collections (v5 — Content Layer API)

Type-safe content management for Markdown, MDX, JSON, YAML, or any external source.

**Define a collection** in `src/content/config.ts`:

```ts
import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content", // 'content' for MD/MDX, 'data' for JSON/YAML
  schema: z.object({
    title: z.string(),
    date: z.date(),
    author: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
```

**Query a collection:**

```astro
---
import { getCollection, getEntry, render } from 'astro:content';

// Get all non-draft posts, sorted by date
const posts = (await getCollection('blog', ({ data }) => !data.draft))
  .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

// Get a single entry
const post = await getEntry('blog', 'my-first-post');
const { Content } = await render(post);
---

{posts.map(post => (
  <article>
    <h2>{post.data.title}</h2>
    <time>{post.data.date.toLocaleDateString()}</time>
  </article>
))}
```

**Live Content Collections (v5.10+):** Fetch content at runtime instead of build time using content loaders. Ideal for personalized or highly dynamic content.

---

### 8. API Endpoints

Create `.ts` / `.js` files in `src/pages/api/` to build server endpoints:

```ts
// src/pages/api/posts.ts
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request, url }) => {
  const tag = url.searchParams.get("tag");
  const data = { posts: [], tag };

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  // handle body...
  return new Response("Created", { status: 201 });
};
```

Supported methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `ALL`

---

### 9. Middleware

`src/middleware.ts` — intercepts every request:

```ts
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const { request, cookies, redirect, locals } = context;

  // Authentication guard
  const token = cookies.get("session")?.value;
  if (!token && request.url.includes("/dashboard")) {
    return redirect("/login");
  }

  // Attach data to locals (available in pages & endpoints)
  locals.user = token ? await getUserFromToken(token) : null;

  // Call the next handler
  return next();
});
```

Access `locals` in pages:

```astro
---
const { user } = Astro.locals;
---
<p>Welcome, {user?.name}</p>
```

---

### 10. Astro Actions (v5)

Type-safe, form-friendly server functions callable directly from client components.

```ts
// src/actions/index.ts
import { defineAction } from "astro:actions";
import { z } from "astro:schema";

export const server = {
  newsletter: defineAction({
    input: z.object({ email: z.string().email() }),
    handler: async ({ email }) => {
      await addToMailingList(email);
      return { success: true };
    },
  }),
};
```

Call from a client component:

```ts
import { actions } from "astro:actions";

const result = await actions.newsletter({ email: "user@example.com" });
if (!result.error) console.log("Subscribed!");
```

---

### 11. Image Optimization

Use the built-in `<Image />` and `<Picture />` components:

```astro
---
import { Image, Picture } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---

<!-- Automatic optimization, correct sizing, lazy load -->
<Image src={heroImage} alt="Hero" width={800} height={400} />

<!-- Responsive with multiple formats -->
<Picture
  src={heroImage}
  formats={['avif', 'webp']}
  alt="Hero"
  widths={[400, 800, 1200]}
/>
```

> Remote images require `image.domains` or `image.remotePatterns` in config.

---

### 12. Styles & CSS

**Scoped styles** (default):

```astro
<style>
  h1 { color: red; } /* Only applies to this component */
</style>
```

**Global styles:**

```astro
<style is:global>
  body { margin: 0; }
</style>
```

**Import CSS globally** in your layout:

```astro
---
import '../styles/global.css';
---
```

**Tailwind CSS:**

```bash
npx astro add tailwind
```

**CSS Modules:** Use `.module.css` files and import as objects.

**Sass/SCSS:** Install `sass` package — Astro handles it automatically.

---

### 13. Integrations

Install via `npx astro add <integration>`:

```bash
npx astro add react        # React support
npx astro add vue          # Vue support
npx astro add svelte       # Svelte support
npx astro add solid        # Solid.js support
npx astro add tailwind     # Tailwind CSS
npx astro add mdx          # MDX support
npx astro add sitemap      # Auto sitemap
npx astro add partytown    # Third-party scripts (web worker)
npx astro add db           # Astro DB (Turso/LibSQL)
```

Manual registration in config:

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [react(), tailwind()],
});
```

---

### 14. i18n (Internationalization)

Built-in i18n routing since Astro 3.5:

```js
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es", "pt-br"],
    routing: {
      prefixDefaultLocale: false, // /about vs /en/about
    },
    fallback: {
      "pt-br": "es", // Fallback pt-br → es → 404
    },
  },
});
```

Use i18n helpers in pages:

```astro
---
import { getRelativeLocaleUrl } from 'astro:i18n';
const esAboutUrl = getRelativeLocaleUrl('es', 'about');
---
```

---

### 15. Environment Variables

```js
// astro.config.mjs
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  env: {
    schema: {
      API_KEY: envField.string({ context: "server", access: "secret" }),
      PUBLIC_API_URL: envField.string({ context: "client", access: "public" }),
      PORT: envField.number({
        context: "server",
        access: "public",
        default: 3000,
      }),
    },
  },
});
```

- Variables prefixed `PUBLIC_` are exposed to the client.
- Non-`PUBLIC_` variables are server-only.
- Import: `import { API_KEY, PUBLIC_API_URL } from 'astro:env/server'`

---

### 16. View Transitions

Enable smooth page transitions without a full reload:

```astro
---
import { ViewTransitions } from 'astro:transitions';
---
<head>
  <ViewTransitions />
</head>
```

Annotate elements for custom transitions:

```astro
<h1 transition:name="hero-title">My Blog</h1>
<img transition:name="hero-image" src={post.image} />
```

Control animation:

```astro
<div transition:animate="slide">...</div>    <!-- Built-in -->
<div transition:animate={myCustomAnim}>...</div>
```

---

### 17. Prefetching

Enabled automatically with `<ViewTransitions />`. For static sites:

```js
// astro.config.mjs
export default defineConfig({
  prefetch: {
    prefetchAll: true, // Prefetch all links
    defaultStrategy: "hover", // 'hover' | 'tap' | 'viewport' | 'load'
  },
});
```

Per-link control:

```html
<a href="/about" data-astro-prefetch>About</a>
<a href="/heavy" data-astro-prefetch="false">No prefetch</a>
```

---

### 18. Astro DB

Built-in LibSQL/Turso-based database for server-rendered Astro apps:

```ts
// db/config.ts
import { defineDb, defineTable, column } from "astro:db";

const Comment = defineTable({
  columns: {
    id: column.number({ primaryKey: true }),
    author: column.text(),
    body: column.text(),
    postSlug: column.text(),
  },
});

export default defineDb({ tables: { Comment } });
```

Query in a page or endpoint:

```ts
import { db, Comment, eq } from "astro:db";

const comments = await db
  .select()
  .from(Comment)
  .where(eq(Comment.postSlug, slug));
```

---

## ⚡ CLI Commands

```bash
# Create a new project
npm create astro@latest

# Start dev server
npm run dev          # or: astro dev

# Build for production
npm run build        # or: astro build

# Preview production build
npm run preview      # or: astro preview

# Add integrations
npx astro add <integration>

# Check project for errors
npx astro check

# Run Astro info (debug)
npx astro info
```

---

## 🧩 Astro Config Reference (`astro.config.mjs`)

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://example.com',       // Required for sitemap, canonical URLs
  base: '/my-repo',                  // Base path for GitHub Pages, etc.
  output: 'static',                  // 'static' | 'server' | 'hybrid'
  adapter: ...,                      // SSR adapter

  integrations: [],                  // Framework & plugin integrations

  build: {
    format: 'directory',             // URL format: 'file' | 'directory' | 'preserve'
    inlineStylesheets: 'auto',       // 'always' | 'never' | 'auto'
  },

  server: {
    port: 4321,
    host: false,
  },

  vite: {},                          // Pass-through Vite config

  image: {
    service: ...,                    // Image optimization service
    remotePatterns: [],              // Allowlist for remote images
  },

  markdown: {
    shikiConfig: { theme: 'dracula' },   // Syntax highlighting
    remarkPlugins: [],
    rehypePlugins: [],
  },

  trailingSlash: 'ignore',           // 'always' | 'never' | 'ignore'

  redirects: {
    '/old-page': '/new-page',
  },

  prefetch: true,

  i18n: { ... },

  experimental: {
    liveContentCollections: true,    // v5.10+ runtime content fetching
    routeCache: true,                // Declarative cache control (v6+)
  },
});
```

---

## 🎯 Best Practices & Patterns

### Rendering strategy decision tree

```
Does your page content change per request?
  └─ No → SSG (static) — fastest, CDN-cacheable
  └─ Yes → Does it change per USER?
         └─ No  → ISR / revalidation / server cache
         └─ Yes → SSR page (server output) or Server Islands
```

### Component organization

- Put page-specific components next to the page or in `src/components/`
- Prefix layout components: `BaseLayout.astro`, `BlogLayout.astro`
- Use TypeScript `interface Props` in every component
- Keep the component script small — extract logic to `src/utils/`

### When to use `client:*`

- Only add a directive when the component **needs** browser APIs or user interaction
- Prefer `client:visible` for below-the-fold components
- Prefer `client:idle` for non-critical interactive widgets
- Use `client:only` only when SSR breaks the component (e.g., map libraries)

### Content Collections tips

- Always define a Zod schema — it catches frontmatter bugs at build time
- Use `type: 'data'` for JSON/YAML config, `type: 'content'` for Markdown
- Filter drafts server-side: `getCollection('blog', ({ data }) => !data.draft)`

### Performance

- Avoid unnecessary `client:*` directives
- Use `<Image />` instead of raw `<img>` for automatic optimization
- Enable `prefetch` for faster perceived navigation
- Use Server Islands for personalized sections on otherwise static pages

---

## 🔗 Official Resources

| Resource               | URL                                          |
| ---------------------- | -------------------------------------------- |
| Official Docs          | https://docs.astro.build                     |
| Astro Blog             | https://astro.build/blog                     |
| Integrations Library   | https://astro.build/integrations             |
| Themes Gallery         | https://astro.build/themes                   |
| Starlight (docs theme) | https://starlight.astro.build                |
| GitHub                 | https://github.com/withastro/astro           |
| Discord                | https://astro.build/chat                     |
| MCP Server             | `@astrojs/mcp` — AI tool context integration |

---

## 🚨 Common Errors & Fixes

| Error                                       | Cause                                        | Fix                                                      |
| ------------------------------------------- | -------------------------------------------- | -------------------------------------------------------- |
| "getStaticPaths() required"                 | Dynamic route in SSG mode                    | Export `getStaticPaths()` or set `output: 'server'`      |
| Hydration mismatch                          | Client renders different HTML than server    | Ensure component renders same output on server/client    |
| "Cannot use `client:*` on Astro components" | Directives only work on framework components | Use framework (React, Vue, etc.) for interactive islands |
| Remote image not optimized                  | Domain not in allowlist                      | Add to `image.remotePatterns` in config                  |
| Content collection not found                | Missing `src/content/config.ts`              | Create and export `collections` from config file         |
| Env variable undefined on client            | Not prefixed with `PUBLIC_`                  | Prefix client-accessible vars with `PUBLIC_`             |
| Styles leaking between components           | Used `is:global` unintentionally             | Remove `is:global` for scoped styles                     |

---

_Astro version referenced: v5.x (stable) / v6 alpha. Always verify against [docs.astro.build](https://docs.astro.build) for the latest._
