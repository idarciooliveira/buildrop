# Buildrop

Buildrop is a self-hosted build distribution app for iOS and Android testers.
Authenticated users upload `.ipa` and `.apk` files, Buildrop extracts their app
metadata, stores the binaries in Cloudflare R2, and creates short public
download pages.

## Features

- Clerk-authenticated upload dashboard
- IPA and APK metadata extraction, including icons and version details
- Real byte-based upload progress with cancellation
- Direct browser-to-R2 uploads with an automatic streaming server fallback
- Public download pages and expiring R2 download URLs
- iOS over-the-air installation manifests
- Per-user build listing and deletion
- Per-user storage quotas with a default 1 GiB limit

## Stack

| Area | Technology |
| --- | --- |
| Application | React 19, TanStack Start, TanStack Router |
| Styling | Tailwind CSS 4 |
| Authentication | Clerk |
| Database | PostgreSQL, Drizzle ORM, Drizzle Kit |
| Object storage | Cloudflare R2 through its S3-compatible API |
| Metadata extraction | `app-info-parser` |
| Build/runtime | Vite, Nitro, Node.js 22 |
| Tests and linting | Vitest, Testing Library, Biome |

For the system design and request flows, see
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Prerequisites

- Node.js 22
- npm
- PostgreSQL
- A Clerk application
- A Cloudflare R2 bucket and API token with object read/write/delete access

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create the local environment file:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in every value in `.env.local`.

4. Create the database if needed and apply migrations:

   ```bash
   npm run db:ensure
   npx drizzle-kit migrate
   ```

5. Start the development server:

   ```bash
   npm run dev
   ```

The app normally starts at `http://localhost:3000`. Vite selects another port
when port 3000 is already occupied.

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk key exposed to the browser and reused by server authentication |
| `CLERK_SECRET_KEY` | Yes | Authenticates server-side Clerk requests |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account containing the R2 bucket |
| `R2_ACCESS_KEY_ID` | Yes | R2 S3 API token access key |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 S3 API token secret |
| `R2_BUCKET_NAME` | Yes | Private bucket used for build binaries |

Never commit `.env.local` or expose Clerk secret keys, database credentials, or
R2 credentials to client code.

## Service Configuration

### Clerk

Create a Clerk application and configure:

- `VITE_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- The production domain and allowed redirect URLs
- Any required social sign-in providers

The sign-in route is `/sign-in`, and successful sign-in redirects to
`/dashboard`.

### PostgreSQL

The current schema contains one `apps` table. Migration files live in
`drizzle/`.

Use:

```bash
npm run db:generate  # Generate a migration after changing src/db/schema.ts
npx drizzle-kit migrate
npm run db:studio
```

After applying the storage quota migration to a database containing existing
builds, backfill their exact R2 object sizes:

```bash
npm run db:backfill-storage
```

Uploads remain disabled for a user while any of their existing build sizes are
unresolved.

`npm run db:ensure` creates the target database when the configured PostgreSQL
user has permission to do so.

### Cloudflare R2

Buildrop works without bucket CORS by automatically retrying failed direct
uploads through the authenticated streaming endpoint at `/api/upload`.

For the fastest upload path, configure R2 CORS so browsers can upload directly:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-production-domain.example"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

Add every local or production origin that should use direct uploads. When CORS
is missing or rejects the origin, the UI displays
`Uploading through secure server...` while using the fallback.

## Upload Lifecycle

1. The dashboard requests an authenticated upload reservation.
2. The server validates the file name and size, creates the user-scoped R2 key,
   and returns a one-hour presigned `PUT` URL.
3. The browser attempts to upload directly to R2.
4. If the direct request is blocked, the browser retries through `/api/upload`,
   which streams the request body to R2 without buffering the entire upload.
5. Upload progress is calculated from browser `XMLHttpRequest` byte events.
6. After R2 confirms storage, the server validates object size and content type.
7. Buildrop downloads the object, extracts metadata, and inserts the database
   record.

The processing phase is intentionally indeterminate. The progress percentage
only represents file transfer and never guesses metadata-processing progress.

## Routes

| Route | Access | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing page |
| `/sign-in` | Public | Clerk sign-in flow |
| `/sign-in/sso-callback` | Public | Clerk SSO callback |
| `/dashboard` | Authenticated | Upload, list, share, and delete builds |
| `/d/$fileId` | Public | Build download/install page |
| `/api/upload` | Authenticated | Streaming fallback upload endpoint |
| `/api/manifest/$fileId` | Public | iOS OTA installation manifest |

Public build IDs act as share links. Anyone with `/d/$fileId` can request a
temporary download URL.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite development server on port 3000 |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run the Vitest suite once |
| `npm run build` | Build client, SSR, and Nitro server output |
| `npm run start` | Start the built Nitro server |
| `npm run check` | Run Biome checks |
| `npm run lint` | Run Biome linting |
| `npm run format` | Run Biome formatting |
| `npm run db:ensure` | Create the configured database if missing |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Ensure the database and apply migrations; currently requires `pnpm` because the script invokes it internally |
| `npm run db:push` | Push schema changes directly |
| `npm run db:pull` | Pull an existing database schema |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:backfill-storage` | Backfill existing build sizes from R2 |

## Verification

Before merging application changes, run:

```bash
npm test
npm run build
npm run check
```

At the time this documentation was written:

- Tests pass.
- Production build passes.
- `npm run check` completes with an existing unused `Navigate` import warning
  in `src/routes/sign-in/sso-callback.tsx` and a Biome schema-version notice.
- A standalone `npx tsc --noEmit` reports existing project-wide type issues;
  it is not currently a clean required check.

## Deployment

The repository includes `nixpacks.toml` for Node.js 22 deployments such as
Railway:

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Set every variable from `.env.example`.
3. Apply database migrations before serving production traffic.
4. Build with `npm run build`.
5. Start with `npm run start`.
6. Configure Clerk production domains and redirect URLs.
7. Optionally configure R2 CORS for direct uploads from the production origin.

Nitro writes the deployable application to `.output/`.

## Limits And Security Notes

- Only `.ipa` and `.apk` file names are accepted.
- The single-upload limit is currently 5 GiB.
- Each user has a default total storage limit of 1 GiB.
- Per-user limits can be changed in PostgreSQL:

  ```sql
  INSERT INTO user_storage_limits (user_id, limit_bytes)
  VALUES ('clerk-user-id', 2147483648)
  ON CONFLICT (user_id)
  DO UPDATE SET limit_bytes = EXCLUDED.limit_bytes, updated_at = now();
  ```

  Delete the override row to restore the default 1 GiB limit.
- R2 object keys are scoped under `<clerk-user-id>/<build-id>/`.
- Upload completion validates the stored object size and content type.
- The fallback upload endpoint requires Clerk authentication and validates key
  ownership.
- Build download pages are intentionally public.
- Metadata extraction currently downloads the full stored object into server
  memory and writes it to a temporary directory. Practical upload size is
  therefore constrained by the server's memory and disk, even though the
  transfer limit is 5 GiB.
- There is no background job queue. Metadata extraction happens synchronously
  after upload.

## Troubleshooting

### Upload switches to the secure server

R2 rejected or could not receive the browser's direct request, commonly because
bucket CORS does not include the current origin. The upload should continue
through the streaming fallback.

### Upload fails after reaching 100%

The browser finished sending bytes, but storage confirmation or metadata
processing failed. Check server logs, R2 credentials, server memory/disk, and
the uploaded package validity.

### Unauthorized upload fallback

Confirm the browser has an active Clerk session and that
`VITE_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` belong to the same Clerk
application.

### Database connection or migration failure

Verify `DATABASE_URL`, confirm the database exists, and ensure the configured
user can connect and run migrations.

## Repository Guidance

Coding-agent and contributor-specific instructions live in
[AGENTS.md](AGENTS.md).
