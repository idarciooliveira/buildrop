# AGENTS.md

This file contains repository-specific instructions for coding agents and
contributors.

## Project Summary

Buildrop is a TanStack Start application for authenticated IPA/APK uploads and
public build distribution. It uses Clerk, PostgreSQL/Drizzle, and Cloudflare R2.

Read these files before making architectural changes:

- `README.md`
- `docs/ARCHITECTURE.md`
- `src/lib/apps.ts`
- `src/lib/r2.ts`
- `src/lib/upload-file.ts`
- `src/routes/api.upload.ts`
- `src/routes/dashboard.tsx`

## Package And Runtime Conventions

- Use Node.js 22.
- Use npm because the repository has `package-lock.json`.
- Keep the existing ESM and strict TypeScript setup.
- Use the existing TanStack Start, Router, server-function, and route patterns.
- Use tabs and double quotes in TypeScript/TSX, matching Biome configuration.
- Do not add dependencies unless the change requires them.

## Before Editing

1. Run `git status --short`.
2. Treat existing uncommitted changes as user work.
3. Do not revert, replace, or reformat unrelated changes.
4. Read the surrounding implementation and tests before choosing an approach.

## Generated And Sensitive Files

- Never manually edit `src/routeTree.gen.ts`; TanStack Router generates it.
- Never commit `.env.local`, secrets, credentials, signed URLs, or real uploaded
  packages.
- Do not expose R2 or Clerk secret credentials to browser code.
- Migration files under `drizzle/` should be generated from
  `src/db/schema.ts`, not handwritten unless there is a clear migration reason.

## Upload Invariants

The upload path has security and progress-reporting invariants that must be
preserved:

1. Progress percentages must come from actual XHR byte events. Do not invent,
   time-smooth, or randomly advance progress.
2. Reaching 100% bytes sent does not mean storage confirmed the object. Wait for
   the successful XHR response before entering `processing`.
3. `processing` is indeterminate because metadata extraction has no measurable
   progress.
4. Direct browser-to-R2 upload is preferred when CORS allows it.
5. A failed direct network request retries once through the authenticated
   same-origin fallback.
6. The fallback must stream the request body to R2. Do not reintroduce
   `request.arrayBuffer()` or full incoming-upload buffering.
7. Keep `requestChecksumCalculation: "WHEN_REQUIRED"` on the streaming R2
   client path unless the replacement is proven to support flowing streams.
8. Cancellation must abort whichever XHR transport is currently active.
9. The server must validate user ownership, extension/platform, file size,
   content type, and stored-object metadata before database insertion.

Review `docs/ARCHITECTURE.md` before changing upload behavior.

## Authentication And Public Access

- Dashboard CRUD and upload operations require Clerk authentication.
- `/d/$fileId`, download URL generation, and iOS manifests are intentionally
  public by build ID.
- Do not silently make public routes private or authenticated routes public.
- Treat the build ID as a share credential in security discussions.

## Database Changes

When changing `src/db/schema.ts`:

1. Generate a migration with `npm run db:generate`.
2. Inspect the generated SQL.
3. Apply it to a development database with `npx drizzle-kit migrate`.
4. Verify existing build reads and writes still work.

Avoid `db:push` for production migration workflows.

## Required Verification

For ordinary application changes, run:

```bash
npm test
npm run build
npm run check
```

For upload/storage changes, also verify:

- Direct-upload behavior when R2 CORS permits the origin.
- Streaming fallback behavior when direct upload is blocked.
- The temporary verification object is deleted after any live R2 smoke test.
- 100% progress waits for a successful storage response.

Current baseline notes:

- `npm test` passes.
- `npm run build` passes.
- `npm run check` has an existing unused `Navigate` import warning in
  `src/routes/sign-in/sso-callback.tsx` and a Biome schema-version notice.
- `npx tsc --noEmit` currently reports pre-existing project-wide issues and is
  not a clean baseline. Still inspect it for new errors in files you changed.

## Testing Expectations

- Add focused tests when changing shared upload logic or progress UI.
- Prefer behavior assertions over implementation details.
- Include regression tests for discovered bugs.
- Keep live service tests out of the regular Vitest suite unless they are
  explicitly isolated and credential-safe.

## Scope And Quality

- Keep edits close to the requested behavior.
- Preserve the existing architecture unless a change clearly justifies a new
  abstraction.
- Do not claim metadata-processing progress is measurable.
- Document new environment variables, routes, service requirements, and
  operational constraints in `README.md` and `docs/ARCHITECTURE.md`.
- If a change introduces a new known limitation, state it explicitly.
