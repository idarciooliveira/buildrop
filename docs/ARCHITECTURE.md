# Buildrop Architecture

This document describes Buildrop's current runtime architecture, data flow, and
important design constraints.

## System Overview

Buildrop is a TanStack Start application deployed as a Node.js server. It uses:

- Clerk for browser and server authentication
- PostgreSQL for build records and extracted metadata
- Cloudflare R2 for private binary storage
- TanStack server functions for most application operations
- File-based TanStack Router routes for pages and HTTP endpoints

The application has no separate worker service or background queue. Upload
finalization and metadata extraction happen synchronously in the request flow.

## Code Map

| Path | Responsibility |
| --- | --- |
| `src/routes/dashboard.tsx` | Authenticated dashboard and upload orchestration |
| `src/lib/upload-file.ts` | Browser XHR upload, progress events, cancellation, fallback |
| `src/components/upload-progress-panel.tsx` | Upload state and progress presentation |
| `src/lib/apps.ts` | Server functions for upload reservation/completion and build CRUD |
| `src/lib/shares.ts` | Server functions for public release-page CRUD and lookup |
| `src/routes/api.upload.ts` | Authenticated same-origin streaming fallback |
| `src/lib/r2.ts` | R2 client, signed URLs, streaming upload, object reads/deletes |
| `src/lib/metadata.ts` | IPA/APK metadata extraction and normalization |
| `src/lib/auth.ts` | Clerk server-side user authentication |
| `src/db/schema.ts` | PostgreSQL schema and metadata types |
| `src/routes/d.$fileId.tsx` | Public download/install page |
| `src/routes/share.$shareId.tsx` | Public unlisted release page for multiple builds |
| `src/routes/api.manifest.$fileId.ts` | Public iOS OTA manifest |
| `src/routeTree.gen.ts` | Generated TanStack route tree; do not edit manually |

## Data Model

The `apps` table stores:

| Field | Meaning |
| --- | --- |
| `id` | Short public build identifier |
| `userId` | Clerk user that owns the build |
| `platform` | `ios` or `android` |
| `fileName` | Original uploaded file name |
| `r2Key` | Private R2 object key |
| `metadata` | Normalized metadata plus parser raw output |
| `createdAt` | Upload completion time |
| `fileSizeBytes` | Validated R2 object size used for quota accounting |

`user_storage_limits` contains optional per-user byte-limit overrides. Users
without an override receive the application default of 1 GiB.

`upload_reservations` contains one-hour reservations for uploads that have
started but do not yet have an `apps` row. Reservations prevent concurrent
uploads from collectively exceeding the user's quota.

`app_shares` stores the public release-page bundle itself:

| Field | Meaning |
| --- | --- |
| `shareId` | Opaque public credential used in `/share/$shareId` |
| `userId` | Clerk user who owns and curates the bundle |
| `title` | Required release-page title |
| `description` | Optional release-page description |
| `createdAt` | Bundle creation time |
| `updatedAt` | Last bundle edit time |

`app_share_items` stores the ordered membership of each bundle:

| Field | Meaning |
| --- | --- |
| `shareId` | Foreign key to `app_shares.shareId` |
| `appId` | Foreign key to `apps.id` |
| `itemOrder` | Display order in the public page |
| `createdAt` | Time the bundle item row was created |

Deleting an app cascades to `app_share_items`, so deleted builds disappear from
any public release page automatically while the bundle itself remains valid.

The R2 key format is:

```text
<clerk-user-id>/<build-id>/<sanitized-file-name>
```

The database record is inserted only after storage validation and successful
metadata extraction.

## Upload Flow

### State Machine

```text
preparing -> uploading -> processing -> completed
                    \-> failed
preparing/uploading \-> failed
```

- `preparing`: request an upload reservation and signed URL.
- `uploading`: transfer bytes. Progress is determinate and based only on XHR
  byte events.
- `processing`: R2 confirmed the object; storage validation and metadata
  extraction are running. Progress is indeterminate.
- `completed`: the database record exists.
- `failed`: any reservation, transfer, storage, parsing, or database error.

### Direct Transport

```text
Browser -> presigned PUT -> R2
Browser -> completeUpload server function -> server validates and processes
```

`beginUpload` validates the extension and file size, creates a scoped key, and
returns a one-hour presigned R2 URL. Direct upload requires the bucket CORS
policy to allow the browser origin and `PUT` with `Content-Type`.

### Streaming Fallback

```text
Browser -> authenticated PUT /api/upload -> streaming request body -> R2
Browser -> completeUpload server function -> server validates and processes
```

When the direct XHR emits a network error, `upload-file.ts` retries once through
the same-origin fallback. The fallback converts the web request stream to a
Node.js readable stream and passes it to the R2 S3 client.

Important implementation details:

- The fallback does not call `request.arrayBuffer()` and does not buffer the
  whole incoming upload.
- The R2 client uses `requestChecksumCalculation: "WHEN_REQUIRED"` because the
  AWS SDK's optional checksum middleware cannot pre-hash a flowing stream.
- Progress still represents browser bytes sent. At 100%, the UI waits for the
  storage response before entering `processing`.
- Cancellation aborts the currently active direct or fallback XHR.

### Completion And Validation

`completeUpload`:

1. Re-authenticates the user.
2. Confirms the R2 key belongs to that user and build ID.
3. Reads object metadata with `HeadObject`.
4. Verifies content length and platform content type.
5. Downloads the full object.
6. Extracts and normalizes package metadata.
7. Rechecks the user's quota and atomically consumes the upload reservation.
8. Inserts the `apps` database record with the validated object size.

`beginUpload` creates a quota reservation before returning a presigned URL.
The streaming fallback validates that reservation before writing to R2.
Expired reservations are removed opportunistically when the user begins
another upload.

Existing builds created before quota accounting have a nullable size until
`npm run db:backfill-storage` reads their exact sizes from R2. Uploads fail
closed for a user while any of their build sizes remain unresolved.

If completion fails after storage succeeds, the object can remain in R2 without
a database row. There is currently no orphan cleanup job.

## Metadata Processing

`src/lib/metadata.ts` downloads the full object into a `Buffer`, writes it to a
temporary directory, and invokes `app-info-parser`.

Normalized Android fields include app name, package name, version name, version
code, minimum SDK, and icon. Normalized iOS fields include display name, bundle
identifier, short version, build version, and icon.

This design is simple but memory- and disk-intensive. Large files may exceed
the server's practical resources even though transfer validation permits up to
5 GiB.

## Download Flow

Public build records are looked up by short build ID.

```text
Visitor -> /d/$fileId -> public metadata
Visitor -> getDownloadUrl -> 10-minute signed R2 GET URL
```

iOS builds additionally expose:

```text
/api/manifest/$fileId -> XML plist -> signed R2 download URL
```

The build ID is the share credential. There is no per-download authentication
or expiration on the public page itself.

## Release Page Flow

Release pages group multiple existing builds behind one opaque share ID.

```text
Authenticated owner -> /dashboard -> createShare/updateShare
Visitor -> /share/$shareId -> public bundle metadata
Visitor -> getDownloadUrl or /api/manifest/$fileId -> expiring build artifact
```

The dashboard checks ownership before creating or updating a bundle. The public
page loader reads only the bundle and its current items, so it stays unguarded
and does not require Clerk authentication.

The bundle page does not preload signed URLs for every build. Android download
URLs are generated only when the user clicks a download action, and iOS uses
the existing manifest route for install flow.

## Authentication And Trust Boundaries

Authenticated operations:

- Reserve an upload
- Use the fallback upload endpoint
- Complete an upload
- List the current user's builds
- Delete the current user's builds

Public operations:

- Read build metadata by ID
- Request an expiring download URL by ID
- Request an iOS install manifest by ID
- Read public release-page metadata by share ID
- Request release-page build downloads through existing build IDs

Never trust browser-provided `r2Key`, file size, content type, file name, or
build ID without server validation. Existing validation in `apps.ts`,
`shares.ts`, and `api.upload.ts` is part of the security boundary.

## Routing And Generated Code

Routes are defined under `src/routes/`. TanStack Router generates
`src/routeTree.gen.ts` during development/build.

Do not manually edit `src/routeTree.gen.ts`. Add, delete, or rename route files,
then run `npm run build` or the development server so the route tree is
regenerated.

## Testing Strategy

Current focused tests cover:

- XHR byte progress and 100% response semantics
- Direct upload failure and fallback retry
- Failed fallback error reporting
- Cancellation
- Upload progress panel determinate/indeterminate states
- Fallback transport messaging

High-value future tests:

- Authenticated integration tests for `/api/upload`
- `beginUpload` and `completeUpload` validation
- Metadata extraction fixtures for IPA and APK files
- Orphan-object cleanup behavior
- Full browser upload tests against an R2-compatible test service

## Known Constraints

- No multipart/resumable uploads
- No background processing or retries after transfer completion
- No orphan R2 object cleanup
- No malware scanning or package signature verification
- Public links do not expire
- Full-object buffering during metadata extraction
- One upload at a time per dashboard session

Preserve these constraints explicitly when changing behavior; do not accidentally
present them as guarantees the system does not provide.
